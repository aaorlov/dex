import { REQUEST_DURATION_SECONDS } from "../../constants/index.ts";
import type { PreApprovalItem } from "../../schemas/index.ts";
import { DataError } from "../../utils/index.ts";

export interface CreateRequestPayload {
  readonly accountId: string;
  readonly accountName: string;
  readonly accountEmail: string;
  readonly isSoxCompliant: boolean;
  readonly duration: number;
  readonly ticketNumber: string;
  readonly description: string;
  readonly preApprovalId: string;
  readonly permissionSetId: string;
  readonly permissionSetName: string;
}

export function buildRequestPayload(
  item: PreApprovalItem,
  ticketNumber: string,
): CreateRequestPayload {
  const accountId = item.account?.id ?? item.accountId;
  const permissionSetId = item.permissionSet?.id ?? item.permissionSetId;
  if (!accountId) {
    throw new DataError(
      `Pre-approval "${item.id}" is missing an account id; cannot create request.`,
    );
  }
  if (!permissionSetId) {
    throw new DataError(
      `Pre-approval "${item.id}" is missing a permission set id; cannot create request.`,
    );
  }
  return {
    accountId,
    accountName: item.account?.name ?? "",
    accountEmail: item.account?.email ?? "",
    isSoxCompliant: item.account?.isSoxCompliant ?? false,
    duration: REQUEST_DURATION_SECONDS,
    ticketNumber,
    description: "",
    preApprovalId: item.id,
    permissionSetId,
    permissionSetName: item.permissionSet?.name ?? "",
  };
}
