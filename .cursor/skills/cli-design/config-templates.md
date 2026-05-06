# Config Templates

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "types": ["bun-types"]
  },
  "include": ["src"]
}
```

## package.json — Standard CLI

```json
{
  "name": "my-cli",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "mycli": "./src/index.ts"
  },
  "scripts": {
    "dev": "bun run src/index.ts",
    "build": "bun build src/index.ts --compile --minify --bytecode --outfile dist/mycli",
    "build:all": "bun run scripts/build-all.ts",
    "test": "bun test",
    "test:coverage": "bun test --coverage"
  },
  "dependencies": {
    "commander": "^14.0.0",
    "@clack/prompts": "^0.11.0",
    "chalk": "^5.4.0"
  },
  "devDependencies": {
    "bun-types": "latest",
    "typescript": "^5.8"
  }
}
```

## package.json — Agent CLI (with AI SDK)

```json
{
  "name": "my-agent-cli",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "myagent": "./src/index.ts"
  },
  "scripts": {
    "dev": "bun run src/index.ts",
    "build": "bun build src/index.ts --compile --minify --bytecode --outfile dist/myagent"
  },
  "dependencies": {
    "commander": "^14.0.0",
    "@clack/prompts": "^0.11.0",
    "chalk": "^5.4.0",
    "ai": "^6.0.0",
    "@ai-sdk/anthropic": "latest",
    "markdansi": "latest",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "bun-types": "latest",
    "typescript": "^5.8"
  }
}
```

## package.json — Agent CLI with LangGraph

```json
{
  "name": "my-langgraph-cli",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "myagent": "./src/index.ts"
  },
  "scripts": {
    "dev": "bun run src/index.ts",
    "build": "bun build src/index.ts --compile --minify --bytecode --outfile dist/myagent"
  },
  "dependencies": {
    "commander": "^14.0.0",
    "@clack/prompts": "^0.11.0",
    "chalk": "^5.4.0",
    "@langchain/langgraph": "^0.2.0",
    "@langchain/anthropic": "latest",
    "markdansi": "latest",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "bun-types": "latest",
    "typescript": "^5.8"
  }
}
```

## package.json — Agent CLI with Ink TUI

```json
{
  "name": "my-tui-cli",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "mytui": "./src/index.ts"
  },
  "scripts": {
    "dev": "bun run src/index.ts",
    "build": "bun build src/index.ts --compile --minify --bytecode --outfile dist/mytui"
  },
  "dependencies": {
    "commander": "^14.0.0",
    "@clack/prompts": "^0.11.0",
    "chalk": "^5.4.0",
    "ai": "^6.0.0",
    "@ai-sdk/anthropic": "latest",
    "markdansi": "latest",
    "zod": "^3.24.0",
    "ink": "^6.6.0",
    "ink-spinner": "^5.0.0",
    "ink-text-input": "^6.0.0",
    "react": "^19.2.0"
  },
  "devDependencies": {
    "@types/react": "^19.2.0",
    "bun-types": "latest",
    "typescript": "^5.8"
  }
}
```

## package.json — MCP Server

```json
{
  "name": "my-mcp-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "bun run src/index.ts",
    "build": "bun build src/index.ts --compile --minify --bytecode --outfile dist/mcp-server"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "bun-types": "latest",
    "typescript": "^5.8"
  }
}
```

## package.json — Monorepo Workspace Root

```json
{
  "name": "my-agent-system",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "dev": "bun run --filter client-cli dev",
    "build": "bun run --filter '*' build",
    "build:cli": "bun run --filter client-cli build"
  },
  "devDependencies": {
    "bun-types": "latest",
    "typescript": "^5.8"
  }
}
```

## Cross-Platform Build Script

```typescript
// scripts/build-all.ts
const targets = [
  { target: 'bun-linux-x64', suffix: 'linux-x64' },
  { target: 'bun-linux-arm64', suffix: 'linux-arm64' },
  { target: 'bun-darwin-x64', suffix: 'darwin-x64' },
  { target: 'bun-darwin-arm64', suffix: 'darwin-arm64' },
  { target: 'bun-windows-x64', suffix: 'win-x64', ext: '.exe' },
];

const name = 'mycli';
const entry = 'src/index.ts';

for (const { target, suffix, ext = '' } of targets) {
  const outfile = `dist/${name}-${suffix}${ext}`;
  console.log(`Building ${outfile}...`);
  const proc = Bun.spawn([
    'bun', 'build', entry,
    '--compile', '--minify', '--bytecode',
    `--target=${target}`, `--outfile=${outfile}`,
  ]);
  await proc.exited;
  if (proc.exitCode !== 0) {
    console.error(`Failed: ${outfile}`);
    process.exit(1);
  }
}

console.log('All builds complete.');
```
