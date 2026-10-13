import type {
  CreateResponsibilityInput,
  ResponsibilityPriority,
  ResponsibilitySource,
  ResponsibilitySourceType,
  ResponsibilityState,
  TransitionResponsibilityInput,
  UpdateResponsibilityInput,
} from "./types";

const STATES: ReadonlySet<ResponsibilityState> =
  new Set([
    "detected",
    "triaged",
    "waiting-user",
    "waiting-external",
    "scheduled",
    "delegated",
    "resolved",
    "dismissed",
  ]);

const PRIORITIES: ReadonlySet<ResponsibilityPriority> =
  new Set([
    "low",
    "normal",
    "important",
    "critical",
  ]);

const SOURCE_TYPES: ReadonlySet<ResponsibilitySourceType> =
  new Set([
    "notification",
    "calendar",
    "email",
    "message",
    "work-schedule",
    "manual",
    "system",
  ]);

function objectValue(
  value: unknown,
): Record<string, unknown> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error(
      "Expected a JSON object.",
    );
  }

  return value as Record<string, unknown>;
}

function requiredString(
  value: unknown,
  field: string,
  maxLength: number,
): string {
  if (
    typeof value !== "string"
  ) {
    throw new Error(
      `${field} must be a string.`,
    );
  }

  const trimmed =
    value.trim();

  if (!trimmed) {
    throw new Error(
      `${field} must not be empty.`,
    );
  }

  if (
    trimmed.length > maxLength
  ) {
    throw new Error(
      `${field} is too long.`,
    );
  }

  return trimmed;
}

function optionalString(
  value: unknown,
  field: string,
  maxLength: number,
): string | undefined {
  if (
    value === undefined ||
    value === null
  ) {
    return undefined;
  }

  return requiredString(
    value,
    field,
    maxLength,
  );
}

function optionalNullableString(
  value: unknown,
  field: string,
  maxLength: number,
): string | null | undefined {
  if (
    value === undefined
  ) {
    return undefined;
  }

  if (
    value === null
  ) {
    return null;
  }

  return requiredString(
    value,
    field,
    maxLength,
  );
}

function optionalBoolean(
  value: unknown,
  field: string,
): boolean | undefined {
  if (
    value === undefined
  ) {
    return undefined;
  }

  if (
    typeof value !== "boolean"
  ) {
    throw new Error(
      `${field} must be boolean.`,
    );
  }

  return value;
}

function optionalConfidence(
  value: unknown,
): number | undefined {
  if (
    value === undefined
  ) {
    return undefined;
  }

  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  ) {
    throw new Error(
      "confidence must be between 0 and 1.",
    );
  }

  return value;
}

function optionalIsoDate(
  value: unknown,
  field: string,
): string | undefined {
  if (
    value === undefined ||
    value === null
  ) {
    return undefined;
  }

  const text =
    requiredString(
      value,
      field,
      64,
    );

  if (
    Number.isNaN(
      Date.parse(text),
    )
  ) {
    throw new Error(
      `${field} must be an ISO-compatible date.`,
    );
  }

  return new Date(
    text,
  ).toISOString();
}

function optionalNullableIsoDate(
  value: unknown,
  field: string,
): string | null | undefined {
  if (
    value === undefined
  ) {
    return undefined;
  }

  if (
    value === null
  ) {
    return null;
  }

  return optionalIsoDate(
    value,
    field,
  );
}

function source(
  value: unknown,
): ResponsibilitySource {
  const record =
    objectValue(value);

  const type =
    requiredString(
      record.type,
      "source.type",
      64,
    ) as ResponsibilitySourceType;

  if (
    !SOURCE_TYPES.has(type)
  ) {
    throw new Error(
      `Unsupported source.type: ${type}`,
    );
  }

  return {
    type,
    sourceId:
      optionalString(
        record.sourceId,
        "source.sourceId",
        512,
      ),
    application:
      optionalString(
        record.application,
        "source.application",
        256,
      ),
  };
}

function relatedIds(
  value: unknown,
): string[] | undefined {
  if (
    value === undefined
  ) {
    return undefined;
  }

  if (
    !Array.isArray(value)
  ) {
    throw new Error(
      "relatedResponsibilityIds must be an array.",
    );
  }

  const result =
    value.map(
      (item) =>
        requiredString(
          item,
          "relatedResponsibilityIds[]",
          128,
        ),
    );

  return Array.from(
    new Set(result),
  ).slice(
    0,
    100,
  );
}

export function parseCreateResponsibility(
  value: unknown,
): CreateResponsibilityInput {
  const record =
    objectValue(value);

  const stateValue =
    record.state === undefined
      ? undefined
      : requiredString(
          record.state,
          "state",
          64,
        ) as ResponsibilityState;

  if (
    stateValue &&
    !STATES.has(stateValue)
  ) {
    throw new Error(
      `Unsupported state: ${stateValue}`,
    );
  }

  const priorityValue =
    record.priority === undefined
      ? undefined
      : requiredString(
          record.priority,
          "priority",
          64,
        ) as ResponsibilityPriority;

  if (
    priorityValue &&
    !PRIORITIES.has(
      priorityValue,
    )
  ) {
    throw new Error(
      `Unsupported priority: ${priorityValue}`,
    );
  }

  return {
    title:
      requiredString(
        record.title,
        "title",
        240,
      ),
    summary:
      requiredString(
        record.summary,
        "summary",
        4000,
      ),
    source:
      source(
        record.source,
      ),
    state:
      stateValue,
    priority:
      priorityValue,
    requiresHuman:
      optionalBoolean(
        record.requiresHuman,
        "requiresHuman",
      ),
    suggestedAction:
      optionalString(
        record.suggestedAction,
        "suggestedAction",
        1000,
      ),
    dueAt:
      optionalIsoDate(
        record.dueAt,
        "dueAt",
      ),
    confidence:
      optionalConfidence(
        record.confidence,
      ),
    relatedResponsibilityIds:
      relatedIds(
        record.relatedResponsibilityIds,
      ),
    mergeKey:
      optionalString(
        record.mergeKey,
        "mergeKey",
        512,
      ),
    actor:
      optionalString(
        record.actor,
        "actor",
        128,
      ),
    reason:
      optionalString(
        record.reason,
        "reason",
        1000,
      ),
  };
}

export function parseUpdateResponsibility(
  value: unknown,
): UpdateResponsibilityInput {
  const record =
    objectValue(value);

  const priorityValue =
    record.priority === undefined
      ? undefined
      : requiredString(
          record.priority,
          "priority",
          64,
        ) as ResponsibilityPriority;

  if (
    priorityValue &&
    !PRIORITIES.has(
      priorityValue,
    )
  ) {
    throw new Error(
      `Unsupported priority: ${priorityValue}`,
    );
  }

  return {
    title:
      optionalString(
        record.title,
        "title",
        240,
      ),
    summary:
      optionalString(
        record.summary,
        "summary",
        4000,
      ),
    priority:
      priorityValue,
    requiresHuman:
      optionalBoolean(
        record.requiresHuman,
        "requiresHuman",
      ),
    suggestedAction:
      optionalNullableString(
        record.suggestedAction,
        "suggestedAction",
        1000,
      ),
    dueAt:
      optionalNullableIsoDate(
        record.dueAt,
        "dueAt",
      ),
    confidence:
      optionalConfidence(
        record.confidence,
      ),
    relatedResponsibilityIds:
      relatedIds(
        record.relatedResponsibilityIds,
      ),
    actor:
      optionalString(
        record.actor,
        "actor",
        128,
      ),
    reason:
      optionalString(
        record.reason,
        "reason",
        1000,
      ),
  };
}

export function parseTransitionResponsibility(
  value: unknown,
): TransitionResponsibilityInput {
  const record =
    objectValue(value);

  const state =
    requiredString(
      record.state,
      "state",
      64,
    ) as ResponsibilityState;

  if (
    !STATES.has(state)
  ) {
    throw new Error(
      `Unsupported state: ${state}`,
    );
  }

  return {
    state,
    actor:
      optionalString(
        record.actor,
        "actor",
        128,
      ),
    reason:
      requiredString(
        record.reason,
        "reason",
        1000,
      ),
  };
}
