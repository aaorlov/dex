import type { ZodType } from "zod";
import { CACHE_EXPIRATION_BUFFER_SECONDS } from "../../constants/index.ts";
import {
  CACHE_VERSION,
  CacheNameSchema,
  cacheEnvelopeSchema,
} from "../../schemas/index.ts";
import {
  deleteCacheFile,
  readCacheFile,
  writeCacheFile,
} from "./store.ts";

const BUFFER_MS = CACHE_EXPIRATION_BUFFER_SECONDS * 1000;

export interface CacheWriteOptions {
  readonly ttlSeconds: number;
}

export interface CacheStore<T> {
  read(): Promise<T | null>;
  write(data: T, options: CacheWriteOptions): Promise<void>;
  clear(): Promise<void>;
}

export function createCacheStore<T>(
  name: string,
  schema: ZodType<T>,
): CacheStore<T> {
  const cacheName = CacheNameSchema.parse(name);
  const envelopeSchema = cacheEnvelopeSchema(schema);

  async function clear(): Promise<void> {
    await deleteCacheFile(cacheName);
  }

  async function read(): Promise<T | null> {
    let raw: unknown;
    try {
      raw = await readCacheFile(cacheName);
    } catch (err: unknown) {
      if (err instanceof SyntaxError) {
        await clear();
        return null;
      }
      throw err;
    }
    if (raw === null) return null;

    const parsed = envelopeSchema.safeParse(raw);
    if (!parsed.success) {
      await clear();
      return null;
    }

    if (parsed.data.expiresAtMs - Date.now() < BUFFER_MS) {
      await clear();
      return null;
    }
    return parsed.data.data;
  }

  async function write(data: T, options: CacheWriteOptions): Promise<void> {
    if (!Number.isFinite(options.ttlSeconds) || options.ttlSeconds <= 0) {
      throw new RangeError("ttlSeconds must be a positive finite number.");
    }
    const nowMs = Date.now();
    const envelope = envelopeSchema.parse({
      version: CACHE_VERSION,
      storedAtMs: nowMs,
      expiresAtMs: nowMs + options.ttlSeconds * 1000,
      data,
    });
    await writeCacheFile(cacheName, envelope);
  }

  return { read, write, clear };
}
