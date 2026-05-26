import { note } from "@clack/prompts";
import type { AccountConfig } from "../schemas/index.ts";

function pad(label: string, width: number): string {
  return label.padEnd(width, " ");
}

const LABEL_WIDTH = 8;

export function noteAccount(title: string, account: AccountConfig): void {
  const lines: string[] = [
    `${pad("name", LABEL_WIDTH)} ${account.name}`,
    `${pad("alias", LABEL_WIDTH)} ${account.alias}`,
    `${pad("api", LABEL_WIDTH)} ${account.apiUrl}`,
    `${pad("config", LABEL_WIDTH)} ${account.configUrl}`,
    `${pad("cognito", LABEL_WIDTH)} ${account.cognitoDomain}`,
  ];
  if (account.preApprovals.length > 0) {
    lines.push("", "pre-approvals:");
    for (const approval of account.preApprovals) {
      lines.push(`  - ${approval}`);
    }
  }
  note(lines.join("\n"), title);
}
