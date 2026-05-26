import { z } from "zod";

const ALIAS_PATTERN = /^[a-z][a-z0-9-]{1,31}$/;
const ALIAS_HINT =
  "lowercase letters, digits, hyphens; must start with a letter; 2–32 chars";

const AWS_ACCOUNT_NAME_PATTERN = /^[A-Za-z0-9._-]+$/;
const AWS_ACCOUNT_NAME_HINT = "letters, digits, dots, underscores, hyphens";

const AWS_ROLE_PATTERN = /^[A-Za-z0-9._+=,@-]+$/;
const AWS_ROLE_HINT = "letters, digits, and . _ + = , @ -";

const PRE_APPROVAL_PATTERN = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._+=,@-]+$/;
const PRE_APPROVAL_HINT = '"<aws-account>/<role>"';

export const AliasSchema = z
  .string()
  .trim()
  .regex(ALIAS_PATTERN, `Alias must match ${ALIAS_HINT}.`);

export const AwsAccountNameSchema = z
  .string()
  .trim()
  .min(1, "AWS account name is required.")
  .regex(
    AWS_ACCOUNT_NAME_PATTERN,
    `AWS account name must contain only ${AWS_ACCOUNT_NAME_HINT}.`,
  );

export const AwsRoleSchema = z
  .string()
  .trim()
  .min(1, "Role is required.")
  .regex(AWS_ROLE_PATTERN, `Role must contain only ${AWS_ROLE_HINT}.`);

export const PreApprovalSchema = z
  .string()
  .trim()
  .regex(
    PRE_APPROVAL_PATTERN,
    `Pre-approval must be in the form ${PRE_APPROVAL_HINT}.`,
  );

export type PreApproval = z.infer<typeof PreApprovalSchema>;

export const AccountConfigSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  alias: AliasSchema,
  apiUrl: z
    .url("API URL must be a valid URL.")
    .transform((value) => value.replace(/\/+$/, "")),
  configUrl: z.url("Config URL must be a valid URL."),
  cognitoDomain: z.string().trim().min(1, "Cognito domain is required."),
  preApprovals: z.array(PreApprovalSchema).default([]),
});

export type AccountConfig = z.infer<typeof AccountConfigSchema>;

export const AccountsFileSchema = z.object({
  version: z.literal(1),
  accounts: z.array(AccountConfigSchema),
});

export type AccountsFile = z.infer<typeof AccountsFileSchema>;
