import { evaluateUnifiedGovernance } from "./policyBridge";

export type UnifiedGovernanceStatusState = "ready" | "degraded";

export interface UnifiedGovernanceStatus {
  status: UnifiedGovernanceStatusState;
  checkedAt: string;
  dispositions: ["allow", "confirm", "deny"];
  executionModes: ["auto", "notice", "approval", "blocked"];
  cognitivePermissions: ["allow", "confirm", "deny"];
  autonomyModes: ["disabled", "advisory", "bounded"];
  actionRisks: ["low", "medium", "high", "critical"];
  invariant: "most-restrictive-wins";
  executionHandoff: "explicit-cognitive-decision-plus-concrete-task";
  authority: {
    policyBridge: "governance/policyBridge.ts";
    runtimeEnforcement: "execution/runExecutionTask.ts";
    cognitiveHandoff: "governance/cognitiveExecution.ts";
    toolExecution: "execution/toolGateway.ts";
  };
  acceptanceSamples: {
    safeAllow: "allow" | "confirm" | "deny";
    approvalAllow: "allow" | "confirm" | "deny";
    blockedAllow: "allow" | "confirm" | "deny";
    safeDeny: "allow" | "confirm" | "deny";
  };
}

export function getUnifiedGovernanceStatus(
  options: { clock?: () => Date } = {},
): UnifiedGovernanceStatus {
  const safeAllow = evaluateUnifiedGovernance({
    executionRisk: "safe",
    cognitive: { governance: { permission: "allow", autonomy: "bounded", userInteractionAvailable: true } },
  }).disposition;
  const approvalAllow = evaluateUnifiedGovernance({
    executionRisk: "approval_required",
    cognitive: { governance: { permission: "allow", autonomy: "bounded", userInteractionAvailable: true } },
  }).disposition;
  const blockedAllow = evaluateUnifiedGovernance({
    executionRisk: "blocked",
    cognitive: { governance: { permission: "allow", autonomy: "bounded", userInteractionAvailable: true } },
  }).disposition;
  const safeDeny = evaluateUnifiedGovernance({
    executionRisk: "safe",
    cognitive: { governance: { permission: "deny", autonomy: "bounded", userInteractionAvailable: true } },
  }).disposition;
  const ready = safeAllow === "allow" && approvalAllow === "confirm" && blockedAllow === "deny" && safeDeny === "deny";
  return {
    status: ready ? "ready" : "degraded",
    checkedAt: (options.clock ?? (() => new Date()))().toISOString(),
    dispositions: ["allow", "confirm", "deny"],
    executionModes: ["auto", "notice", "approval", "blocked"],
    cognitivePermissions: ["allow", "confirm", "deny"],
    autonomyModes: ["disabled", "advisory", "bounded"],
    actionRisks: ["low", "medium", "high", "critical"],
    invariant: "most-restrictive-wins",
    executionHandoff: "explicit-cognitive-decision-plus-concrete-task",
    authority: {
      policyBridge: "governance/policyBridge.ts",
      runtimeEnforcement: "execution/runExecutionTask.ts",
      cognitiveHandoff: "governance/cognitiveExecution.ts",
      toolExecution: "execution/toolGateway.ts",
    },
    acceptanceSamples: { safeAllow, approvalAllow, blockedAllow, safeDeny },
  };
}
