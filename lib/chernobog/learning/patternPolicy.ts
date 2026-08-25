import type { LearningPatternPolicy } from "./patternTypes";

export const DEFAULT_LEARNING_PATTERN_POLICY: LearningPatternPolicy = {
  minimumSupport: 2,
  maximumContradictionRatio: 0.34,
  confidenceFloor: 0.6,
};

export function validateLearningPatternPolicy(policy: LearningPatternPolicy): void {
  if (!Number.isInteger(policy.minimumSupport) || policy.minimumSupport < 2) {
    throw new Error("learning pattern minimumSupport must be an integer of at least 2.");
  }
  for (const [field, value] of [
    ["maximumContradictionRatio", policy.maximumContradictionRatio],
    ["confidenceFloor", policy.confidenceFloor],
  ] as const) {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new Error(`learning pattern ${field} must be between 0 and 1.`);
    }
  }
}
