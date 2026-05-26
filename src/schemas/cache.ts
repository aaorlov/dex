import { z, type ZodType } from "zod";

const CACHE_NAME_PATTERN = /^[a-z][a-z0-9-]{0,63}$/;
const CACHE_NAME_HINT =
  "lowercase letters, digits, hyphens; must start with a letter; 1–64 chars";

export const CACHE_VERSION = 1;

export const CacheNameSchema = z
  .string()
  .trim()
  .regex(CACHE_NAME_PATTERN, `Cache name must match ${CACHE_NAME_HINT}.`);

export function cacheEnvelopeSchema<T extends ZodType>(data: T) {
  return z.object({
    version: z.literal(CACHE_VERSION),
    storedAtMs: z.number().int().nonnegative(),
    expiresAtMs: z.number().int().nonnegative(),
    data,
  });
}
