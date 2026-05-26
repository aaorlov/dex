import {
  EXIT,
  OAUTH_CODE_CHALLENGE_METHOD,
  OAUTH_HTTP_TIMEOUT_MS,
  OAUTH_SCOPES,
} from "../../constants/index.ts";
import {
  TokenSchema,
  type CognitoConfig,
  type Token,
} from "../../schemas/index.ts";
import { CliError, DataError } from "../../utils/index.ts";

export interface AuthorizeUrlOptions {
  readonly cognito: CognitoConfig;
  readonly redirectUri: string;
  readonly codeChallenge: string;
  readonly state: string;
}

export function buildAuthorizeUrl(options: AuthorizeUrlOptions): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: options.cognito.clientId,
    redirect_uri: options.redirectUri,
    scope: OAUTH_SCOPES.join(" "),
    code_challenge_method: OAUTH_CODE_CHALLENGE_METHOD,
    code_challenge: options.codeChallenge,
    state: options.state,
  });
  return `https://${options.cognito.cognitoDomain}/oauth2/authorize?${params.toString()}`;
}

export interface ExchangeCodeOptions {
  readonly cognito: CognitoConfig;
  readonly code: string;
  readonly codeVerifier: string;
  readonly redirectUri: string;
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function causeOf(err: unknown): Error | undefined {
  return err instanceof Error ? err : undefined;
}

export async function exchangeCode(
  options: ExchangeCodeOptions,
): Promise<Token> {
  const tokenUrl = `https://${options.cognito.cognitoDomain}/oauth2/token`;
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: options.cognito.clientId,
    code: options.code,
    redirect_uri: options.redirectUri,
    code_verifier: options.codeVerifier,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    OAUTH_HTTP_TIMEOUT_MS,
  );

  let response: Response;
  try {
    response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: controller.signal,
    });
  } catch (err: unknown) {
    throw new CliError(
      `Token exchange request failed: ${describe(err)}`,
      EXIT.ExUnavailable,
      { cause: causeOf(err) },
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new CliError(
      `Token exchange failed (${response.status} ${response.statusText}): ${text}`,
      EXIT.ExUnavailable,
    );
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch (err: unknown) {
    throw new DataError(
      `Token endpoint returned invalid JSON: ${describe(err)}`,
      { cause: causeOf(err) },
    );
  }

  const parsed = TokenSchema.safeParse(raw);
  if (!parsed.success) {
    throw new DataError(
      `Token endpoint returned unexpected payload: ${parsed.error.issues
        .map((issue) => issue.message)
        .join("; ")}`,
    );
  }
  return parsed.data;
}
