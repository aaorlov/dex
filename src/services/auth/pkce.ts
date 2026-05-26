import { createHash, randomBytes } from "node:crypto";
import {
  OAUTH_CODE_CHALLENGE_METHOD,
  OAUTH_STATE_BYTES,
  PKCE_VERIFIER_BYTES,
} from "../../constants/index.ts";

export interface PkceChallenge {
  readonly verifier: string;
  readonly challenge: string;
  readonly method: typeof OAUTH_CODE_CHALLENGE_METHOD;
}

export function createPkceChallenge(): PkceChallenge {
  const verifier = randomBytes(PKCE_VERIFIER_BYTES).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge, method: OAUTH_CODE_CHALLENGE_METHOD };
}

export function generateState(): string {
  return randomBytes(OAUTH_STATE_BYTES).toString("base64url");
}
