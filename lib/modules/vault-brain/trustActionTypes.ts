export const TRUST_RISK_LEVELS = [
  "safe_auto",
  "safe_with_notice",
  "requires_approval",
  "dangerous_requires_explicit_approval",
  "forbidden",
] as const;

export type TrustRiskLevel = (typeof TRUST_RISK_LEVELS)[number];

export const TRUST_ACTION_TYPES = [
  "read",
  "search",
  "summarize",
  "memory-read",
  "memory-write",
  "memory-approve",
  "file-read",
  "file-write",
  "project-command",
  "network",
  "external-send",
  "delete",
  "system-execute",
  "governance-edit",
] as const;

export type TrustActionType = (typeof TRUST_ACTION_TYPES)[number];

export const TRUST_DECISION_STATUSES = [
  "allowed",
  "notice",
  "approval-required",
  "blocked",
] as const;

export type TrustDecisionStatus = (typeof TRUST_DECISION_STATUSES)[number];

export type TrustActionRequest = {
  id?: string;
  title: string;
  description?: string;
  actionType: TrustActionType;
  requestedTool?: string;
  projectId?: string;
  version?: string;
  target?: string;
  risk?: TrustRiskLevel;
  actor?: string;
  metadata?: Record<string, unknown>;
};

export type TrustDecision = {
  id: string;
  request: TrustActionRequest;
  risk: TrustRiskLevel;
  status: TrustDecisionStatus;
  approvalRequired: boolean;
  explicitApprovalRequired: boolean;
  auditRequired: boolean;
  allowedToExecute: boolean;
  reason: string;
  policyRuleId?: string;
  createdAt: string;
};

export function isTrustRiskLevel(value: string): value is TrustRiskLevel {
  return TRUST_RISK_LEVELS.includes(value as TrustRiskLevel);
}

export function isTrustActionType(value: string): value is TrustActionType {
  return TRUST_ACTION_TYPES.includes(value as TrustActionType);
}

export function normalizeTrustRiskLevel(value: string): TrustRiskLevel {
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return isTrustRiskLevel(normalized) ? normalized : "requires_approval";
}

export function normalizeTrustActionType(value: string): TrustActionType {
  const normalized = value.trim().toLowerCase().replace(/[\s_]+/g, "-");
  return isTrustActionType(normalized) ? normalized : "read";
}
