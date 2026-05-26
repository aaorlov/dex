import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { ZodError } from "zod";
import { accountsFile, configDir } from "../../constants/index.ts";
import {
  AccountsFileSchema,
  type AccountConfig,
  type AccountsFile,
} from "../../schemas/index.ts";
import { DataError } from "../../utils/index.ts";

const CURRENT_VERSION = 1;

export async function readAccounts(): Promise<readonly AccountConfig[]> {
  const file = Bun.file(accountsFile());
  if (!(await file.exists())) {
    return [];
  }
  try {
    const raw: unknown = await file.json();
    const parsed = AccountsFileSchema.parse(raw);
    return parsed.accounts;
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      throw new DataError(
        `Corrupt accounts file at ${accountsFile()}: ${err.issues
          .map((issue) => issue.message)
          .join("; ")}`,
      );
    }
    if (err instanceof SyntaxError) {
      throw new DataError(
        `Could not parse accounts file at ${accountsFile()}: ${err.message}`,
        { cause: err },
      );
    }
    throw err;
  }
}

export async function writeAccounts(
  accounts: readonly AccountConfig[],
): Promise<void> {
  const target = accountsFile();
  await mkdir(dirname(target), { recursive: true });
  const payload: AccountsFile = {
    version: CURRENT_VERSION,
    accounts: [...accounts],
  };
  await Bun.write(target, `${JSON.stringify(payload, null, 2)}\n`);
}

export function configLocation(): string {
  return configDir();
}

export function accountsLocation(): string {
  return accountsFile();
}
