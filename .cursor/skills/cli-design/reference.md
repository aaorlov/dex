# CLI Design — Reference Templates

Copy-ready snippets for a Bun-native CLI built on `commander`, `@clack/prompts`, `Bun.$`, and `markdansi`. Follow the architecture in `SKILL.md`; this file is the implementation cheat sheet.

## `package.json`

```json
{
  "name": "client-cli",
  "version": "0.0.0",
  "description": "...",
  "type": "module",
  "bin": {
    "mycli": "./src/index.ts"
  },
  "files": ["src", "README.md"],
  "scripts": {
    "dev": "bun run src/index.ts",
    "typecheck": "tsc --noEmit",
    "test": "bun test",
    "build": "bun build ./src/index.ts --compile --minify --bytecode --outfile dist/mycli",
    "build:darwin-arm64": "bun build ./src/index.ts --compile --minify --bytecode --target=bun-darwin-arm64 --outfile dist/mycli-darwin-arm64",
    "build:darwin-x64": "bun build ./src/index.ts --compile --minify --bytecode --target=bun-darwin-x64 --outfile dist/mycli-darwin-x64",
    "build:linux-x64": "bun build ./src/index.ts --compile --minify --bytecode --target=bun-linux-x64 --outfile dist/mycli-linux-x64",
    "build:linux-arm64": "bun build ./src/index.ts --compile --minify --bytecode --target=bun-linux-arm64 --outfile dist/mycli-linux-arm64",
    "build:windows-x64": "bun build ./src/index.ts --compile --minify --bytecode --target=bun-windows-x64 --outfile dist/mycli.exe",
    "build:all": "bun run build:darwin-arm64 && bun run build:darwin-x64 && bun run build:linux-x64 && bun run build:linux-arm64 && bun run build:windows-x64"
  },
  "dependencies": {
    "@clack/prompts": "latest",
    "commander": "latest",
    "markdansi": "latest",
    "zod": "latest"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "latest"
  }
}
```

## `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ESNext"],
    "types": ["bun-types"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true,
    "esModuleInterop": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*.ts", "tests/**/*.ts"]
}
```

## `bunfig.toml`

```toml
[install]
exact = true

[test]
preload = ["./tests/setup.ts"]
coverage = true
coverageReporter = ["text", "lcov"]
coverageSkipTestFiles = true
```

## `src/constants/exit-codes.ts`

```ts
export const EXIT = {
  Success: 0,
  Failure: 1,
  Usage: 2,
  ExUsage: 64,
  ExDataErr: 65,
  ExUnavailable: 69,
  SigInt: 130,
  SigTerm: 143,
} as const;

export type ExitCode = (typeof EXIT)[keyof typeof EXIT];
```

## `src/constants/index.ts`

```ts
export { EXIT, type ExitCode } from "./exit-codes.js";
```

## `src/schemas/env.ts`

```ts
import { z } from "zod";

export const EnvSchema = z.object({
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  NO_COLOR: z.string().optional(),
  FORCE_COLOR: z.string().optional(),
  API_BASE_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return EnvSchema.parse(source);
}
```

## `src/utils/errors.ts`

```ts
import { EXIT, type ExitCode } from "../constants/index.js";

export class CliError extends Error {
  readonly exitCode: ExitCode;

  constructor(message: string, exitCode: ExitCode = EXIT.Failure, options?: ErrorOptions) {
    super(message, options);
    this.name = "CliError";
    this.exitCode = exitCode;
  }
}

export class UsageError extends CliError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, EXIT.ExUsage, options);
    this.name = "UsageError";
  }
}

export class DataError extends CliError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, EXIT.ExDataErr, options);
    this.name = "DataError";
  }
}
```

## `src/utils/error-boundary.ts`

```ts
import { log } from "@clack/prompts";
import { CliError } from "./errors.js";
import { EXIT, type ExitCode } from "../constants/index.js";

export function handleCliError(err: unknown): ExitCode {
  if (err instanceof CliError) {
    log.error(err.message);
    return err.exitCode;
  }
  if (err instanceof Error) {
    log.error(err.message);
    if (process.env.DEBUG) {
      console.error(err.stack);
    }
    return EXIT.Failure;
  }
  log.error(String(err));
  return EXIT.Failure;
}
```

## `src/utils/signals.ts`

```ts
import { cancel } from "@clack/prompts";
import { EXIT } from "../constants/index.js";

type Cleanup = () => void | Promise<void>;

const cleanups = new Set<Cleanup>();

export function onShutdown(fn: Cleanup): () => void {
  cleanups.add(fn);
  return () => cleanups.delete(fn);
}

export function installSignalHandlers(): void {
  const shutdown = async (code: number, message: string) => {
    cancel(message);
    for (const fn of cleanups) {
      try {
        await fn();
      } catch {
        // best-effort cleanup; nothing useful to do here
      }
    }
    process.exit(code);
  };

  process.once("SIGINT", () => void shutdown(EXIT.SigInt, "Interrupted"));
  process.once("SIGTERM", () => void shutdown(EXIT.SigTerm, "Terminated"));
}
```

## `src/utils/context.ts`

```ts
import { loadEnv, type Env } from "../schemas/env.js";

export interface CliContext {
  readonly cwd: string;
  readonly env: Env;
  readonly isTTY: boolean;
  readonly json: boolean;
}

export function createContext(overrides: Partial<CliContext> = {}): CliContext {
  return {
    cwd: process.cwd(),
    env: loadEnv(),
    isTTY: Boolean(process.stdout.isTTY),
    json: false,
    ...overrides,
  };
}
```

## `src/utils/index.ts`

```ts
export { CliError, UsageError, DataError } from "./errors.js";
export { handleCliError } from "./error-boundary.js";
export { installSignalHandlers, onShutdown } from "./signals.js";
export { createContext, type CliContext } from "./context.js";
```

## `src/index.ts`

```ts
#!/usr/bin/env bun
import { Command } from "commander";
import { registerCommands } from "./commands/index.js";
import { handleCliError, installSignalHandlers } from "./utils/index.js";

const program = new Command()
  .name("mycli")
  .description("A Bun-native CLI")
  .version(Bun.env.npm_package_version ?? "0.0.0")
  .showHelpAfterError("(add --help for usage)")
  .configureOutput({
    writeOut: (str) => process.stdout.write(str),
    writeErr: (str) => process.stderr.write(str),
  });

installSignalHandlers();
registerCommands(program);

try {
  await program.parseAsync(Bun.argv);
} catch (err: unknown) {
  process.exit(handleCliError(err));
}
```

## `src/commands/index.ts`

```ts
import type { Command } from "commander";
import { registerChatCommand } from "./chat.js";
import { registerStatusCommand } from "./status.js";

export function registerCommands(program: Command): void {
  registerChatCommand(program);
  registerStatusCommand(program);
}
```

## `src/commands/chat.ts` — interactive flow

```ts
import type { Command } from "commander";
import { group, intro, isCancel, outro, select, text } from "@clack/prompts";
import { EXIT } from "../constants/index.js";
import { createContext, CliError } from "../utils/index.js";
import { streamChatResponse } from "../services/chat.js";
import { renderStream } from "../ui/stream.js";

interface ChatFlags {
  readonly json?: boolean;
  readonly model?: string;
}

export function registerChatCommand(program: Command): void {
  program
    .command("chat")
    .description("Start an interactive chat session")
    .option("--json", "Emit machine-readable JSON to stdout", false)
    .option("--model <name>", "Model identifier")
    .action(async (flags: ChatFlags) => {
      const ctx = createContext({ json: Boolean(flags.json) });
      if (!ctx.isTTY && !ctx.json) {
        throw new CliError("Interactive chat requires a TTY. Use --json for piping.", EXIT.ExUsage);
      }

      intro("mycli chat");

      const answers = await group(
        {
          prompt: () => text({ message: "What would you like to ask?", validate: (v) => (v.length === 0 ? "Required" : undefined) }),
          model: () =>
            select({
              message: "Pick a model",
              initialValue: flags.model ?? "default",
              options: [
                { value: "default", label: "default", hint: "balanced" },
                { value: "fast", label: "fast", hint: "lower latency" },
              ],
            }),
        },
        {
          onCancel: () => process.exit(EXIT.SigInt),
        },
      );

      if (isCancel(answers)) process.exit(EXIT.SigInt);

      const stream = streamChatResponse({ prompt: answers.prompt, model: answers.model });
      await renderStream(stream, { json: ctx.json });

      outro("done");
    });
}
```

## `src/services/chat.ts` — pure async, no UI

```ts
export interface ChatRequest {
  readonly prompt: string;
  readonly model: string;
}

export async function* streamChatResponse(req: ChatRequest): AsyncIterable<string> {
  const res = await fetch("https://api.example.com/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!res.ok || res.body === null) {
    throw new Error(`chat request failed: ${res.status}`);
  }

  const decoder = new TextDecoder();
  const reader = res.body.getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    yield decoder.decode(value, { stream: true });
  }
}
```

## `src/services/git.ts` — `Bun.$` example

```ts
import { $ } from "bun";

export async function currentSha(cwd: string = process.cwd()): Promise<string> {
  const sha = await $`git rev-parse --short HEAD`.cwd(cwd).text();
  return sha.trim();
}

export async function isClean(cwd: string = process.cwd()): Promise<boolean> {
  const { exitCode } = await $`git diff --quiet`.cwd(cwd).nothrow();
  return exitCode === 0;
}
```

## `src/ui/stream.ts` — markdansi streaming

```ts
import { createMarkdownStreamer, render } from "markdansi";

interface RenderOptions {
  readonly json: boolean;
}

export async function renderStream(
  stream: AsyncIterable<string>,
  { json }: RenderOptions,
): Promise<void> {
  if (json) {
    for await (const chunk of stream) {
      process.stdout.write(JSON.stringify({ delta: chunk }) + "\n");
    }
    return;
  }

  const streamer = createMarkdownStreamer({
    render: (md) => render(md, { width: process.stdout.columns ?? 80 }),
    spacing: "single",
  });

  for await (const delta of stream) {
    const flushed = streamer.push(delta);
    if (flushed) process.stdout.write(flushed);
  }
  const tail = streamer.finish();
  if (tail) process.stdout.write(tail);
  process.stdout.write("\n");
}
```

## `src/ui/spinner.ts` — long-running task wrapper

```ts
import { spinner } from "@clack/prompts";

export async function withSpinner<T>(message: string, task: () => Promise<T>): Promise<T> {
  const s = spinner();
  s.start(message);
  try {
    const result = await task();
    s.stop(`${message} ✓`);
    return result;
  } catch (err: unknown) {
    s.stop(`${message} ✗`, 1);
    throw err;
  }
}
```

## `src/commands/status.ts` — non-interactive, scriptable

```ts
import type { Command } from "commander";
import { currentSha, isClean } from "../services/git.js";

interface StatusFlags {
  readonly json?: boolean;
}

export function registerStatusCommand(program: Command): void {
  program
    .command("status")
    .description("Print repository status")
    .option("--json", "Emit JSON", false)
    .action(async (flags: StatusFlags) => {
      const [sha, clean] = await Promise.all([currentSha(), isClean()]);
      if (flags.json) {
        process.stdout.write(JSON.stringify({ sha, clean }) + "\n");
        return;
      }
      process.stdout.write(`commit: ${sha}\nclean:  ${clean}\n`);
    });
}
```

## Tests

### `tests/setup.ts`

```ts
import { afterEach, mock } from "bun:test";

afterEach(() => {
  mock.restore();
});
```

### `tests/commands/status.test.ts`

```ts
import { describe, expect, mock, test } from "bun:test";
import { Command } from "commander";

mock.module("../../src/services/git.js", () => ({
  currentSha: mock(async () => "abc1234"),
  isClean: mock(async () => true),
}));

const { registerStatusCommand } = await import("../../src/commands/status.js");

describe("status", () => {
  test("emits JSON when --json is set", async () => {
    const program = new Command().exitOverride();
    registerStatusCommand(program);

    const chunks: string[] = [];
    const orig = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: string | Uint8Array) => {
      chunks.push(typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk));
      return true;
    }) as typeof process.stdout.write;

    try {
      await program.parseAsync(["node", "cli", "status", "--json"]);
    } finally {
      process.stdout.write = orig;
    }

    expect(JSON.parse(chunks.join(""))).toEqual({ sha: "abc1234", clean: true });
  });
});
```

## CI matrix (GitHub Actions sketch)

```yaml
name: build
on: [push, pull_request]
jobs:
  binaries:
    strategy:
      matrix:
        target:
          - darwin-arm64
          - darwin-x64
          - linux-x64
          - linux-arm64
          - windows-x64
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun test
      - run: bun run build:${{ matrix.target }}
      - uses: actions/upload-artifact@v4
        with:
          name: mycli-${{ matrix.target }}
          path: dist/*
```

## Where to find more

- Bun runtime / `$` / bundler: <https://bun.com/docs>
- commander: <https://github.com/tj/commander.js>
- `@clack/prompts`: <https://github.com/bombshell-dev/clack>
- markdansi: <https://github.com/steipete/Markdansi>
