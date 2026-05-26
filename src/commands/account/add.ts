import { intro, log, outro } from "@clack/prompts";
import type { Command } from "commander";
import { EXIT } from "../../constants/index.ts";
import { addAccount } from "../../services/index.ts";
import { CliError, createContext } from "../../utils/index.ts";
import { noteAccount, promptAccount } from "../../ui/index.ts";

export function registerAccountAddCommand(parent: Command): void {
  parent
    .command("add")
    .description("Interactively register a new account.")
    .action(async () => {
      const ctx = createContext();
      if (!ctx.isTTY) {
        throw new CliError(
          "`account add` requires an interactive terminal.",
          EXIT.ExUsage,
        );
      }

      intro("dex account add");
      const account = await promptAccount();
      await addAccount(account);
      noteAccount(`Added account "${account.alias}"`, account);
      log.success(`Account "${account.alias}" saved.`);
      outro("Done.");
    });
}
