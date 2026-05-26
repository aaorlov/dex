import { intro, log, outro, spinner } from "@clack/prompts";
import type { Command } from "commander";
import {
  login,
  requestConfiguredPreApprovals,
  resolveAccount,
  type ConfiguredRequestSummary,
  type LoginResult,
  type PreApprovalsClientConfig,
} from "../../services/index.ts";
import type { AccountConfig } from "../../schemas/index.ts";
import { reportPreApprovalResults } from "../../ui/index.ts";
import { CliError } from "../../utils/index.ts";
import { EXIT } from "../../constants/index.ts";

interface LoginFlags {
  readonly force?: boolean;
}

export function registerAuthLoginCommand(parent: Command): void {
  parent
    .command("login")
    .description(
      "Sign in to an account and submit any pre-configured pre-approval requests.",
    )
    .argument(
      "[account]",
      "Account alias or name. Defaults to the first configured account.",
    )
    .option(
      "-f, --force",
      "Bypass the cached token and force a fresh sign-in.",
      false,
    )
    .action(async (identifier: string | undefined, flags: LoginFlags) => {
      const account = await resolveAccount(identifier);
      intro(`dex auth login ${account.alias}`);

      const session = await signIn(account, Boolean(flags.force));
      reportSignIn(account, session);

      if (account.preApprovals.length === 0) {
        outro("No pre-configured pre-approvals to request.");
        return;
      }

      const summary = await submitPreApprovals(account, session);
      reportPreApprovalResults(summary);
      if (summary.failed.length > 0) {
        throw new CliError(
          `Failed to create ${summary.failed.length} of ${summary.toRequest.length} access request${plural(summary.toRequest.length)}.`,
          EXIT.Failure,
        );
      }
      outro("Done.");
    });
}

async function signIn(
  account: AccountConfig,
  force: boolean,
): Promise<LoginResult> {
  const s = spinner();
  s.start(`Signing in as "${account.name}"...`);
  try {
    return await login(account, force, {
      onAuthorizeUrl: (url: string | undefined) => {
        log.info(`Opening browser to: ${url}`);
        s.message("Opened browser. Complete sign-in there.");
      },
    });
  } finally {
    s.stop(`Signed in to "${account.alias}".`);
  }
}

function reportSignIn(account: AccountConfig, session: LoginResult): void {
  if (session.fromCache) {
    log.info(
      `Reused cached token for "${account.alias}". Pass --force to sign in again.`,
    );
  } else {
    log.success(`Signed in as "${account.name}".`);
  }
}

async function submitPreApprovals(
  account: AccountConfig,
  session: LoginResult,
): Promise<ConfiguredRequestSummary> {
  const client: PreApprovalsClientConfig = {
    apiUrl: account.apiUrl,
    idToken: session.token.id_token,
  };
  const s = spinner();
  s.start(
    `Submitting ${account.preApprovals.length} pre-configured pre-approval(s)...`,
  );
  try {
    return await requestConfiguredPreApprovals(client, account.preApprovals);
  } finally {
    s.stop("Pre-approvals processed.");
  }
}

function plural(count: number): string {
  return count === 1 ? "" : "s";
}
