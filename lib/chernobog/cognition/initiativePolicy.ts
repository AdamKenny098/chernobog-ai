import type {
  CognitiveInitiativePolicy,
} from "./initiativeTypes";

export const DEFAULT_COGNITIVE_INITIATIVE_POLICY:
  CognitiveInitiativePolicy = {
    surfaceThreshold: 60,
    interruptThreshold: 85,
    cooldownMs: 5 * 60 * 1000,
    escalationDelta: 15,
    criticalMayInterruptBusy: true,
  };

export function validateCognitiveInitiativePolicy(
  policy: CognitiveInitiativePolicy,
): void {
  for (const [
    field,
    value,
  ] of [
    [
      "surfaceThreshold",
      policy.surfaceThreshold,
    ],
    [
      "interruptThreshold",
      policy.interruptThreshold,
    ],
    [
      "escalationDelta",
      policy.escalationDelta,
    ],
  ] as const) {
    if (
      !Number.isFinite(value) ||
      value < 0 ||
      value > 100
    ) {
      throw new Error(
        `cognitive initiative ${field} must be between 0 and 100.`,
      );
    }
  }

  if (
    policy.interruptThreshold <
    policy.surfaceThreshold
  ) {
    throw new Error(
      "cognitive initiative interruptThreshold must be at least surfaceThreshold.",
    );
  }

  if (
    !Number.isFinite(
      policy.cooldownMs,
    ) ||
    policy.cooldownMs < 0
  ) {
    throw new Error(
      "cognitive initiative cooldownMs must be non-negative.",
    );
  }
}
