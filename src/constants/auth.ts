export const PKCE_VERIFIER_BYTES = 32;
export const OAUTH_STATE_BYTES = 16;

export const CALLBACK_HOSTNAME = "localhost";
export const CALLBACK_PATH = "/callback";
export const CALLBACK_PORT_MIN = 8400;
export const CALLBACK_PORT_MAX = 8411;
export const CALLBACK_TIMEOUT_MS = 5 * 60 * 1000;

export const OAUTH_HTTP_TIMEOUT_MS = 10 * 1000;
export const OAUTH_SCOPES: readonly string[] = ["openid", "profile", "email"];
export const OAUTH_CODE_CHALLENGE_METHOD = "S256";
