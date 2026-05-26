---
name: cli-design
description: >-
  Design Bun-native CLI applications using commander, @clack/prompts, Bun.$, and
  markdansi. Use when scaffolding a new CLI, choosing CLI dependencies,
  structuring commands/services/UI layers, wiring interactive prompts or LLM
  streaming output, handling exit codes and signals, or compiling Bun CLIs to
  standalone binaries.
---

# CLI Design — Bun-native (2026)

Workspace standard for building command-line tools. Pairs with `coding-best-practices.mdc` and `typescript.mdc` — those rules govern style, types, and module layout; this skill picks the stack and shape.

## When to use

- Scaffolding a new CLI in this workspace.
- Adding commands or interactive flows to an existing Bun CLI.
- Choosing prompt / parser / shell / output libraries.
- Producing a distributable binary.

## Core stack — do not substitute

| Concern | Pick | Why / notes |
| --- | --- | --- |
| Runtime | Native **Bun** | Native TS, fast cold start, built-in test runner, bundler, `$` shell. |
| Argument parsing | **`commander`** | Most-downloaded parser, types bundled (no `@types/commander`). Stick to the latest stable major. |
| Interactive UI | **`@clack/prompts`** | Beautiful defaults, ESM, tiny. Components: `text`, `password`, `confirm`, `select`, `multiselect`, `autocomplete`, `selectKey`, `path`, `spinner`, `group`, `tasks`. |
| Shell execution | **`Bun.$`** (built-in) | Cross-platform, auto-escapes interpolations, replaces `zx` / `execa` / `cross-env` / `rimraf`. |
| Markdown / LLM streaming | **`markdansi`** | `createMarkdownStreamer` — append-only, scrollback-safe; buffers code fences and tables until complete. |

Add only when a concrete need appears:

- `zod` — validate every external boundary (env, files, stdin, HTTP). Already required by `typescript.mdc`.
- `dotenv` — **not needed**, Bun loads `.env*` automatically.
- `chalk` — **not needed**, `@clack/prompts` and `markdansi` cover styling. If you reach for it, you're probably mis-layering the UI.

## Bun built-ins to know

Bun ships batteries that replace common deps. Reach for these before adding a package.

| Need | Use | Notes |
| --- | --- | --- |
| Local persistent state | `bun:sqlite` | Synchronous, zero-dep, faster than `better-sqlite3`. Use for tokens, command history, cached lookups, prefs — over ad-hoc JSON files. |
| Postgres / MySQL / Redis | `Bun.sql` (Bun 1.3+) | Native typed-template client. Do not add `pg`, `mysql2`, or `ioredis`. |
| File I/O | `Bun.file`, `Bun.write` | Lazy reads, streaming writes, hashing, automatic mime detection. |

Pair handle-owning built-ins with the `using` keyword (TS 5.2+) for automatic cleanup — no `try/finally` around `.close()` calls:

```ts
import { Database } from "bun:sqlite";

export function readToken(dbPath: string): string | undefined {
  using db = new Database(dbPath);
  return db
    .query<{ value: string }, [string]>("SELECT value FROM kv WHERE key = ?")
    .get("token")?.value;
}
```

See `src/services/store.ts` in [reference.md](reference.md) for a fleshed-out example.

## Package structure

Keep it flat and predictable. Each folder owns one concern and exposes its public API through `index.ts` (per `typescript.mdc`).

```
client-cli/
├── src/
│   ├── index.ts        # Entry point: parser wiring, signal/error boundary
│   ├── commands/       # Subcommand entry points (chat, login, status)
│   │   └── index.ts    # Barrel: registerCommands(program)
│   ├── services/       # External drivers (AWS, GitHub, Storage, API clients)
│   ├── ui/             # Interactive prompts, spinners, streaming renderers
│   ├── utils/          # Error classes, context helpers, exit-code mapping
│   ├── constants/      # Split by context: exit-codes.ts, env.ts, limits.ts
│   └── schemas/        # Zod schemas for env / config / external IO
├── tests/              # bun:test files mirror src/ tree
├── bunfig.toml
├── tsconfig.json
└── package.json
```

Why the additions to the base layout:

- `constants/` is mandated by `coding-best-practices.mdc` — no magic values in business code, split by context.
- `schemas/` keeps Zod definitions out of business logic; types are derived (`type Env = z.infer<typeof EnvSchema>`).

## Layer responsibilities

| Layer | Allowed to | Must not |
| --- | --- | --- |
| `commands/` | Parse flags, call services, render via `ui/`, return an exit code. | Talk to network/FS directly, hold business logic. |
| `services/` | I/O, network, FS, `Bun.$`, third-party SDKs. Pure async functions or small classes. | Read `process.argv`, print to stdout, prompt the user. |
| `ui/` | Prompts, spinners, streaming renderers, formatted output. | Make decisions, do I/O beyond stdio. |
| `utils/` | Error classes, exit-code mapping, context object, signal handlers. | Depend on `commands/`, `services/`, or `ui/`. |
| `constants/` | Literal values, enums. | Imports beyond stdlib. |
| `schemas/` | Zod schemas + inferred types. | Side effects on import. |

Dependency direction is strict: `commands → services → utils/constants/schemas`. `ui` is a leaf used by `commands` only.

## Entry point pattern

`src/index.ts` is tiny — it wires the parser, installs a global error boundary, and handles signals. Lazy-load command modules inside `.action()` callbacks to keep cold start fast.

```ts
#!/usr/bin/env bun
import { Command } from "commander";
import { registerCommands } from "./commands/index.js";
import { installSignalHandlers } from "./utils/index.js";
import { handleCliError } from "./utils/index.js";

const program = new Command()
  .name("mycli")
  .description("...")
  .version(Bun.env.npm_package_version ?? "0.0.0")
  .showHelpAfterError();

installSignalHandlers();
registerCommands(program);

try {
  await program.parseAsync(Bun.argv);
} catch (err: unknown) {
  process.exit(handleCliError(err));
}
```

See [reference.md](reference.md) for the full templates (signal handler, error class, command, service, UI, package.json, tsconfig).

## Prompts (`@clack/prompts`)

Three non-negotiable rules:

1. **Always check `isCancel()`** after every prompt and exit with code `130` via `cancel(message)` + `process.exit(130)`. Forgetting this is the #1 source of broken CLIs.
2. **Group related prompts with `group({}, { onCancel })`** so Ctrl-C aborts the whole flow once, not per step.
3. **Wrap long-running work in `spinner()`** — start before await, stop with a status message after. Do not log between `s.start()` and `s.stop()`.

```ts
import { intro, group, text, select, confirm, isCancel, cancel, spinner } from "@clack/prompts";
```

Use `note()` for boxed info, `log.info/warn/error` for inline status, `tasks()` for parallel progress.

## Shell with `Bun.$`

```ts
import { $ } from "bun";

const out = await $`git rev-parse --short HEAD`.text();
await $`mkdir -p ${dir}`;          // ${dir} is auto-escaped
const { exitCode } = await $`tsc --noEmit`.nothrow();
```

Rules:

- Prefer `Bun.$` over spawning `sh` or shelling out via `node:child_process`.
- Interpolations are escaped by default — never `${userInput}` into a single string yourself.
- Use `.text()` / `.json()` / `.arrayBuffer()` / `.lines()` for typed output.
- Use `.nothrow()` when you need to inspect non-zero exit codes; otherwise let it throw.
- Set `cwd` / `env` per call: `$`...`.cwd(dir).env({ ...process.env, FOO: "bar" })`.

## Streaming output (`markdansi`)

For LLM responses or any markdown stream, use the hybrid-block streamer — it emits completed paragraphs immediately and buffers code fences / tables until they close.

```ts
import { createMarkdownStreamer, render } from "markdansi";

const streamer = createMarkdownStreamer({
  render: (md) => render(md, { width: process.stdout.columns ?? 80 }),
  spacing: "single",
});

for await (const delta of llmStream) {
  const chunk = streamer.push(delta);
  if (chunk) process.stdout.write(chunk);
}
const tail = streamer.finish();
if (tail) process.stdout.write(tail);
```

Do **not** re-render in place (no `createLiveRenderer`-style overdraw) — append-only keeps scrollback safe and works in piped contexts.

## Errors and exit codes

Use a single `CliError` class and one boundary handler. Map domains to exit codes via a constants file (`constants/exit-codes.ts`) — no inline numbers.

| Code | Meaning |
| --- | --- |
| `0` | Success |
| `1` | Generic failure |
| `2` | Usage error (commander emits this automatically) |
| `64` | `EX_USAGE` — bad invocation by caller |
| `65` | `EX_DATAERR` — invalid input data |
| `69` | `EX_UNAVAILABLE` — service down |
| `130` | User cancelled (SIGINT, Ctrl-C, clack `isCancel`) |
| `143` | SIGTERM |

Boundary rule: catch once at `src/index.ts`. Inside the app, throw typed `CliError`s; do not `process.exit()` from `services/` or `ui/`.

## TTY, color, and machine mode

- Respect `NO_COLOR` (disable) and `FORCE_COLOR` (force) — both are checked by `@clack/prompts` and `markdansi` automatically; honor them in any custom output too.
- Gate prompts on `process.stdout.isTTY`. If not a TTY, fail fast with a usage error instead of hanging on stdin.
- Provide `--json` on every command that prints data. In JSON mode: only structured payloads on **stdout**, all logs/UI on **stderr**, no spinners, no color.

```ts
const isMachine = !process.stdout.isTTY || flags.json;
```

## Logging

- `stdout` = the **answer** the user / script piped you for.
- `stderr` = everything else (progress, warnings, errors, prompts via clack).
- Never `console.log` from a service; return data and let the command print it.
- Never log secrets, tokens, or unredacted user input.

## Testing (`bun:test`)

- Test file lives next to the source or under `tests/` mirroring `src/`. Suffix `.test.ts`.
- Mock external boundaries with `mock.module("./services/github.js", () => ({ ... }))`. Use `--preload` (in `bunfig.toml`) for mocks that must run before any import-time side effect.
- Test commands by invoking `program.parseAsync(["node", "cli", "subcmd", "--flag"])` and asserting on a captured logger / exit code — do not spawn a subprocess for unit tests.
- Smoke-test the compiled binary in CI with a single end-to-end run per platform.

## Distribution

Compile to a single binary. Use bytecode for fast startup and minify for size.

```bash
bun build ./src/index.ts \
  --compile --minify --bytecode \
  --target=bun-darwin-arm64 \
  --outfile dist/mycli
```

Cross-compile targets: `bun-darwin-arm64`, `bun-darwin-x64`, `bun-linux-x64`, `bun-linux-arm64`, `bun-windows-x64`, `bun-windows-arm64`. Generate all in CI; ship via GitHub Releases or a registry.

Per-package `bin` entry in `package.json` lets `bunx mycli` / `bun install -g` work for the source distribution path.

## Anti-patterns

- **Importing every command at the top of `index.ts`.** Slows cold start. Lazy-load inside `.action()` or use commander's `executableFile` for very large CLIs.
- **Prompting from `services/`.** UI belongs in `commands/` + `ui/`. Services take all inputs as arguments.
- **Mixing `stdout` and `stderr`.** Breaks piping. Data → stdout; everything else → stderr.
- **`process.exit()` mid-flow.** Throw a `CliError`; only `src/index.ts` exits.
- **Using `chalk` / `kleur` / `picocolors` alongside clack.** Pick one styling source (clack + markdansi cover it).
- **Reaching for `zx`, `execa`, `cross-env`, `rimraf`, `dotenv`, `pg`, `mysql2`, `better-sqlite3`, `ioredis`.** Bun replaces all of them.
- **Skipping `isCancel()`.** Silent Ctrl-C bugs; users assume the CLI hung.
- **Hand-formatting tables.** Use `markdansi` for markdown tables or a dedicated table renderer.

## Quick checklist for a new CLI

```
- [ ] bun init, pin commander@14, add @clack/prompts and markdansi
- [ ] src/{index.ts, commands/, services/, ui/, utils/, constants/, schemas/}
- [ ] Entry point: parser + signal handlers + error boundary, ~30 lines
- [ ] CliError + exit-code constants + handleCliError boundary
- [ ] Every command: --help, --version (root), --json where it prints data
- [ ] Every prompt followed by isCancel() check
- [ ] All env/config parsed through a Zod schema at startup
- [ ] Smoke test: bun test, then run the compiled binary once
- [ ] Build matrix for all target triples in CI
```

## Reference

Full code templates (entry point, error boundary, command, service, UI, `package.json`, `tsconfig.json`, `bunfig.toml`, build scripts) live in [reference.md](reference.md).
