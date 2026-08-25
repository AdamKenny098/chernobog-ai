import type {
  CognitiveGoal,
  CognitiveGoalInput,
  CognitiveGoalPriority,
  CognitiveGoalScope,
} from "./goalTypes";

const PRIORITY_SCORE:
  Record<CognitiveGoalPriority, number> = {
    low: 20,
    normal: 45,
    high: 70,
    critical: 95,
  };

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

function requireTimestamp(
  value: string,
  field: string,
): string {
  const parsed = new Date(value);

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    throw new Error(
      `${field} must be a valid timestamp.`,
    );
  }

  return parsed.toISOString();
}

function normalizeTextList(
  values:
    readonly string[] | undefined,
): string[] {
  return [
    ...new Set(
      (values ?? [])
        .map((value) =>
          value.trim(),
        )
        .filter(Boolean),
    ),
  ].sort();
}

function normalizeScope(
  scope:
    CognitiveGoalScope | undefined,
): CognitiveGoalScope {
  return {
    keys:
      normalizeTextList(
        scope?.keys,
      ),
    keyPrefixes:
      normalizeTextList(
        scope?.keyPrefixes,
      ),
    namespaces:
      normalizeTextList(
        scope?.namespaces,
      ),
  };
}

export function getCognitiveGoalPriorityScore(
  priority: CognitiveGoalPriority,
): number {
  return PRIORITY_SCORE[priority];
}

export function buildCognitiveGoal(
  input: CognitiveGoalInput,
  now = new Date(),
): CognitiveGoal {
  const id =
    input.id.trim();

  if (!id) {
    throw new Error(
      "cognitive goal id must not be empty.",
    );
  }

  const title =
    input.title.trim();

  if (!title) {
    throw new Error(
      "cognitive goal title must not be empty.",
    );
  }

  const createdAt =
    input.createdAt
      ? requireTimestamp(
          input.createdAt,
          "cognitiveGoal.createdAt",
        )
      : now.toISOString();

  const updatedAt =
    input.updatedAt
      ? requireTimestamp(
          input.updatedAt,
          "cognitiveGoal.updatedAt",
        )
      : now.toISOString();

  return {
    id,
    title,
    status:
      input.status ??
      "active",
    priority:
      input.priority ??
      "normal",
    importance:
      requireUnitInterval(
        input.importance ?? 0.5,
        "cognitiveGoal.importance",
      ),
    urgency:
      requireUnitInterval(
        input.urgency ?? 0.5,
        "cognitiveGoal.urgency",
      ),
    createdAt,
    updatedAt,
    scope:
      normalizeScope(
        input.scope,
      ),
    tags:
      normalizeTextList(
        input.tags,
      ),
  };
}

export function calculateCognitiveGoalPriorityScore(
  goal: CognitiveGoal,
): number {
  const base =
    getCognitiveGoalPriorityScore(
      goal.priority,
    );

  const weighted =
    base * 0.5 +
    goal.importance * 100 * 0.3 +
    goal.urgency * 100 * 0.2;

  return Math.round(
    Math.max(
      0,
      Math.min(
        100,
        weighted,
      ),
    ),
  );
}
