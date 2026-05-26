import type { Command } from "commander";
import { registerAccountCommand } from "./account/index.ts";
import { registerAuthCommand } from "./auth/index.ts";

export function registerCommands(program: Command): void {
  registerAccountCommand(program);
  registerAuthCommand(program);
}
