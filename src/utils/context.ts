import { loadEnv, type Env } from "../schemas/index.ts";

export interface CliContext {
  readonly cwd: string;
  readonly env: Env;
  readonly isTTY: boolean;
  readonly json: boolean;
}

export interface ContextOverrides {
  readonly json?: boolean;
}

export function createContext(overrides: ContextOverrides = {}): CliContext {
  return {
    cwd: process.cwd(),
    env: loadEnv(),
    isTTY: Boolean(process.stdout.isTTY),
    json: overrides.json ?? false,
  };
}
