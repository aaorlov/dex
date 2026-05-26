import { z } from "zod";

const optionalString = z.string().optional();

export const PreApprovalAccountSchema = z.object({
  id: optionalString,
  name: optionalString,
  email: optionalString,
  isSoxCompliant: z.boolean().optional(),
});

export const PreApprovalPermissionSetSchema = z.object({
  id: optionalString,
  name: optionalString,
});

export const PreApprovalItemSchema = z.object({
  id: z.string().min(1, "Pre-approval id is required."),
  status: z.string(),
  expiresAt: optionalString,
  accountId: optionalString,
  permissionSetId: optionalString,
  account: PreApprovalAccountSchema.optional(),
  permissionSet: PreApprovalPermissionSetSchema.optional(),
});

export const PreApprovalsResponseSchema = z.object({
  preApprovals: z.array(PreApprovalItemSchema),
});

export const AccessRequestSchema = z.object({
  id: optionalString,
  status: z.string(),
  preApprovalId: optionalString,
});

export const RequestsResponseSchema = z.object({
  requests: z.array(AccessRequestSchema),
});

export const CreateRequestResponseSchema = z.object({
  request: AccessRequestSchema,
});

export type PreApprovalAccount = z.infer<typeof PreApprovalAccountSchema>;
export type PreApprovalPermissionSet = z.infer<typeof PreApprovalPermissionSetSchema>;
export type PreApprovalItem = z.infer<typeof PreApprovalItemSchema>;
export type AccessRequest = z.infer<typeof AccessRequestSchema>;
