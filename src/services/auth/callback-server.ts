import {
  CALLBACK_HOSTNAME,
  CALLBACK_PATH,
  CALLBACK_PORT_MAX,
  CALLBACK_PORT_MIN,
  CALLBACK_TIMEOUT_MS,
  EXIT,
} from "../../constants/index.ts";
import { CliError } from "../../utils/index.ts";

type BunServer = ReturnType<typeof Bun.serve>;

export interface CallbackServer {
  readonly port: number;
  readonly redirectUri: string;
  waitForCode(): Promise<string>;
  close(): Promise<void>;
}

export interface StartCallbackServerOptions {
  readonly state: string;
}

interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (err: unknown) => void;
}

const SUCCESS_HTML = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>dex login</title></head>
<body style="font-family:system-ui,sans-serif;text-align:center;padding:3rem;">
<h1>Sign-in complete</h1>
<p>You can close this tab and return to your terminal.</p>
</body>
</html>
`;

function createDeferred<T>(): Deferred<T> {
  let resolve: ((value: T) => void) | undefined;
  let reject: ((err: unknown) => void) | undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  if (!resolve || !reject) {
    throw new Error("Promise executor did not run synchronously.");
  }
  return { promise, resolve, reject };
}

function isAddressInUse(err: unknown): boolean {
  return (
    err instanceof Error && "code" in err && err.code === "EADDRINUSE"
  );
}

interface BoundServer {
  readonly server: BunServer;
  readonly port: number;
}

function listenInRange(
  handler: (req: Request) => Response | Promise<Response>,
): BoundServer {
  for (let port = CALLBACK_PORT_MIN; port <= CALLBACK_PORT_MAX; port++) {
    try {
      const server = Bun.serve({
        port,
        hostname: CALLBACK_HOSTNAME,
        fetch: handler,
      });
      return { server, port };
    } catch (err: unknown) {
      if (!isAddressInUse(err)) throw err;
    }
  }
  throw new CliError(
    `No available port in range ${CALLBACK_PORT_MIN}..${CALLBACK_PORT_MAX} for OAuth callback.`,
    EXIT.ExUnavailable,
  );
}

function buildHandler(
  state: string,
  deferred: Deferred<string>,
): (req: Request) => Response {
  return (req) => {
    const url = new URL(req.url);
    if (url.pathname !== CALLBACK_PATH) {
      return new Response("Not found", { status: 404 });
    }

    const error = url.searchParams.get("error");
    if (error) {
      const description = url.searchParams.get("error_description") ?? "";
      const suffix = description ? ` — ${description}` : "";
      deferred.reject(new CliError(`OAuth error: ${error}${suffix}`));
      return new Response("Authentication failed.", { status: 400 });
    }

    const code = url.searchParams.get("code");
    const returnedState = url.searchParams.get("state");
    if (!code) {
      deferred.reject(new CliError("OAuth callback missing 'code' parameter."));
      return new Response("Bad request", { status: 400 });
    }
    if (returnedState !== state) {
      deferred.reject(
        new CliError("OAuth state mismatch — possible CSRF; aborted."),
      );
      return new Response("Bad request", { status: 400 });
    }

    deferred.resolve(code);
    return new Response(SUCCESS_HTML, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  };
}

export function startCallbackServer(
  options: StartCallbackServerOptions,
): CallbackServer {
  const deferred = createDeferred<string>();
  const { server, port } = listenInRange(
    buildHandler(options.state, deferred),
  );

  const timeoutId = setTimeout(() => {
    deferred.reject(
      new CliError(
        `OAuth callback not received within ${CALLBACK_TIMEOUT_MS / 1000}s.`,
        EXIT.ExUnavailable,
      ),
    );
  }, CALLBACK_TIMEOUT_MS);

  let stopped = false;
  const close = async (): Promise<void> => {
    if (stopped) return;
    stopped = true;
    clearTimeout(timeoutId);
    await server.stop(true);
  };

  const waitForCode = (): Promise<string> => deferred.promise;

  return {
    port,
    redirectUri: `http://${CALLBACK_HOSTNAME}:${port}${CALLBACK_PATH}`,
    waitForCode,
    close,
  };
}
