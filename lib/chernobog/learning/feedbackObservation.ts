import type {
  LearningFeedbackObservation,
} from "./evaluationTypes";

function requireTimestamp(
  value: string,
): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(
      "learning feedback observedAt must be a valid timestamp.",
    );
  }

  return parsed.toISOString();
}

function requireConfidence(
  value: number,
): number {
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  ) {
    throw new Error(
      "learning feedback confidence must be between 0 and 1.",
    );
  }

  return value;
}

export function createLearningFeedbackObservation(
  input: {
    id: string;
    experienceId: string;
    observedAt: string;
    kind: LearningFeedbackObservation["kind"];
    confidence?: number;
    detail?: string;
  },
): LearningFeedbackObservation {
  const id = input.id.trim();
  const experienceId = input.experienceId.trim();

  if (!id || !experienceId) {
    throw new Error(
      "learning feedback observation id and experienceId must not be empty.",
    );
  }

  return {
    id,
    experienceId,
    observedAt:
      requireTimestamp(
        input.observedAt,
      ),
    kind: input.kind,
    confidence:
      requireConfidence(
        input.confidence ?? 1,
      ),
    detail:
      input.detail?.trim() || undefined,
  };
}
