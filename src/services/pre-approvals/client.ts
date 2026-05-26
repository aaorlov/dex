import type { ZodType } from "zod";
import {
  EXIT,
  PREAPPROVALS_HTTP_TIMEOUT_MS,
} from "../../constants/index.ts";
import { CliError, DataError } from "../../utils/index.ts";

export interface PreApprovalsClientConfig {
  readonly apiUrl: string;
  readonly idToken: string;
}

export interface AuthRequestOptions {
  readonly method?: "GET" | "POST";
  readonly path: string;
  readonly query?: Readonly<Record<string, string | number>>;
  readonly body?: unknown;
}

export async function authRequest<T>(
  config: PreApprovalsClientConfig,
  options: AuthRequestOptions,
  schema: ZodType<T>,
): Promise<T> {
  const url = buildUrl(config.apiUrl, options.path, options.query);
  const response = await performRequest(config.idToken, url, options);
  if (!response.ok) throw failedStatus(response, url);
  const raw = await readJson(response, url);
  return parseOrThrow(raw, schema, url);
}

async function performRequest(
  idToken: string,
  url: string,
  options: AuthRequestOptions,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    PREAPPROVALS_HTTP_TIMEOUT_MS,
  );
  try {
    return await fetch(url, {
      method: options.method ?? "GET",
      headers: buildHeaders(idToken, options.body !== undefined),
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
  } catch (err: unknown) {
    throw new CliError(
      `Pre-approvals API request to ${url} failed: ${describe(err)}`,
      EXIT.ExUnavailable,
      { cause: causeOf(err) },
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildHeaders(idToken: string, hasBody: boolean): Headers {
  const headers = new Headers({ Authorization: `Bearer ${idToken}` });
  if (hasBody) headers.set("Content-Type", "application/json");
  return headers;
}

function buildUrl(
  base: string,
  path: string,
  query: Readonly<Record<string, string | number>> | undefined,
): string {
  const url = new URL(`${base}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function readJson(response: Response, url: string): Promise<unknown> {
  try {
    return await response.json();
  } catch (err: unknown) {
    throw new DataError(
      `Pre-approvals API at ${url} returned invalid JSON.`,
      { cause: causeOf(err) },
    );
  }
}

function parseOrThrow<T>(
  raw: unknown,
  schema: ZodType<T>,
  url: string,
): T {
  const result = schema.safeParse(raw);
  if (result.success) return result.data;
  throw new DataError(
    `Pre-approvals API at ${url} returned unexpected payload: ${result.error.issues
      .map((issue) => issue.message)
      .join("; ")}`,
  );
}

function failedStatus(response: Response, url: string): CliError {
  const isUnavailable = response.status >= 500 || response.status === 429;
  const code = isUnavailable ? EXIT.ExUnavailable : EXIT.Failure;
  return new CliError(
    `Pre-approvals API request to ${url} failed: ${response.status} ${response.statusText}`,
    code,
  );
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function causeOf(err: unknown): Error | undefined {
  return err instanceof Error ? err : undefined;
}
