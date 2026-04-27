// lib/chernobog/execution/riskPolicy.ts

import { ExecutionRiskLevel, ExecutionStep } from "./types";

export type ExecutionApprovalMode =
  | "auto"
  | "notice"
  | "approval"
  | "blocked";

export interface ExecutionRiskPolicyResult {
  mode: ExecutionApprovalMode;
  reason?: string;
}

export function getRiskPolicyForStep(step: ExecutionStep): ExecutionRiskPolicyResult {
  return getRiskPolicy(step.risk, step.action);
}

export function getRiskPolicy(
  risk: ExecutionRiskLevel,
  action?: string
): ExecutionRiskPolicyResult {
  if (risk === "blocked") {
    return {
      mode: "blocked",
      reason: "This action is blocked by the execution risk policy.",
    };
  }

  if (risk === "approval_required") {
    return {
      mode: "approval",
      reason: "This action requires approval before execution.",
    };
  }

  if (risk === "notice") {
    return {
      mode: "notice",
      reason: action
        ? `Action "${action}" will run with notice-level risk.`
        : "This action will run with notice-level risk.",
    };
  }

  return {
    mode: "auto",
  };
}