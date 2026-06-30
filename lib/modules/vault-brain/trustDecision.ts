import type {
  TrustActionRequest,
  TrustDecision,
  TrustDecisionStatus,
  TrustRiskLevel,
} from "./trustActionTypes";
import { normalizeTrustActionType } from "./trustActionTypes";
import type { TrustPolicyManifest, TrustPolicyRule } from "./trustPolicyManifest";
import { DEFAULT_TRUST_POLICY_MANIFEST } from "./trustPolicyManifest";
import { getDefaultToolPermission } from "./toolPermissionRegistry";

function stableId(prefix = "trust"): string {
  const stamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
  const random = Math.random().toString(36).slice(2, 9);
  return `${prefix}-${stamp}-${random}`;
}

function normalizeToolId(value: string | undefined): string | undefined {
  return value?.trim().toLowerCase() || undefined;
}

function targetMatchesForbidden(target: string | undefined, forbiddenTargets: string[]): string | undefined {
  if (!target) {
    return undefined;
  }

  const normalizedTarget = target.trim().toLowerCase().replace(/\\/g, "/");
  return forbiddenTargets.find((forbidden) => normalizedTarget.includes(forbidden.toLowerCase()));
}

function findPolicyRule(
  request: TrustActionRequest,
  manifest: TrustPolicyManifest
): TrustPolicyRule | undefined {
  const requestedTool = normalizeToolId(request.requestedTool);

  if (requestedTool) {
    const exactToolRule = manifest.rules.find((rule) => rule.requestedTool === requestedTool);
    if (exactToolRule) {
      return exactToolRule;
    }
  }

  return manifest.rules.find((rule) => rule.actionType === request.actionType);
}

function decisionStatusForRisk(risk: TrustRiskLevel): TrustDecisionStatus {
  if (risk === "safe_auto") {
    return "allowed";
  }

  if (risk === "safe_with_notice") {
    return "notice";
  }

  if (risk === "forbidden") {
    return "blocked";
  }

  return "approval-required";
}

function normalizeRequest(request: TrustActionRequest): TrustActionRequest {
  const requestedTool = normalizeToolId(request.requestedTool);
  const toolPermission = requestedTool ? getDefaultToolPermission(requestedTool) : undefined;

  return {
    ...request,
    actionType: request.actionType ?? toolPermission?.actionType ?? normalizeTrustActionType("read"),
    requestedTool,
    title: request.title.trim() || "Untitled trust action",
    description: request.description?.trim(),
    target: request.target?.trim(),
  };
}

export function createTrustDecision(
  request: TrustActionRequest,
  manifest: TrustPolicyManifest = DEFAULT_TRUST_POLICY_MANIFEST
): TrustDecision {
  const normalizedRequest = normalizeRequest(request);
  const forbiddenMatch = targetMatchesForbidden(normalizedRequest.target, manifest.forbiddenTargets);
  const policyRule = findPolicyRule(normalizedRequest, manifest);
  const toolPermission = normalizedRequest.requestedTool
    ? getDefaultToolPermission(normalizedRequest.requestedTool)
    : undefined;

  const risk: TrustRiskLevel = forbiddenMatch
    ? "forbidden"
    : normalizedRequest.risk ?? policyRule?.risk ?? toolPermission?.defaultRisk ?? manifest.defaultRisk;

  const status = decisionStatusForRisk(risk);
  const explicitApprovalRequired = risk === "dangerous_requires_explicit_approval" || Boolean(policyRule?.requiresExplicitApproval);
  const approvalRequired = status === "approval-required";
  const allowedToExecute = status === "allowed" || status === "notice";

  const reason = forbiddenMatch
    ? `Blocked because target matches forbidden governance boundary: ${forbiddenMatch}.`
    : policyRule?.reason
      ?? toolPermission?.description
      ?? "No specific policy rule matched; default governance risk was applied.";

  return {
    id: normalizedRequest.id ?? stableId(),
    request: normalizedRequest,
    risk,
    status,
    approvalRequired,
    explicitApprovalRequired,
    auditRequired: risk !== "safe_auto",
    allowedToExecute,
    reason,
    policyRuleId: policyRule?.id,
    createdAt: new Date().toISOString(),
  };
}

export function formatTrustDecision(decision: TrustDecision): string {
  return [
    `Decision: ${decision.status}`,
    `Risk: ${decision.risk}`,
    `Action: ${decision.request.actionType}`,
    decision.request.requestedTool ? `Tool: ${decision.request.requestedTool}` : undefined,
    decision.request.target ? `Target: ${decision.request.target}` : undefined,
    `Approval required: ${decision.approvalRequired ? "yes" : "no"}`,
    `Explicit approval required: ${decision.explicitApprovalRequired ? "yes" : "no"}`,
    `Audit required: ${decision.auditRequired ? "yes" : "no"}`,
    `Allowed to execute now: ${decision.allowedToExecute ? "yes" : "no"}`,
    decision.policyRuleId ? `Policy rule: ${decision.policyRuleId}` : undefined,
    `Reason: ${decision.reason}`,
  ]
    .filter((line): line is string => typeof line === "string")
    .join("\n");
}
