import type {
  AccountConfig,
  CognitoConfig,
  Token,
} from "../../schemas/index.ts";
import {
  clearCachedToken,
  getCachedToken,
  setCachedToken,
} from "../cache/index.ts";
import { openInBrowser } from "./browser.ts";
import { startCallbackServer } from "./callback-server.ts";
import { buildAuthorizeUrl, exchangeCode } from "./cognito.ts";
import { createPkceChallenge, generateState } from "./pkce.ts";
import { fetchRemoteConfig } from "./remote-config.ts";

export interface LoginOptions {
  readonly onAuthorizeUrl?: (url: string) => void;
}

export interface LoginResult {
  readonly token: Token;
  readonly fromCache: boolean;
}

export async function login(
  account: AccountConfig,
  force: boolean,
  options?: LoginOptions,
): Promise<LoginResult> {
  if (!force) {
    const cached = await getCachedToken(account.alias);
    if (cached) return { token: cached, fromCache: true };
  }

  const cognito = await fetchRemoteConfig(account.configUrl);
  const token = await runPkceFlow(cognito, options);
  await setCachedToken(account.alias, token);
  return { token, fromCache: false };
}

export async function logout(alias: string): Promise<void> {
  await clearCachedToken(alias);
}

async function runPkceFlow(
  cognito: CognitoConfig,
  options: LoginOptions | undefined,
): Promise<Token> {
  const pkce = createPkceChallenge();
  const state = generateState();
  const callback = startCallbackServer({ state });

  try {
    const authorizeUrl = buildAuthorizeUrl({
      cognito,
      redirectUri: callback.redirectUri,
      codeChallenge: pkce.challenge,
      state,
    });
    options?.onAuthorizeUrl?.(authorizeUrl);
    await openInBrowser(authorizeUrl);
    const code = await callback.waitForCode();
    return await exchangeCode({
      cognito,
      code,
      codeVerifier: pkce.verifier,
      redirectUri: callback.redirectUri,
    });
  } finally {
    await callback.close();
  }
}
