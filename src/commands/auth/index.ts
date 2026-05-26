import type { Command } from "commander";
import { registerAuthLoginCommand } from "./login.ts";

export function registerAuthCommand(program: Command): void {
  const auth = program
    .command("auth")
    .description("Authenticate against the configured Cognito-backed accounts.");

  registerAuthLoginCommand(auth);
}
