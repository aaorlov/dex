# AGENTS.md

Operational context for AI coding agents working in this repo. Humans should read this too — it doubles as the contributor brief.

> **Status:** scaffolding. Sections marked `TODO` need real content once the project shape is decided.

---

## 1. Project overview

- **Name:** `dex`
- **What it is:** A Bun-native CLI that streamlines day-to-day work with **AWS**, **Kubernetes**, and **GitLab CI/CD** for engineers on this team.
- **Why it exists:** Replace ad-hoc bash, console clicking, and tribal knowledge with a single, opinionated, scriptable tool that wraps the AWS SDK, the Kubernetes API, and the GitLab API behind safe defaults — validation, `--dry-run`, idempotency, structured output, redacted secrets.
- **Primary integrations:** AWS (multi-account, multi-region), Kubernetes (multi-cluster via kubeconfig contexts), GitLab (gitlab.com and self-hosted via API).
- **Out of scope:** TODO — confirm non-goals (e.g. not a Terraform/Pulumi replacement, not a generic infra orchestrator, not a GUI, not a long-running daemon).

---

## 2. Required reading

Before writing or changing any code, an agent must have internalized:

1. `.cursor/rules/coding-best-practices.mdc` — always-applied. Language-agnostic principles: DRY/KISS/YAGNI, naming, function size, constants, error handling, boundary validation, logging, security, file size.
2. `.cursor/rules/typescript.mdc` — auto-applied to `**/*.ts` and `**/*.tsx`. Strict mode, no `any`/`!`/`as`, `interface` over `type`, named exports only, module barrels via `index.ts`, Zod at every boundary.
3. `.cursor/skills/cli-design/SKILL.md` — workspace standard for Bun-native CLIs (stack, package layout, layer responsibilities, prompts, shell, streaming, exit codes, testing, distribution).

Those files are the source of truth. **Do not restate their rules in code reviews or new docs — link to them.**

---

## 3. Tech stack

| Concern | Choice | Notes |
| --- | --- | --- |
| Runtime | Bun (≥ 1.2) | Native TS, no separate compile step in dev, built-in test runner and bundler. |
| Language | TypeScript (strict) | `noUncheckedIndexedAccess`, `noFallthroughCasesInSwitch` on. |
| CLI parser | `commander@^14.0.3` | Pinned to v14; v15 is ESM-only pre-release. |
| Interactive prompts | `@clack/prompts@^1.4` | Always handle `isCancel()`. |
| Shell | `Bun.$` | Replaces `zx` / `execa` / `cross-env` / `rimraf`. |
| Markdown / streaming | `markdansi@^0.2` | Append-only; no live re-render. |
| Validation | `zod` | Every external boundary (env, files, HTTP, stdin). |
| Tests | `bun:test` | Mirror `src/` under `tests/` or colocate. |

Do **not** add `dotenv`, `chalk`, `kleur`, `picocolors`, `execa`, `zx`, `cross-env`, or `rimraf` — Bun and the chosen stack cover them.

### Integration clients

Pin exact versions in `package.json` when each integration is first wired in. Do not bump casually.

| Provider | Library | Notes |
| --- | --- | --- |
| AWS | `@aws-sdk/client-*` v3 (modular) | One sub-client per service we use (e.g. `@aws-sdk/client-s3`, `@aws-sdk/client-ec2`). Use `@aws-sdk/credential-providers` (`fromSSO`, `fromIni`, …) for credential loading. **Do not use `aws-sdk` v2.** |
| Kubernetes | `@kubernetes/client-node` | Reads `~/.kube/config` by default; always pass an explicit context. Shell out to `kubectl` via `Bun.$` only when the typed client genuinely can't express the operation (e.g. exec, port-forward). |
| GitLab | `@gitbeaker/rest` | Works against `gitlab.com` and self-hosted. Base URL and token come from a Zod-validated config. |

---

## 4. Repository layout

```
dex/
├── src/
│   ├── index.ts        # Entry: parser wiring, signal/error boundary
│   ├── commands/       # Subcommand entry points, grouped by provider
│   │   ├── aws/        # `dex aws ...`
│   │   ├── k8s/        # `dex k8s ...`
│   │   └── gitlab/     # `dex gitlab ...`
│   ├── services/       # External integrations. One folder per provider.
│   │   ├── aws/        # AWS SDK v3 wrappers (one file per AWS service)
│   │   ├── k8s/        # Kubernetes client wrappers
│   │   └── gitlab/     # GitLab API client wrappers
│   ├── ui/             # Prompts, spinners, streaming renderers
│   ├── utils/          # Error classes, exit-code mapping, helpers
│   ├── constants/      # Split by context: http.ts, exit-codes.ts, limits.ts
│   └── schemas/        # Zod schemas; types derived via z.infer
├── tests/              # bun:test files mirroring src/
├── .cursor/            # Rules and skills (do not edit casually)
├── AGENTS.md           # This file
├── README.md           # TODO — human-facing
├── bunfig.toml         # TODO
├── tsconfig.json       # TODO
└── package.json        # TODO
```

**Dependency direction is strict:** `commands → services → utils|constants|schemas`. `ui/` is a leaf used by `commands/` only. No upward imports.

**Module boundaries:** every folder owns one concern and exposes its public API through an `index.ts` barrel. Code outside a module imports only from that module's `index.ts`, never from internal files directly.

---

## 5. Commands

TODO once `package.json` exists. Expected scripts:

```bash
bun install          # install deps
bun run dev          # run CLI locally
bun test             # run unit tests
bun run typecheck    # tsc --noEmit
bun run lint         # TODO — pick formatter/linter
bun run build        # compile binary
```

Build target (per CLI skill):

```bash
bun build ./src/index.ts \
  --compile --minify --bytecode \
  --target=bun-darwin-arm64 \
  --outfile dist/dex
```

Cross-compile in CI for: `bun-darwin-arm64`, `bun-darwin-x64`, `bun-linux-x64`, `bun-linux-arm64`, `bun-windows-x64`, `bun-windows-arm64`.

---

## 6. Code style — high-signal reminders

Full rules live in `.cursor/rules/`. The points an agent gets wrong most often:

- **No magic values.** Numbers and strings used in business logic live in `src/constants/<context>.ts`. Import; don't redeclare.
- **No `any`, `!`, or `as Foo`.** Use `unknown` + narrowing, type guards, or Zod parsing.
- **Validate at the boundary.** Every env var, file, HTTP payload, CLI flag passes through a Zod schema before the rest of the app sees it.
- **Named exports only.** No `export default`.
- **Import only from module barrels.** `import { foo } from "../services/index.js"`, not `"../services/github/internal.js"`.
- **Functions ≤ ~20 lines, ≤ 3 params.** Group related params into an object.
- **Files ≤ ~300 lines.** Split by concern when they grow.
- **Comments explain *why*, not *what*.** Delete commented-out code; that's what git is for.
- **No floating promises.** `await` or pass them to `Promise.all` / `Promise.allSettled`.
- **Custom error types.** Extend `Error`, set `name`, forward `{ cause }`.

---

## 7. CLI conventions

- **Entry point is tiny.** `src/index.ts` only wires the parser, installs signal handlers, and catches at the boundary. Lazy-load command modules inside `.action()` callbacks.
- **Every prompt → `isCancel()` check.** Use `cancel(msg)` + `process.exit(130)` on cancellation.
- **Group related prompts** with `group({}, { onCancel })` so one Ctrl-C aborts the whole flow.
- **Spinners wrap awaited work.** No logging between `s.start()` and `s.stop()`.
- **`stdout` = the answer.** `stderr` = progress, warnings, errors, prompts. Never mix.
- **Every command that prints data takes `--json`.** In JSON mode: structured payload on stdout, no color, no spinners.
- **Respect `NO_COLOR` and `FORCE_COLOR`.**
- **Gate prompts on `process.stdout.isTTY`.** Fail fast with a usage error in non-TTY contexts instead of hanging on stdin.
- **Exit codes** come from `src/constants/exit-codes.ts` — never inline a number.

---

## 8. Errors and exit codes

Single `CliError` class, single boundary handler in `src/index.ts`. Services and UI throw; they do **not** call `process.exit()`.

| Code | Meaning |
| --- | --- |
| `0` | Success |
| `1` | Generic failure |
| `2` | Usage error (commander emits) |
| `64` | `EX_USAGE` — bad invocation by caller |
| `65` | `EX_DATAERR` — invalid input data |
| `69` | `EX_UNAVAILABLE` — upstream service down |
| `130` | User cancelled (SIGINT / `isCancel`) |
| `143` | SIGTERM |

---

## 9. Logging

- Structured logs with context (operation name, request id, etc.).
- Levels: `debug` (diagnostics), `info` (lifecycle), `warn` (recoverable), `error` (failures).
- **Never** log secrets, tokens, PII, or unredacted user input.
- Log once at the boundary that handles an error, not at every layer.

---

## 10. Testing

- `bun:test` only. Files end in `.test.ts`, live next to the source or under `tests/` mirroring `src/`.
- Unit-test commands by invoking `program.parseAsync([...])` and asserting on a captured logger / exit code. **Do not spawn a subprocess for unit tests.**
- Mock the integration wrappers (`services/aws/*`, `services/k8s/*`, `services/gitlab/*`) with `mock.module(...)`. **Do not** mock the AWS/K8S/GitLab SDKs directly — that's testing the SDK, not our code.
- Use `--preload` in `bunfig.toml` for mocks that must run before import-time side effects.
- One smoke test of the compiled binary per target platform in CI.

---

## 11. Integration boundaries

Anything that touches AWS, Kubernetes, or GitLab lives behind a thin typed wrapper in `src/services/<provider>/`. Rules that apply to all three:

- **Credentials are explicit.** No service constructs a client from ambient defaults silently. Every wrapper takes a config object (region/profile, kube context, GitLab host/token) parsed from a Zod schema. Resolve the credential source once at startup, surface it (account ID, cluster name, GitLab user) before any mutating operation.
- **Read vs write are different shapes.** Reads are safe by default. Writes require explicit confirmation in interactive mode and an explicit `--yes` (or `--no-confirm`) in non-TTY mode.
- **`--dry-run` on every write command.** It must exercise the same code path up to the actual mutation and print the plan to stdout (JSON when `--json` is set).
- **Idempotency.** Re-running a successful command is a no-op or a clear "already applied." Use the provider's idempotency primitives (AWS client tokens, K8S `resourceVersion`, GitLab `If-Match`) where they exist.
- **Retry transient errors only** (5xx, throttling, timeouts) with exponential backoff. Never retry 4xx — that's a bug or a permissions issue; fail fast with a useful message.
- **No console-clicking parity.** Each command does one thing; users compose them in scripts. Don't reproduce sprawling console wizards.

### AWS

- Modular `@aws-sdk/client-*` v3 only; never `aws-sdk` v2.
- Region and profile come from flags (`--region`, `--profile`) or env (`AWS_REGION`, `AWS_PROFILE`). No defaults baked into source.
- Prefer SSO via `@aws-sdk/credential-providers`'s `fromSSO` over long-lived access keys.
- Resolve and log the target **account ID via `sts:GetCallerIdentity`** at the start of every command that mutates state. Never log the access key.

### Kubernetes

- `@kubernetes/client-node` for typed access. Shell out to `kubectl` via `Bun.$` only when the client API genuinely can't express the operation.
- Context comes from `--context` flag or `KUBECONFIG_CONTEXT` env. Never use whatever happens to be current — show the resolved context and require confirmation for writes.
- Namespace is explicit: `--namespace` is required for namespaced resources. No implicit `default`.

### GitLab

- `@gitbeaker/rest`. Base URL and token come from a Zod-validated config (`GITLAB_HOST`, `GITLAB_TOKEN`).
- Tokens are scoped to the minimum the command needs; document required scopes in the command's `--help`.
- Pipeline triggers, MR actions, and approvals go through `services/gitlab/`, never via raw `fetch` calls in commands.

---

## 12. Security

- No `eval` or dynamic execution of untrusted input.
- All `Bun.$` interpolations are auto-escaped — never `${userInput}` into a single string literal yourself.
- Secrets read from env via a Zod-validated config schema at startup. They never appear in source, logs, or error messages.
- **Token redaction:** GitLab tokens and any AWS session/secret values are masked in logs (show last 4 chars only).
- **Refuse destructive operations against unexpected targets** unless an explicit override is passed: `--account <id>`, `--context <name>`, `--gitlab-host <host>`. The wrapper should compare against an allowlist read from config.
- Default-deny on any authorization check; require explicit allow.

---

## 13. Commits, branches, PRs

TODO — confirm with project owner:

- Commit message style: e.g. Conventional Commits (`feat:`, `fix:`, `chore:`).
- Branch naming: e.g. `feat/<short-desc>`, `fix/<short-desc>`.
- MR template: TODO (likely GitLab MRs given the team's CI/CD platform).
- Required checks before merge: `bun test`, `bun run typecheck`, lint, build.

---

## 14. Anti-patterns (don't do these)

- Importing every command at the top of `src/index.ts` (slows cold start — lazy-load).
- Talking to AWS / K8S / GitLab from outside `src/services/<provider>/`.
- Reading credentials in `commands/` or `ui/`. Credentials are a `services/` concern only.
- Hardcoding AWS region or account, K8S cluster/context, or GitLab host anywhere in source.
- Skipping `--dry-run` on a new write command, or making `--dry-run` skip code paths the real run uses.
- Falling back to `aws-sdk` v2, raw `kubectl exec`, or hand-rolled `fetch` against GitLab when the typed clients cover the operation.
- Prompting the user from a `services/` function.
- Calling `process.exit()` anywhere outside `src/index.ts`.
- Mixing data and logs on `stdout`.
- Reaching for `chalk`, `kleur`, `picocolors`, `execa`, `zx`, `cross-env`, `rimraf`, `dotenv`.
- Skipping the `isCancel()` check after a clack prompt.
- Restating rules from `.cursor/rules/` in code comments.

---

## 15. Definition of done

Before considering a change complete, an agent must verify:

- [ ] `bun run typecheck` passes
- [ ] `bun test` passes (existing and new)
- [ ] No new `any`, `!`, `as Foo`, or `// @ts-ignore`
- [ ] Public exports go through module `index.ts` barrels
- [ ] New constants live in `src/constants/<context>.ts`
- [ ] New external inputs parsed through a Zod schema
- [ ] No hardcoded AWS region/account, K8S context, or GitLab host
- [ ] New write commands implement `--dry-run` and `--yes` / `--no-confirm`
- [ ] Tokens and credentials redacted in logs and error messages
- [ ] Touched files stay under ~300 lines

---

## 16. Editing this file

This file is the agent's onboarding doc. Keep it:

- **Short.** Link to rules and skills instead of restating them.
- **Concrete.** Every claim should be actionable. Delete fluff.
- **Current.** When a `TODO` is resolved or a convention changes, update here first.

If you disagree with a convention, change the rule in `.cursor/rules/` (the source of truth), then update this file to match.
