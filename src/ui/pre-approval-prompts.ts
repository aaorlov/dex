import { confirm, group, isCancel, text } from "@clack/prompts";
import type { ZodType } from "zod";
import { EXIT } from "../constants/index.ts";
import {
  AwsAccountNameSchema,
  AwsRoleSchema,
  PreApprovalSchema,
  type PreApproval,
} from "../schemas/index.ts";

interface PreApprovalEntry {
  readonly account: string;
  readonly role: string;
}

function validateAgainst(
  schema: ZodType<string>,
  value: string | undefined,
): string | undefined {
  const result = schema.safeParse(value ?? "");
  if (result.success) return undefined;
  return result.error.issues[0]?.message ?? "Invalid value.";
}

async function promptEntry(): Promise<PreApprovalEntry> {
  const answers = await group(
    {
      account: () =>
        text({
          message: "AWS account name",
          placeholder: "eu1-prod-account",
          validate: (value) => validateAgainst(AwsAccountNameSchema, value),
        }),
      role: () =>
        text({
          message: "Role",
          placeholder: "AdminAccess",
          validate: (value) => validateAgainst(AwsRoleSchema, value),
        }),
    },
    {
      onCancel: () => process.exit(EXIT.SigInt),
    },
  );
  return {
    account: AwsAccountNameSchema.parse(answers.account),
    role: AwsRoleSchema.parse(answers.role),
  };
}

async function askAgain(): Promise<boolean> {
  const answer = await confirm({
    message: "Add another pre-approval?",
    initialValue: true,
  });
  if (isCancel(answer)) process.exit(EXIT.SigInt);
  return answer;
}

export async function promptPreApprovals(): Promise<readonly PreApproval[]> {
  const approvals: PreApproval[] = [];
  let addMore = true;
  while (addMore) {
    const entry = await promptEntry();
    approvals.push(PreApprovalSchema.parse(`${entry.account}/${entry.role}`));
    addMore = await askAgain();
  }
  return approvals;
}
