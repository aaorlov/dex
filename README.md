# dex

Bun-native CLI for AWS, Kubernetes, and GitLab CI/CD workflows.

`dex` wraps the AWS SDK, the Kubernetes API, and the GitLab API behind safe defaults — input validation, `--dry-run`, idempotency, structured output, redacted secrets — so day-to-day infra work stops being copy-pasted bash and console clicking.

> Status: early scaffolding. APIs and command names may change before the first stable release.

## Installation

### Homebrew (macOS and Linux)

`dex` is distributed via a Homebrew tap.

```bash
brew tap aaorlov/dex
brew install dex
```

Upgrade later with:

```bash
brew update
brew upgrade dex
```

Uninstall with:

```bash
brew uninstall dex
brew untap aaorlov/dex
```

### Prebuilt binary

Grab the binary for your platform from the [latest release](https://github.com/aaorlov/dex/releases/latest):

| OS    | Architecture  | Asset               |
| ----- | ------------- | ------------------- |
| macOS | Apple Silicon | `dex-darwin-arm64`  |
| macOS | Intel         | `dex-darwin-x64`    |
| Linux | x86_64        | `dex-linux-x64`     |
| Linux | arm64         | `dex-linux-arm64`   |

```bash
curl -fsSL -o dex \
  https://github.com/aaorlov/dex/releases/latest/download/dex-darwin-arm64
chmod +x dex
sudo mv dex /usr/local/bin/dex
dex --version
```

### From source

Requires [Bun](https://bun.sh/) ≥ 1.2.

```bash
git clone https://github.com/aaorlov/dex.git
cd dex
bun install
bun run build           # produces ./dist/dex for your current platform
./dist/dex --help
```

## Quick start

```bash
dex --help
dex auth login
dex account list
```

Every command supports `--help`. Commands that print data also support `--json` for machine-readable output.

## Documentation

- [`AGENTS.md`](./AGENTS.md) — operational and contribution context for humans and AI agents.
- [`.cursor/rules/`](./.cursor/rules) — coding standards (general best practices and TypeScript).
- [`.cursor/skills/cli-design/SKILL.md`](./.cursor/skills/cli-design/SKILL.md) — Bun-native CLI design standard.

## License

[MIT](./LICENSE) © Andrii Orlov
