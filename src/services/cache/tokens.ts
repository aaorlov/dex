import { AliasSchema, TokenSchema, type Token } from "../../schemas/index.ts";
import { createCacheStore, type CacheStore } from "./cache.ts";

const TOKEN_CACHE_PREFIX = "tokens-";

function tokenStore(alias: string): CacheStore<Token> {
  const safeAlias = AliasSchema.parse(alias);
  return createCacheStore(`${TOKEN_CACHE_PREFIX}${safeAlias}`, TokenSchema);
}

export async function getCachedToken(alias: string): Promise<Token | null> {
  return tokenStore(alias).read();
}

export async function setCachedToken(
  alias: string,
  token: Token,
): Promise<void> {
  const validated = TokenSchema.parse(token);
  await tokenStore(alias).write(validated, { ttlSeconds: validated.expires_in });
}

export async function clearCachedToken(alias: string): Promise<void> {
  await tokenStore(alias).clear();
}
