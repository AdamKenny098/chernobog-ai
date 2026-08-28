import type {
  CognitiveActionOpportunity,
  CognitiveGovernanceSnapshot,
} from "../cognition/actionTypes";
import type {
  ExecutionStep,
  ExecutionTask,
} from "../execution/types";
import {
  evaluateUnifiedGovernance,
} from "./policyBridge";
import type {
  UnifiedGovernanceDecision,
} from "./policyBridge";

export interface ExecutionGovernanceContext {
  governance: CognitiveGovernanceSnapshot;
  opportunity?: CognitiveActionOpportunity;
}

export type ResolveExecutionStepGovernance = (
  step: ExecutionStep,
  task: ExecutionTask,
) => ExecutionGovernanceContext | undefined;

export function evaluateTaskRuntimeGovernance(
  task: ExecutionTask,
  context?: ExecutionGovernanceContext,
): UnifiedGovernanceDecision {
  return evaluateUnifiedGovernance({
    executionRisk: task.risk,
    action: task.category,
    cognitive: context,
  });
}

export function evaluateStepRuntimeGovernance(
  step: ExecutionStep,
  context?: ExecutionGovernanceContext,
): UnifiedGovernanceDecision {
  return evaluateUnifiedGovernance({
    executionRisk: step.risk,
    action: step.action ?? step.kind,
    cognitive: context,
  });
}

export function getGovernanceDecisionMessage(
  decision: UnifiedGovernanceDecision,
  fallback: string,
): string {
  const preferred =
    [...decision.reasons]
      .reverse()
      .find((reason) => {
        if (decision.disposition === "deny") {
          return (
            reason.code === "permission-denied" ||
            reason.code === "execution-blocked"
          );
        }

        if (decision.disposition === "confirm") {
          return (
            reason.code === "permission-confirmation-required" ||
            reason.code === "autonomy-disabled" ||
            reason.code === "autonomy-advisory" ||
            reason.code === "requires-user-input" ||
            reason.code === "high-action-risk" ||
            reason.code === "critical-action-risk" ||
            reason.code === "irreversible-action" ||
            reason.code === "execution-approval-required"
          );
        }

        return false;
      });

  return (
    preferred?.detail ??
    decision.reasons.at(-1)?.detail ??
    fallback
  );
}
