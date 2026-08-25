import type {
  WorldStateRecord,
  WorldStateJsonValue,
} from "../worldState";
import type {
  WorldModelTemporalObservation,
} from "./temporalTypes";
import {
  normalizeWorldModelEntityId,
} from "./validation";

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
      "world model temporal confidence must be between 0 and 1.",
    );
  }

  return value;
}

function cloneJsonValue(
  value: WorldStateJsonValue,
): WorldStateJsonValue {
  return structuredClone(value);
}

export function createWorldModelTemporalObservation(
  input: {
    id: string;
    entityId: string;
    stateKey: string;
    value: WorldStateJsonValue;
    observedAt: string;
    confidence?: number;
    evidenceEventIds?: string[];
    evidenceWorldStateKeys?: string[];
  },
): WorldModelTemporalObservation {
  const id = input.id.trim();
  const stateKey =
    input.stateKey.trim().toLowerCase();

  if (!id) {
    throw new Error(
      "world model temporal observation id must not be empty.",
    );
  }

  if (!stateKey) {
    throw new Error(
      "world model temporal stateKey must not be empty.",
    );
  }

  return {
    id,
    entityId:
      normalizeWorldModelEntityId(
        input.entityId,
      ),
    stateKey,
    value:
      cloneJsonValue(input.value),
    observedAt:
      requireTimestamp(
        input.observedAt,
        "worldModelTemporalObservation.observedAt",
      ),
    confidence:
      requireConfidence(
        input.confidence ?? 0.5,
      ),
    evidenceEventIds:
      normalizeList(
        input.evidenceEventIds,
      ),
    evidenceWorldStateKeys:
      normalizeList(
        input.evidenceWorldStateKeys,
      ),
  };
}

export function temporalObservationFromWorldState(
  entityId: string,
  record: WorldStateRecord,
): WorldModelTemporalObservation {
  return createWorldModelTemporalObservation({
    id:
      `temporal:${entityId}:${record.key}:${record.observedAt}`,
    entityId,
    stateKey:
      record.key,
    value:
      record.value,
    observedAt:
      record.observedAt,
    confidence:
      record.confidence,
    evidenceEventIds:
      record.provenance?.eventId
        ? [
            record.provenance.eventId,
          ]
        : [],
    evidenceWorldStateKeys: [
      record.key,
    ],
  });
}
