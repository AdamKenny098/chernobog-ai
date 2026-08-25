import type {
  LearningAdaptationPolicy,
} from "./adaptationTypes";

export const DEFAULT_LEARNING_ADAPTATION_POLICY:
  LearningAdaptationPolicy = {
    maxPriorityBoost: 12,
    minimumLessonConfidence: 0.75,
  };

export function validateLearningAdaptationPolicy(
  policy: LearningAdaptationPolicy,
): void {
  if (
    !Number.isFinite(policy.maxPriorityBoost) ||
    policy.maxPriorityBoost < 0 ||
    policy.maxPriorityBoost > 25
  ) {
    throw new Error(
      "learning adaptation maxPriorityBoost must be between 0 and 25.",
    );
  }

  if (
    !Number.isFinite(policy.minimumLessonConfidence) ||
    policy.minimumLessonConfidence < 0 ||
    policy.minimumLessonConfidence > 1
  ) {
    throw new Error(
      "learning adaptation minimumLessonConfidence must be between 0 and 1.",
    );
  }
}
