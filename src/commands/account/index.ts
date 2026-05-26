import type { Command } from "commander";
import { registerAccountAddCommand } from "./add.ts";
import { registerAccountAddPreApprovalsCommand } from "./add-pre-approvals.ts";
import { registerAccountListCommand } from "./list.ts";
import { registerAccountRemoveCommand } from "./remove.ts";

export function registerAccountCommand(program: Command): void {
  const account = program
    .command("account")
    .description("Manage Cognito-backed accounts the CLI can sign in with.");

  registerAccountAddCommand(account);
  registerAccountAddPreApprovalsCommand(account);
  registerAccountListCommand(account);
  registerAccountRemoveCommand(account);
}
