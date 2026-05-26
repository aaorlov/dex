import {
  APPROVED_PREAPPROVAL_STATUS,
  DEFAULT_TICKET_NUMBER,
  PREAPPROVALS_DEFAULT_LIMIT,
  type AccessRequestStatus,
  type PreApprovalListMode,
  type PreApprovalSortField,
  type PreApprovalSortOrder,
} from "../../constants/index.ts";
import {
  CreateRequestResponseSchema,
  PreApprovalsResponseSchema,
  RequestsResponseSchema,
  type AccessRequest,
  type PreApprovalItem,
} from "../../schemas/index.ts";
import { timeLeft } from "../../utils/index.ts";
import { authRequest, type PreApprovalsClientConfig } from "./client.ts";
import { buildRequestPayload } from "./request-payload.ts";

export interface ListPreApprovalsOptions {
  readonly limit?: number;
  readonly mode?: PreApprovalListMode;
  readonly sortBy?: PreApprovalSortField;
  readonly order?: PreApprovalSortOrder;
}

export interface ListRequestsOptions {
  readonly limit?: number;
  readonly mode?: PreApprovalListMode;
  readonly status?: AccessRequestStatus;
}

export interface ListChoicesOptions {
  /** "<account>/<role>" pairs to preselect when not already active. */
  readonly preselected?: readonly string[];
}

export interface CreateRequestOptions {
  readonly ticketNumber?: string;
}

export interface PreApprovalChoice {
  readonly label: string;
  readonly item: PreApprovalItem;
  readonly isActive: boolean;
  readonly isPreselected: boolean;
}

export interface ConfiguredRequestPlan {
  /** Configured pairs that match an approved pre-approval and need a new request. */
  readonly toRequest: readonly PreApprovalChoice[];
  /** Configured pairs that already have a granted access request. */
  readonly alreadyActive: readonly PreApprovalChoice[];
  /** Configured pairs with no matching approved pre-approval (expired / revoked / unknown). */
  readonly notFound: readonly string[];
}

export interface PreApprovalRequestOutcome {
  readonly choice: PreApprovalChoice;
  readonly request?: AccessRequest;
  readonly error?: string;
}

export interface ConfiguredRequestSummary extends ConfiguredRequestPlan {
  /** Pre-approvals for which a new access request was successfully created. */
  readonly created: readonly PreApprovalRequestOutcome[];
  /** Pre-approvals whose access-request creation failed (with the upstream error). */
  readonly failed: readonly PreApprovalRequestOutcome[];
}

export async function listApprovedPreApprovals(
  config: PreApprovalsClientConfig,
  options: ListPreApprovalsOptions = {},
): Promise<readonly PreApprovalItem[]> {
  const data = await authRequest(
    config,
    {
      path: "/pre-approvals",
      query: {
        limit: options.limit ?? PREAPPROVALS_DEFAULT_LIMIT,
        mode: options.mode ?? "owner",
        sortBy: options.sortBy ?? "createdAt",
        order: options.order ?? "desc",
      },
    },
    PreApprovalsResponseSchema,
  );
  return data.preApprovals
    .filter((item) => item.status === APPROVED_PREAPPROVAL_STATUS)
    .toSorted(byAccountAndPermissionSet);
}

export async function listRequests(
  config: PreApprovalsClientConfig,
  options: ListRequestsOptions = {},
): Promise<readonly AccessRequest[]> {
  const data = await authRequest(
    config,
    {
      path: "/requests",
      query: {
        limit: options.limit ?? PREAPPROVALS_DEFAULT_LIMIT,
        mode: options.mode ?? "owner",
        status: options.status ?? "GRANTED",
      },
    },
    RequestsResponseSchema,
  );
  return data.requests;
}

export async function listPreApprovalChoices(
  config: PreApprovalsClientConfig,
  options: ListChoicesOptions = {},
): Promise<readonly PreApprovalChoice[]> {
  const [preApprovals, requests] = await Promise.all([
    listApprovedPreApprovals(config),
    listRequests(config),
  ]);
  const activeIds = collectGrantedIds(requests);
  const preselectedPairs = new Set(options.preselected ?? []);
  return preApprovals.map((item) =>
    buildChoice(item, activeIds, preselectedPairs),
  );
}

export async function createPreApprovalRequest(
  config: PreApprovalsClientConfig,
  item: PreApprovalItem,
  options: CreateRequestOptions = {},
): Promise<AccessRequest> {
  const payload = buildRequestPayload(
    item,
    options.ticketNumber ?? DEFAULT_TICKET_NUMBER,
  );
  const data = await authRequest(
    config,
    { method: "POST", path: "/requests", body: payload },
    CreateRequestResponseSchema,
  );
  return data.request;
}

export function categorizeConfiguredPreApprovals(
  choices: readonly PreApprovalChoice[],
  configured: readonly string[],
): ConfiguredRequestPlan {
  const byPair = new Map<string, PreApprovalChoice>();
  for (const choice of choices) {
    byPair.set(pairFor(choice.item), choice);
  }
  const toRequest: PreApprovalChoice[] = [];
  const alreadyActive: PreApprovalChoice[] = [];
  const notFound: string[] = [];
  for (const pair of configured) {
    const choice = byPair.get(pair);
    if (!choice) {
      notFound.push(pair);
      continue;
    }
    if (choice.isActive) {
      alreadyActive.push(choice);
      continue;
    }
    toRequest.push(choice);
  }
  return { toRequest, alreadyActive, notFound };
}

export async function requestConfiguredPreApprovals(
  config: PreApprovalsClientConfig,
  configured: readonly string[],
  options: CreateRequestOptions = {},
): Promise<ConfiguredRequestSummary> {
  if (configured.length === 0) {
    return emptySummary();
  }
  const choices = await listPreApprovalChoices(config, {
    preselected: configured,
  });
  const plan = categorizeConfiguredPreApprovals(choices, configured);
  const { created, failed } = await submitChoices(
    config,
    plan.toRequest,
    options,
  );
  return { ...plan, created, failed };
}

interface SubmitOutcomes {
  readonly created: readonly PreApprovalRequestOutcome[];
  readonly failed: readonly PreApprovalRequestOutcome[];
}

async function submitChoices(
  config: PreApprovalsClientConfig,
  choices: readonly PreApprovalChoice[],
  options: CreateRequestOptions,
): Promise<SubmitOutcomes> {
  const created: PreApprovalRequestOutcome[] = [];
  const failed: PreApprovalRequestOutcome[] = [];
  for (const choice of choices) {
    try {
      const request = await createPreApprovalRequest(
        config,
        choice.item,
        options,
      );
      created.push({ choice, request });
    } catch (err: unknown) {
      failed.push({ choice, error: describeError(err) });
    }
  }
  return { created, failed };
}

function emptySummary(): ConfiguredRequestSummary {
  return {
    created: [],
    failed: [],
    toRequest: [],
    alreadyActive: [],
    notFound: [],
  };
}

function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function collectGrantedIds(
  requests: readonly AccessRequest[],
): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const request of requests) {
    if (request.status === "GRANTED" && request.preApprovalId) {
      ids.add(request.preApprovalId);
    }
  }
  return ids;
}

function buildChoice(
  item: PreApprovalItem,
  activeIds: ReadonlySet<string>,
  preselectedPairs: ReadonlySet<string>,
): PreApprovalChoice {
  const accountName = item.account?.name ?? item.accountId ?? "";
  const permissionSetName = item.permissionSet?.name ?? item.permissionSetId ?? "";
  const pair = pairFor(item);
  const isActive = activeIds.has(item.id);
  const isPreselected = !isActive && preselectedPairs.has(pair);
  const label = `${accountName} / ${permissionSetName} (${expiryText(item.expiresAt)})`;
  return { label, item, isActive, isPreselected };
}

function pairFor(item: PreApprovalItem): string {
  const accountName = item.account?.name ?? item.accountId ?? "";
  const permissionSetName =
    item.permissionSet?.name ?? item.permissionSetId ?? "";
  return `${accountName}/${permissionSetName}`;
}

function expiryText(expiresAt: string | undefined): string {
  const remaining = timeLeft(expiresAt);
  if (remaining === "expired" || remaining === "unknown") return remaining;
  return `expires in ${remaining}`;
}

function byAccountAndPermissionSet(
  a: PreApprovalItem,
  b: PreApprovalItem,
): number {
  const accountCmp = (a.account?.name ?? "").localeCompare(b.account?.name ?? "");
  if (accountCmp !== 0) return accountCmp;
  return (a.permissionSet?.name ?? "").localeCompare(b.permissionSet?.name ?? "");
}

