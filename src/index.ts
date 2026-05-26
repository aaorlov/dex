#!/usr/bin/env bun
import { Command } from "commander";
import { registerCommands } from "./commands/index.ts";
import { handleCliError, installSignalHandlers } from "./utils/index.ts";

const program = new Command()
  .name("dex")
  .description("Day-to-day toolkit for AWS, Kubernetes, and GitLab CI/CD.")
  .version(Bun.env.npm_package_version ?? "0.0.0")
  .showHelpAfterError("(use --help for usage)")
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
