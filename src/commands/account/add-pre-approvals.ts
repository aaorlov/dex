import { intro, log, outro } from "@clack/prompts";
import type { Command } from "commander";
import { EXIT } from "../../constants/index.ts";
import { addPreApprovals, findAccount } from "../../services/index.ts";
import {
  CliError,
  NotFoundError,
  createContext,
} from "../../utils/index.ts";
import { noteAccount, promptPreApprovals } from "../../ui/index.ts";

export function registerAccountAddPreApprovalsCommand(parent: Command): void {
  parent
    .command("add-pre-approvals")
    .description("Interactively add default pre-approvals (aws-account/role pairs) to an account.")
    .argument("<alias>", "Alias of the account to update")
    .action(async (alias: string) => {
      const ctx = createContext();
      if (!ctx.isTTY) {
        throw new CliError(
          "`account add-pre-approvals` requires an interactive terminal.",
          EXIT.ExUsage,
        );
      }

      const existing = await findAccount(alias);
      if (!existing) {
        throw new NotFoundError(`No account found with alias "${alias}".`);
      }

      intro(`dex account add-pre-approvals ${alias}`);
      const entered = await promptPreApprovals();
      const { account, added, skipped } = await addPreApprovals(alias, entered);

      noteAccount(`Updated account "${alias}"`, account);

      if (added.length > 0) {
        const noun = added.length === 1 ? "pre-approval" : "pre-approvals";
        log.success(`Added ${added.length} ${noun} to "${alias}".`);
      } else {
        log.info(`No new pre-approvals added to "${alias}".`);
      }
      if (skipped.length > 0) {
        const noun = skipped.length === 1 ? "duplicate" : "duplicates";
        log.warn(`Skipped ${skipped.length} ${noun}: ${skipped.join(", ")}`);
      }

      outro("Done.");
    });
}
