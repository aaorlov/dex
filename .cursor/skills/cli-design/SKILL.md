---
name: cli-design
description: >-
  Design and scaffold CLI tools and AI agent systems using Bun and TypeScript.
  Use when building CLI applications, terminal tools, interactive prompts,
  agent-powered CLIs, MCP servers, or compiling to single binary executables.
---

# CLI & Agent Architect — Bun/TypeScript 2026

Design and scaffold high-performance, single-binary CLI tools using Bun,
prioritizing modularity for AI agent integration, interactive UIs,
and platform-agnostic business logic.

## Execution Environment

- **Runtime:** Bun (>= 1.3.0)
- **Language:** TypeScript (strict mode)
- **Target:** Single Executable Application (SEA)
- **Compilation:** `bun build --compile --minify --bytecode`
- **Cross-compile targets:** `bun-linux-x64`, `bun-linux-arm64`, `bun-darwin-x64`, `bun-darwin-arm64`, `bun-windows-x64`

---

## Package Stack

| Category | Package | Purpose |
| :--- | :--- | :--- |
| **Command Parsing** | `commander` | Routing, subcommands, flags, auto-help |
| **Interactivity** | `@clack/prompts` | Text, select, confirm, multiselect, spinner |
| **Styling** | `chalk` | Colors, bold, dim, underline |
| **Icons** | `lucide-static` | Standard SVG icon set for terminal/web |
| **Stateful UI** | `ink` 6 + `react` 19 | Complex dashboard-style terminal UIs |
| **Shell** | `Bun.$` (built-in) | Tagged template shell execution, piping, glob |
| **Local State** | `bun:sqlite` (built-in) | Auth tokens, agent history, config, caches |
| **Database** | `Bun.sql` (built-in, 1.3+) | Native Postgres, MySQL, Redis clients |
| **Agent Orchestration** | `@langchain/langgraph` | Cyclic AI workflows, state machines, interrupts |
| **AI SDK** | `ai` (Vercel AI SDK 6) | `generateText`, `streamText`, tool calling |
| **Tool Protocol** | `@modelcontextprotocol/sdk` | MCP server/client, stdio & Streamable HTTP |
| **Markdown Rendering** | `markdansi` | Markdown-to-ANSI for terminal, LLM streaming support |
| **Schema** | `zod` | Validation, AI SDK tool params, MCP tool schemas |
| **Testing** | `bun test` (built-in) | Jest-compatible runner, mocking, snapshots, coverage |

---

## Folder Structure

### Standard CLI

```text
my-cli/
├── src/
│   ├── index.ts             # Entry point: program definition + global opts
│   ├── commands/             # One file per command
│   │   ├── init.ts
│   │   ├── deploy.ts
│   │   └── status.ts
│   ├── services/             # Business logic, API clients
│   │   ├── auth.ts
│   │   └── api.ts
│   ├── ui/                   # Clack prompts, Ink components, theme
│   │   └── theme.ts
│   └── utils/                # Shared helpers, config loading
│       └── config.ts
├── package.json
├── tsconfig.json
└── bun.lockb
```

### Agent System (Monorepo)

```text
my-agent-system/
├── packages/
│   ├── agent-core/            # Platform-agnostic agent logic
│   │   ├── src/
│   │   │   ├── graph/         # LangGraph nodes, edges, interrupts
│   │   │   ├── state.ts       # Shared state type definitions
│   │   │   └── index.ts       # Main export: createAgent()
│   │   └── package.json
│   │
│   ├── mcp-server/            # MCP tool server
│   │   ├── src/
│   │   │   ├── tools/         # Tool handler implementations
│   │   │   └── index.ts       # Server bootstrap, tool registration
│   │   └── package.json
│   │
│   ├── client-cli/            # CLI client
│   │   ├── src/
│   │   │   ├── index.ts       # Entry point & global config
│   │   │   ├── commands/      # Command handlers (chat, login, status)
│   │   │   ├── services/      # External integrations (AWS, GitHub, Auth)
│   │   │   ├── ui/            # Clack/Ink views & theme
│   │   │   └── utils/         # CLI-specific helpers
│   │   └── package.json
│   │
│   └── client-web/            # Web client (optional)
│       ├── src/
│       │   ├── hooks/         # useAgent() adapter
│       │   └── components/    # Vite + React UI
│       └── package.json
│
├── package.json               # Root workspace
├── bun.lockb
└── AGENTS.md                  # Agent architecture rules
```

---

## Entry Point

```typescript
// src/index.ts
import { Command } from 'commander';
import { registerLogin } from './commands/login';
import { registerDeploy } from './commands/deploy';
import { registerChat } from './commands/chat';
import { registerInit } from './commands/init';

const program = new Command()
  .name('mytool')
  .version('1.0.0')
  .description('My CLI tool')
  .option('-v, --verbose', 'Verbose output');

registerLogin(program);
registerDeploy(program);
registerChat(program);
registerInit(program);

program.parse();
```

---

## Examples

### 1. Request-Response Command

Standard command with options, confirmation prompt, spinner, and shell execution.

```typescript
// src/commands/deploy.ts
import { Command } from 'commander';
import { intro, outro, spinner, confirm } from '@clack/prompts';
import chalk from 'chalk';

export function registerDeploy(program: Command) {
  program
    .command('deploy <target>')
    .description('Deploy to target environment')
    .option('-e, --env <name>', 'Environment', 'production')
    .option('--dry-run', 'Simulate deployment')
    .action(async (target: string, options) => {
      intro(chalk.bgBlue.white(` Deploy: ${target} `));

      if (options.env === 'production') {
        const ok = await confirm({ message: 'Deploy to production?' });
        if (!ok) {
          outro(chalk.yellow('Cancelled.'));
          return;
        }
      }

      const s = spinner();
      s.start(`Deploying ${target} to ${options.env}...`);

      if (options.dryRun) {
        s.stop('Dry run complete.');
        outro(chalk.green('No changes applied.'));
        return;
      }

      await Bun.$`kubectl apply -f deploy/${target}.yaml`;
      s.stop('Deployment finished.');
      outro(chalk.green('Deployed successfully.'));
    });
}
```

### 2. Service Layer with Shell Execution

Business logic separated from command handlers.

```typescript
// src/services/aws.ts
export class AwsService {
  static async ssoLogin(profile: string) {
    await Bun.$`aws sso login --profile ${profile}`;
  }

  static async whoami(profile: string) {
    const result = await Bun.$`aws sts get-caller-identity --profile ${profile}`.text();
    return JSON.parse(result);
  }
}
```

```typescript
// src/commands/login.ts
import { Command } from 'commander';
import { intro, outro, spinner } from '@clack/prompts';
import chalk from 'chalk';
import { AwsService } from '../services/aws';

export function registerLogin(program: Command) {
  program
    .command('login')
    .description('Authenticate with AWS SSO')
    .option('-p, --profile <name>', 'AWS profile name', 'default')
    .action(async (options) => {
      intro(chalk.bgYellow.black(` AWS SSO: ${options.profile} `));

      const s = spinner();
      s.start(`Initiating login for profile: ${options.profile}`);

      try {
        await AwsService.ssoLogin(options.profile);
        s.stop('Login process complete.');
        outro(chalk.green('Successfully authenticated.'));
      } catch (err: any) {
        s.stop('Login failed.');
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });
}
```

### 3. Interactive Wizard (Multi-Step Prompts)

```typescript
// src/commands/init.ts
import { Command } from 'commander';
import { intro, outro, text, select, multiselect, confirm, spinner } from '@clack/prompts';
import chalk from 'chalk';

export function registerInit(program: Command) {
  program
    .command('init')
    .description('Initialize a new project')
    .action(async () => {
      intro(chalk.bgMagenta.white(' New Project '));

      const name = await text({
        message: 'Project name:',
        placeholder: 'my-project',
        validate: (v) => (v.length < 1 ? 'Required' : undefined),
      });

      const template = await select({
        message: 'Template:',
        options: [
          { label: 'Minimal', value: 'minimal' },
          { label: 'Full', value: 'full', hint: 'With tests and linting' },
          { label: 'Agent', value: 'agent', hint: 'AI agent monorepo' },
        ],
      });

      const features = await multiselect({
        message: 'Features:',
        options: [
          { label: 'TypeScript', value: 'typescript' },
          { label: 'ESLint + Prettier', value: 'lint' },
          { label: 'Testing (bun test)', value: 'testing' },
          { label: 'CI/CD (GitHub Actions)', value: 'ci' },
        ],
        required: true,
      });

      const useGit = await confirm({ message: 'Initialize git?', initialValue: true });

      const s = spinner();
      s.start('Scaffolding project...');

      await Bun.$`mkdir -p ${name}/src/commands ${name}/src/services ${name}/src/utils`;
      if (useGit) await Bun.$`cd ${name} && git init`;

      s.stop('Project created.');
      outro(chalk.green(`cd ${name} && bun install`));
    });
}
```

### 4. Interactive Agent Chat (Open Communication Loop)

Persistent conversation with AI agent using Vercel AI SDK.

```typescript
// src/commands/chat.ts
import { Command } from 'commander';
import { intro, outro, text, spinner } from '@clack/prompts';
import { streamText, tool } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { render, createMarkdownStreamer } from 'markdansi';
import chalk from 'chalk';
import { z } from 'zod';

const searchTool = tool({
  description: 'Search the knowledge base',
  parameters: z.object({ query: z.string() }),
  execute: async ({ query }) => ({ results: [`Result for: ${query}`] }),
});

export function registerChat(program: Command) {
  program
    .command('chat')
    .description('Interactive AI chat session')
    .option('-m, --model <id>', 'Model ID', 'claude-sonnet-4-20250514')
    .option('-s, --system <prompt>', 'System prompt', 'You are a helpful assistant.')
    .action(async (options) => {
      intro(chalk.bgCyan.black(' Agent Session '));
      console.log(chalk.dim('  Type "exit" to quit.\n'));

      const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

      const streamer = createMarkdownStreamer({
        render: (md) => render(md, { width: process.stdout.columns ?? 80 }),
      });

      while (true) {
        const input = await text({ message: 'You:' });
        if (!input || input === 'exit') break;

        messages.push({ role: 'user', content: String(input) });

        const { textStream } = streamText({
          model: anthropic(options.model),
          system: options.system,
          messages,
          tools: { search: searchTool },
          maxSteps: 5,
        });

        process.stdout.write('\n');
        let full = '';
        for await (const delta of textStream) {
          full += delta;
          const chunk = streamer.push(delta);
          if (chunk) process.stdout.write(chunk);
        }
        const remaining = streamer.flush();
        if (remaining) process.stdout.write(remaining);
        process.stdout.write('\n\n');

        messages.push({ role: 'assistant', content: full });
      }

      outro('Session closed.');
    });
}
```

### 5. MCP Server

```typescript
// packages/mcp-server/src/index.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({ name: 'my-tools', version: '1.0.0' });

server.tool('search', 'Search the knowledge base', { query: z.string() }, async ({ query }) => ({
  content: [{ type: 'text', text: `Results for: ${query}` }],
}));

server.tool(
  'run-query',
  'Execute a database query',
  { sql: z.string(), database: z.string().default('main') },
  async ({ sql, database }) => ({
    content: [{ type: 'text', text: `Executed on ${database}: ${sql}` }],
  }),
);

const transport = new StdioServerTransport();
await server.connect(transport);
```

### 6. Local State with bun:sqlite

Persistent local storage for auth tokens, agent conversation history, and config.
Synchronous API, zero dependencies, 3-6x faster than `better-sqlite3`.

```typescript
// src/services/store.ts
import { Database } from 'bun:sqlite';
import { homedir } from 'node:os';
import { mkdirSync } from 'node:fs';

const CONFIG_DIR = `${homedir()}/.config/mytool`;
mkdirSync(CONFIG_DIR, { recursive: true });

function openDb() {
  const db = new Database(`${CONFIG_DIR}/state.db`);
  db.run('PRAGMA journal_mode = WAL');
  db.run(`CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  return db;
}

export class Store {
  static get(key: string): string | undefined {
    using db = openDb();
    const row = db.query('SELECT value FROM kv WHERE key = ?').get(key) as any;
    return row?.value;
  }

  static set(key: string, value: string) {
    using db = openDb();
    db.run('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', [key, value]);
  }

  static appendMessage(role: string, content: string) {
    using db = openDb();
    db.run('INSERT INTO history (role, content) VALUES (?, ?)', [role, content]);
  }

  static getHistory(limit = 50): Array<{ role: string; content: string }> {
    using db = openDb();
    return db.query('SELECT role, content FROM history ORDER BY id DESC LIMIT ?').all(limit) as any;
  }
}
```

### 7. Native Database Access (Bun 1.3+)

Built-in Postgres/MySQL via `Bun.sql` — no `pg`, `mysql2`, or drivers needed.

```typescript
// src/services/db.ts
import { sql } from 'bun';
const db = sql`postgres://user:pass@localhost:5432/mydb`;

export const getUsers = () => db`SELECT id, name, email FROM users ORDER BY created_at DESC`;
export const createUser = (name: string, email: string) =>
  db`INSERT INTO users (name, email) VALUES (${name}, ${email}) RETURNING *`;
```

---

## Build & Distribution

```bash
# Development
bun run src/index.ts

# Dev with arguments
bun run src/index.ts deploy staging --dry-run

# Single binary (current platform)
bun build src/index.ts --compile --minify --bytecode --outfile dist/mytool

# Cross-platform
bun build src/index.ts --compile --minify --bytecode \
  --target=bun-linux-x64 --outfile dist/mytool-linux-x64

bun build src/index.ts --compile --minify --bytecode \
  --target=bun-darwin-arm64 --outfile dist/mytool-darwin-arm64

bun build src/index.ts --compile --minify --bytecode \
  --target=bun-windows-x64 --outfile dist/mytool-win-x64.exe
```

---

## Additional Resources

- LangGraph agent orchestration and Ink TUI streaming chat: [examples-advanced.md](examples-advanced.md)
- `tsconfig.json`, `package.json` variants, cross-platform build script: [config-templates.md](config-templates.md)

---

## Best Practices

- One command per file in `commands/`, registered via `registerXxx(program)` pattern
- Business logic in `services/`, never in command handlers
- Use `@clack/prompts` for interactive flows (text, select, confirm, spinner)
- Use `chalk` for all styled output — auto-detects `NO_COLOR` and non-TTY
- Use `Bun.$` for shell execution — built-in, handles quoting, piping, error propagation
- Use `bun:sqlite` for local persistent state (auth tokens, history, config) — not JSON files
- Use `Bun.sql` for Postgres/MySQL access — no external drivers needed
- Use `using` keyword (Explicit Resource Management) for auto-closing DB handles and file descriptors
- Use `ink` + `react` only when you need a stateful component-driven TUI (dashboards, live streams, split panes)
- Use `markdansi` to render AI agent markdown responses to ANSI terminal output — supports LLM streaming via `createMarkdownStreamer()`
- Agent logic (LangGraph, AI SDK) lives in `agent-core/`, CLI just invokes it
- MCP tools are a separate package — reusable across CLI, web, and other clients
- Always provide `--verbose` global option for debugging
- Use prompts as fallback when CLI arguments are not provided
- Validate all inputs via Zod schemas
- Test with `bun test` — Jest-compatible, built-in mocking, snapshots, `--coverage`
- Target `--bytecode` in production builds for 2-4x faster cold startup
