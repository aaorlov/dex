import type { Command } from "commander";
import {
  accountsLocation,
  listAccounts,
} from "../../services/index.ts";
import { createContext } from "../../utils/index.ts";
import { renderAccountsTable } from "../../ui/index.ts";

interface ListFlags {
  readonly json?: boolean;
}

export function registerAccountListCommand(parent: Command): void {
  parent
    .command("list")
    .description("List all configured accounts.")
    .option("--json", "Emit JSON to stdout", false)
    .action(async (flags: ListFlags) => {
      const ctx = createContext({ json: Boolean(flags.json) });
      const accounts = await listAccounts();

      if (ctx.json) {
        process.stdout.write(`${JSON.stringify(accounts, null, 2)}\n`);
        return;
      }

      if (accounts.length === 0) {
        process.stderr.write(
          `No accounts configured yet. Run \`dex account add\` to register one.\n`,
        );
        process.stderr.write(`Config file: ${accountsLocation()}\n`);
        return;
      }

      process.stdout.write(`${renderAccountsTable(accounts)}\n`);
    });
}
