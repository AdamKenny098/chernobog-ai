import type {
  CognitiveActionRisk,
} from "./actionTypes";

const RISK_ORDER:
  Record<CognitiveActionRisk, number> = {
    low: 0,
    medium: 1,
    high: 2,
    critical: 3,
  };

export function compareCognitiveActionRisk(
  left: CognitiveActionRisk,
  right: CognitiveActionRisk,
): number {
  return (
    RISK_ORDER[left] -
    RISK_ORDER[right]
  );
}

export function isBoundedActionRisk(
  risk: CognitiveActionRisk,
): boolean {
  return (
    compareCognitiveActionRisk(
      risk,
      "medium",
    ) <= 0
  );
}
