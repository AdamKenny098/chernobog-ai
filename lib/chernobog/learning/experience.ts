import type {
  LearningEvidence,
  LearningExperience,
  LearningExperienceInput,
  LearningFeedback,
  LearningOutcome,
} from "./types";

function normalizeTextList(
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

function requireConfidence(
  value: number,
): number {
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  ) {
    throw new Error(
      "learningExperience.confidence must be between 0 and 1.",
    );
  }

  return value;
}

function normalizeOutcome(
  input: Partial<LearningOutcome> | undefined,
): LearningOutcome {
  const status = input?.status ?? "unknown";

  if (
    input?.score !== undefined &&
    (
      !Number.isFinite(input.score) ||
      input.score < -1 ||
      input.score > 1
    )
  ) {
    throw new Error(
      "learningExperience.outcome.score must be between -1 and 1.",
    );
  }

  return {
    status,
    score: input?.score,
    detail: input?.detail?.trim() || undefined,
  };
}

function normalizeFeedback(
  input: Partial<LearningFeedback> | undefined,
): LearningFeedback {
  return {
    kind: input?.kind ?? "none",
    detail: input?.detail?.trim() || undefined,
  };
}

function normalizeEvidence(
  input: Partial<LearningEvidence> | undefined,
): LearningEvidence {
  return {
    eventIds: normalizeTextList(input?.eventIds),
    worldStateKeys: normalizeTextList(
      input?.worldStateKeys,
    ),
    cognitiveDecisionIds: normalizeTextList(
      input?.cognitiveDecisionIds,
    ),
  };
}

function requireJsonSafeContext(
  context: Record<string, unknown>,
): Record<string, unknown> {
  try {
    const json = JSON.stringify(context);

    if (json === undefined) {
      throw new Error(
        "Context is not JSON serializable.",
      );
    }

    return JSON.parse(json) as Record<
      string,
      unknown
    >;
  } catch {
    throw new Error(
      "learningExperience.context must be JSON-safe.",
    );
  }
}

export function createLearningExperience(
  input: LearningExperienceInput,
  now = new Date(),
): LearningExperience {
  const id = input.id.trim();

  if (!id) {
    throw new Error(
      "learningExperience.id must not be empty.",
    );
  }

  const occurredAt = requireTimestamp(
    input.occurredAt,
    "learningExperience.occurredAt",
  );

  const recordedAt = requireTimestamp(
    input.recordedAt ?? now.toISOString(),
    "learningExperience.recordedAt",
  );

  if (
    new Date(recordedAt).getTime() <
    new Date(occurredAt).getTime()
  ) {
    throw new Error(
      "learningExperience.recordedAt must not be earlier than occurredAt.",
    );
  }

  return {
    id,
    occurredAt,
    recordedAt,
    source: input.source,
    subject: input.subject?.trim() || undefined,
    confidence: requireConfidence(
      input.confidence ?? 0.5,
    ),
    outcome: normalizeOutcome(input.outcome),
    feedback: normalizeFeedback(input.feedback),
    evidence: normalizeEvidence(input.evidence),
    context: requireJsonSafeContext(
      input.context ?? {},
    ),
  };
}
