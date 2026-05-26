import {
  EXIT,
  OAUTH_HTTP_TIMEOUT_MS,
} from "../../constants/index.ts";
import {
  CognitoConfigSchema,
  type CognitoConfig,
} from "../../schemas/index.ts";
import { CliError, DataError } from "../../utils/index.ts";

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function causeOf(err: unknown): Error | undefined {
  return err instanceof Error ? err : undefined;
}

export async function fetchRemoteConfig(url: string): Promise<CognitoConfig> {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    OAUTH_HTTP_TIMEOUT_MS,
  );

  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (err: unknown) {
    throw new CliError(
      `Failed to fetch config from ${url}: ${describe(err)}`,
      EXIT.ExUnavailable,
      { cause: causeOf(err) },
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new CliError(
      `Failed to fetch config from ${url}: ${response.status} ${response.statusText}`,
      EXIT.ExUnavailable,
    );
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch (err: unknown) {
    throw new DataError(`Config at ${url} is not valid JSON.`, {
      cause: causeOf(err),
    });
  }

  const parsed = CognitoConfigSchema.safeParse(raw);
  if (!parsed.success) {
    throw new DataError(
      `Config at ${url} has unexpected shape: ${parsed.error.issues
        .map((issue) => issue.message)
        .join("; ")}`,
    );
  }
  return parsed.data;
}
