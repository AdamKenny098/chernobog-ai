import type {
  LearningOutcomeObservation,
} from "./evaluationTypes";

function requireTimestamp(
  value: string,
  field: string,
): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(
      `${field} must be a valid timestamp.`,
    );
  }

  return parsed.toISOString();
}

function requireUnitInterval(
  value: number,
  field: string,
): number {
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  ) {
    throw new Error(
      `${field} must be between 0 and 1.`,
    );
  }

  return value;
}

function normalizeList(
  values: readonly string[] | undefined,
): string[] {
  return [
    ...new Set(
      (values ?? [])
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ].sort();
}

export function createLearningOutcomeObservation(
  input: {
    id: string;
    experienceId: string;
    observedAt: string;
    status: LearningOutcomeObservation["status"];
    score?: number;
    confidence?: number;
    detail?: string;
    evidenceEventIds?: string[];
    evidenceWorldStateKeys?: string[];
  },
): LearningOutcomeObservation {
  const id = input.id.trim();
  const experienceId = input.experienceId.trim();

  if (!id || !experienceId) {
    throw new Error(
      "learning outcome observation id and experienceId must not be empty.",
    );
  }

  if (
    input.score !== undefined &&
    (
      !Number.isFinite(input.score) ||
      input.score < -1 ||
      input.score > 1
    )
  ) {
    throw new Error(
      "learning outcome observation score must be between -1 and 1.",
    );
  }

  return {
    id,
    experienceId,
    observedAt: requireTimestamp(
      input.observedAt,
      "learningOutcomeObservation.observedAt",
    ),
    status: input.status,
    score: input.score,
    confidence: requireUnitInterval(
      input.confidence ?? 0.5,
      "learningOutcomeObservation.confidence",
    ),
    detail: input.detail?.trim() || undefined,
    evidenceEventIds:
      normalizeList(input.evidenceEventIds),
    evidenceWorldStateKeys:
      normalizeList(input.evidenceWorldStateKeys),
  };
}
