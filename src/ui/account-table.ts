import { render } from "markdansi";
import type { AccountConfig } from "../schemas/index.ts";

const TABLE_HEADER = "| Alias | Name | API URL | Cognito |";
const TABLE_SEPARATOR = "| --- | --- | --- | --- |";

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|");
}

function row(account: AccountConfig): string {
  return `| ${escapeCell(account.alias)} | ${escapeCell(account.name)} | ${escapeCell(account.apiUrl)} | ${escapeCell(account.cognitoDomain)} |`;
}

export function renderAccountsTable(
  accounts: readonly AccountConfig[],
): string {
  const markdown = [
    TABLE_HEADER,
    TABLE_SEPARATOR,
    ...accounts.map(row),
  ].join("\n");
  return render(markdown, { width: process.stdout.columns ?? 100 });
}
