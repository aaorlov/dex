import {
  PreApprovalSchema,
  type AccountConfig,
  type PreApproval,
} from "../../schemas/index.ts";
import { ConflictError, NotFoundError } from "../../utils/index.ts";
import { readAccounts, writeAccounts } from "./store.ts";

export async function listAccounts(): Promise<readonly AccountConfig[]> {
  return readAccounts();
}

export async function findAccount(
  alias: string,
): Promise<AccountConfig | undefined> {
  const accounts = await readAccounts();
  return accounts.find((account) => account.alias === alias);
}

export async function resolveAccount(
  identifier: string | undefined,
): Promise<AccountConfig> {
  const accounts = await readAccounts();
  if (accounts.length === 0) {
    throw new NotFoundError(
      "No accounts configured. Run `dex account add` to register one.",
    );
  }
  if (identifier === undefined) {
    const [first] = accounts;
    if (!first) {
      throw new NotFoundError(
        "No accounts configured. Run `dex account add` to register one.",
      );
    }
    return first;
  }
  const match =
    accounts.find((account) => account.alias === identifier) ??
    accounts.find((account) => account.name === identifier);
  if (!match) {
    throw new NotFoundError(
      `No account matches alias or name "${identifier}".`,
    );
  }
  return match;
}

export async function addAccount(account: AccountConfig): Promise<void> {
  const accounts = await readAccounts();
  if (accounts.some((existing) => existing.alias === account.alias)) {
    throw new ConflictError(
      `Account with alias "${account.alias}" already exists.`,
    );
  }
  const next = [...accounts, account].sort((a, b) =>
    a.alias.localeCompare(b.alias),
  );
  await writeAccounts(next);
}

export async function removeAccount(alias: string): Promise<AccountConfig> {
  const accounts = await readAccounts();
  const target = accounts.find((account) => account.alias === alias);
  if (!target) {
    throw new NotFoundError(`No account found with alias "${alias}".`);
  }
  const next = accounts.filter((account) => account.alias !== alias);
  await writeAccounts(next);
  return target;
}

export interface PreApprovalUpdate {
  readonly account: AccountConfig;
  readonly added: readonly PreApproval[];
  readonly skipped: readonly PreApproval[];
}

export async function addPreApprovals(
  alias: string,
  preApprovals: readonly string[],
): Promise<PreApprovalUpdate> {
  const incoming = preApprovals.map((value) => PreApprovalSchema.parse(value));
  const accounts = await readAccounts();
  const target = accounts.find((account) => account.alias === alias);
  if (!target) {
    throw new NotFoundError(`No account found with alias "${alias}".`);
  }

  const existing = new Set(target.preApprovals);
  const added: PreApproval[] = [];
  const skipped: PreApproval[] = [];
  for (const approval of incoming) {
    if (existing.has(approval)) {
      skipped.push(approval);
      continue;
    }
    existing.add(approval);
    added.push(approval);
  }

  const merged = [...existing].sort();
  const next: AccountConfig = { ...target, preApprovals: merged };
  const updated = accounts.map((account) => account.alias === target.alias ? next : account);
  await writeAccounts(updated);
  return { account: next, added, skipped };
}
