import type {
  WorldModelEntity,
  WorldModelEntityInput,
  WorldModelEvidence,
  WorldModelRelationship,
  WorldModelRelationshipInput,
} from "./types";

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

function normalizeEvidence(
  input: Partial<WorldModelEvidence> | undefined,
): WorldModelEvidence {
  return {
    eventIds:
      normalizeList(input?.eventIds),
    worldStateKeys:
      normalizeList(
        input?.worldStateKeys,
      ),
    lessonKeys:
      normalizeList(
        input?.lessonKeys,
      ),
  };
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

function jsonSafe(
  value: Record<string, unknown>,
  field: string,
): Record<string, unknown> {
  try {
    const encoded = JSON.stringify(value);

    if (encoded === undefined) {
      throw new Error("not serializable");
    }

    return JSON.parse(encoded) as Record<
      string,
      unknown
    >;
  } catch {
    throw new Error(
      `${field} must be JSON-safe.`,
    );
  }
}

export function normalizeWorldModelEntityId(
  value: string,
): string {
  const normalized =
    value.trim().toLowerCase();

  if (
    !normalized ||
    !/^[a-z0-9][a-z0-9._:-]*$/.test(
      normalized,
    )
  ) {
    throw new Error(
      "world model entity id must be a canonical lowercase namespaced identifier.",
    );
  }

  return normalized;
}

export function normalizeWorldModelRelationshipType(
  value: string,
): string {
  const normalized =
    value.trim().toLowerCase();

  if (
    !normalized ||
    !/^[a-z0-9][a-z0-9._:-]*$/.test(
      normalized,
    )
  ) {
    throw new Error(
      "world model relationship type must be a canonical lowercase identifier.",
    );
  }

  return normalized;
}

export function buildWorldModelEntity(
  input: WorldModelEntityInput,
): WorldModelEntity {
  const label = input.label.trim();

  if (!label) {
    throw new Error(
      "world model entity label must not be empty.",
    );
  }

  return {
    id:
      normalizeWorldModelEntityId(
        input.id,
      ),
    kind:
      input.kind,
    label,
    aliases:
      normalizeList(
        input.aliases,
      ),
    attributes:
      jsonSafe(
        input.attributes ?? {},
        "worldModelEntity.attributes",
      ),
    confidence:
      requireConfidence(
        input.confidence ?? 0.5,
        "worldModelEntity.confidence",
      ),
    observedAt:
      requireTimestamp(
        input.observedAt,
        "worldModelEntity.observedAt",
      ),
    evidence:
      normalizeEvidence(
        input.evidence,
      ),
  };
}

export function buildWorldModelRelationship(
  input: WorldModelRelationshipInput,
): WorldModelRelationship {
  const type =
    normalizeWorldModelRelationshipType(
      input.type,
    );

  const fromEntityId =
    normalizeWorldModelEntityId(
      input.fromEntityId,
    );

  const toEntityId =
    normalizeWorldModelEntityId(
      input.toEntityId,
    );

  if (
    fromEntityId === toEntityId
  ) {
    throw new Error(
      "world model relationship endpoints must be distinct.",
    );
  }

  const directed =
    input.directed ?? true;

  const endpointKey =
    directed
      ? `${fromEntityId}->${toEntityId}`
      : [
          fromEntityId,
          toEntityId,
        ]
          .sort()
          .join("<->");

  return {
    id:
      `relation:${type}:${endpointKey}`,
    type,
    fromEntityId,
    toEntityId,
    directed,
    confidence:
      requireConfidence(
        input.confidence ?? 0.5,
        "worldModelRelationship.confidence",
      ),
    observedAt:
      requireTimestamp(
        input.observedAt,
        "worldModelRelationship.observedAt",
      ),
    attributes:
      jsonSafe(
        input.attributes ?? {},
        "worldModelRelationship.attributes",
      ),
    evidence:
      normalizeEvidence(
        input.evidence,
      ),
  };
}
