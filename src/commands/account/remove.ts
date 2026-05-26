import { cancel, confirm, isCancel, log } from "@clack/prompts";
import type { Command } from "commander";
import { EXIT } from "../../constants/index.ts";
import { findAccount, removeAccount } from "../../services/index.ts";
import {
  CliError,
  NotFoundError,
  createContext,
} from "../../utils/index.ts";

interface RemoveFlags {
  readonly yes?: boolean;
}

async function confirmRemoval(alias: string, isTTY: boolean): Promise<boolean> {
  if (!isTTY) return false;
  const answer = await confirm({
    message: `Remove account "${alias}"?`,
    initialValue: false,
  });
  if (isCancel(answer)) {
    cancel("Aborted.");
    process.exit(EXIT.SigInt);
  }
  return answer;
}

export function registerAccountRemoveCommand(parent: Command): void {
  parent
    .command("remove")
    .description("Remove an account by alias.")
    .argument("<alias>", "Alias of the account to remove")
    .option("-y, --yes", "Skip the confirmation prompt", false)
    .action(async (alias: string, flags: RemoveFlags) => {
      const ctx = createContext();
      const target = await findAccount(alias);
      if (!target) {
        throw new NotFoundError(`No account found with alias "${alias}".`);
      }

      const skipConfirm = Boolean(flags.yes);
      if (!skipConfirm) {
        if (!ctx.isTTY) {
          throw new CliError(
            `Refusing to remove "${alias}" without --yes in a non-interactive shell.`,
            EXIT.ExUsage,
          );
        }
        const ok = await confirmRemoval(alias, ctx.isTTY);
        if (!ok) {
          log.info("Cancelled.");
          return;
        }
      }

      await removeAccount(alias);
      log.success(`Removed account "${alias}".`);
    });
}
