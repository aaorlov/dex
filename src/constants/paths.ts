import { homedir } from "node:os";
import { join } from "node:path";

const APP_DIR_NAME = "dex";
const ACCOUNTS_FILE_NAME = "accounts.json";
const CACHE_DIR_NAME = "cache";
const CACHE_FILE_EXTENSION = ".json";

export function configDir(env: NodeJS.ProcessEnv = process.env): string {
  const xdg = env.XDG_CONFIG_HOME;
  const base = xdg && xdg.length > 0 ? xdg : join(homedir(), ".config");
  return join(base, APP_DIR_NAME);
}

export function accountsFile(env: NodeJS.ProcessEnv = process.env): string {
  return join(configDir(env), ACCOUNTS_FILE_NAME);
}

export function cacheDir(env: NodeJS.ProcessEnv = process.env): string {
  return join(configDir(env), CACHE_DIR_NAME);
}

export function cacheFile(
  name: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  return join(cacheDir(env), `${name}${CACHE_FILE_EXTENSION}`);
}
