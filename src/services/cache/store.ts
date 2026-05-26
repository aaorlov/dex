import { mkdir, unlink } from "node:fs/promises";
import { dirname } from "node:path";
import { cacheDir, cacheFile } from "../../constants/index.ts";

export async function readCacheFile(name: string): Promise<unknown> {
  const file = Bun.file(cacheFile(name));
  if (!(await file.exists())) return null;
  const raw: unknown = await file.json();
  return raw;
}

export async function writeCacheFile(
  name: string,
  contents: unknown,
): Promise<void> {
  const target = cacheFile(name);
  await mkdir(dirname(target), { recursive: true });
  await Bun.write(target, `${JSON.stringify(contents, null, 2)}\n`);
}

export async function deleteCacheFile(name: string): Promise<void> {
  const target = cacheFile(name);
  try {
    await unlink(target);
  } catch (err: unknown) {
    if (err instanceof Error && "code" in err && err.code === "ENOENT") {
      return;
    }
    throw err;
  }
}

export function cacheLocation(name?: string): string {
  return name === undefined ? cacheDir() : cacheFile(name);
}
