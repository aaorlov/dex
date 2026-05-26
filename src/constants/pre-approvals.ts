import { MILLIS_PER_SECOND, SECONDS_PER_HOUR } from "./time.ts";

export const PREAPPROVALS_HTTP_TIMEOUT_MS = 15 * MILLIS_PER_SECOND;
export const PREAPPROVALS_DEFAULT_LIMIT = 25;
export const REQUEST_DURATION_SECONDS = 12 * SECONDS_PER_HOUR;
export const DEFAULT_TICKET_NUMBER = "N/A";

export const APPROVED_PREAPPROVAL_STATUS = "APPROVED";

export const PREAPPROVAL_LIST_MODES = ["owner", "approver"] as const;
export type PreApprovalListMode = (typeof PREAPPROVAL_LIST_MODES)[number];

export const PREAPPROVAL_SORT_FIELDS = ["createdAt", "updatedAt"] as const;
export type PreApprovalSortField = (typeof PREAPPROVAL_SORT_FIELDS)[number];

export const PREAPPROVAL_SORT_ORDERS = ["asc", "desc"] as const;
export type PreApprovalSortOrder = (typeof PREAPPROVAL_SORT_ORDERS)[number];

export const REQUEST_STATUSES = ["GRANTED", "PENDING", "REJECTED", "EXPIRED"] as const;
export type AccessRequestStatus = (typeof REQUEST_STATUSES)[number];
