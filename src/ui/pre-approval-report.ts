import { log } from "@clack/prompts";
import type {
  ConfiguredRequestSummary,
  PreApprovalChoice,
  PreApprovalRequestOutcome,
} from "../services/index.ts";

const BULLET = "  - ";
const UNKNOWN_ERROR = "unknown error";

export function reportPreApprovalResults(
  summary: ConfiguredRequestSummary,
): void {
  logCreated(summary.created);
  logAlreadyActive(summary.alreadyActive);
  logFailed(summary.failed);
  logNotFound(summary.notFound);
}

function logCreated(created: readonly PreApprovalRequestOutcome[]): void {
  if (created.length === 0) return;
  log.success(
    header(`Created ${created.length} access ${requestWord(created.length)}`) +
      listChoices(created.map((o) => o.choice)),
  );
}

function logAlreadyActive(active: readonly PreApprovalChoice[]): void {
  if (active.length === 0) return;
  log.info(header(`Already active (${active.length})`) + listChoices(active));
}

function logFailed(failed: readonly PreApprovalRequestOutcome[]): void {
  if (failed.length === 0) return;
  const lines = failed
    .map((o) => `${BULLET}${o.choice.label} — ${o.error ?? UNKNOWN_ERROR}`)
    .join("\n");
  log.error(header(`Failed (${failed.length})`) + lines);
}

function logNotFound(notFound: readonly string[]): void {
  if (notFound.length === 0) return;
  const lines = notFound.map((pair) => `${BULLET}${pair}`).join("\n");
  log.warn(
    header(`Not approved or expired (${notFound.length})`) + lines,
  );
}

function listChoices(choices: readonly PreApprovalChoice[]): string {
  return choices.map((c) => `${BULLET}${c.label}`).join("\n");
}

function header(text: string): string {
  return `${text}:\n`;
}

function requestWord(count: number): string {
  return count === 1 ? "request" : "requests";
}
