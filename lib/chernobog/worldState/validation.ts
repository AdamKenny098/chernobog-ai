import {
  getWorldStateNamespace,
  isValidWorldStateIdentifier,
  isValidWorldStateKey,
} from "./keys";
import {
  buildWorldStateFreshness,
  normalizeWorldStateTtlMs,
} from "./freshness";
import {
  normalizeWorldStateConfidence,
  resolveWorldStateConfidenceBasis,
} from "./confidence";
import {
  CHERNOBOG_WORLD_STATE_SCHEMA_VERSION,
  type WorldStateJsonValue,
  type WorldStateProvenance,
  type WorldStateRecord,
  type WorldStateRecordInput,
} from "./types";

function requireIsoTimestamp(
  value: string,
  field: string,
): string {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    throw new Error(`${field} must be a valid timestamp.`);
  }
  return timestamp.toISOString();
}

function normalizeOptional(
  value: string | undefined,
): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function assertJsonSafeValue(
  value: unknown,
  path = "worldState.value",
): asserts value is WorldStateJsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`${path} numbers must be finite.`);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertJsonSafeValue(entry, `${path}[${index}]`),
    );
    return;
  }

  if (typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      assertJsonSafeValue(entry, `${path}.${key}`);
    }
    return;
  }

  throw new Error(`${path} must be JSON-safe.`);
}

function cloneJsonValue<
  TValue extends WorldStateJsonValue,
>(
  value: TValue,
): TValue {
  assertJsonSafeValue(value);
  return structuredClone(value);
}

function normalizeProvenance(
  provenance: WorldStateProvenance | undefined,
): WorldStateProvenance | undefined {
  if (!provenance) {
    return undefined;
  }

  const eventId = normalizeOptional(provenance.eventId);
  const eventType = normalizeOptional(provenance.eventType);
  const projectorId = normalizeOptional(provenance.projectorId);
  const correlationId = normalizeOptional(
    provenance.correlationId,
  );
  const causationId = normalizeOptional(
    provenance.causationId,
  );
  const subject = normalizeOptional(provenance.subject);
  const scope = normalizeOptional(provenance.scope);

  const eventOccurredAt = provenance.eventOccurredAt
    ? requireIsoTimestamp(
        provenance.eventOccurredAt,
        "worldState.provenance.eventOccurredAt",
      )
    : undefined;

  const eventReceivedAt = provenance.eventReceivedAt
    ? requireIsoTimestamp(
        provenance.eventReceivedAt,
        "worldState.provenance.eventReceivedAt",
      )
    : undefined;

  const source = provenance.source
    ? {
        subsystem: provenance.source.subsystem.trim(),
        nodeId: normalizeOptional(provenance.source.nodeId),
        instanceId: normalizeOptional(
          provenance.source.instanceId,
        ),
      }
    : undefined;

  if (source && !source.subsystem) {
    throw new Error(
      "worldState.provenance.source.subsystem must not be empty.",
    );
  }

  if (
    !eventId &&
    !eventType &&
    !projectorId &&
    !correlationId &&
    !causationId &&
    !subject &&
    !scope &&
    !eventOccurredAt &&
    !eventReceivedAt &&
    !source
  ) {
    return undefined;
  }

  return {
    eventId,
    eventType,
    eventOccurredAt,
    eventReceivedAt,
    projectorId,
    correlationId,
    causationId,
    subject,
    scope,
    source,
  };
}

export function createWorldStateRecord<
  TValue extends WorldStateJsonValue,
>(
  input: WorldStateRecordInput<TValue>,
  now = new Date(),
): WorldStateRecord<TValue> {
  const key = input.key.trim();

  if (!isValidWorldStateKey(key)) {
    throw new Error(
      "worldState.key must be a lowercase namespaced identifier such as service.ollama.health.",
    );
  }

  const derivedNamespace = getWorldStateNamespace(key);
  const namespace =
    input.namespace?.trim() || derivedNamespace;

  if (!isValidWorldStateIdentifier(namespace)) {
    throw new Error(
      "worldState.namespace must be a lowercase identifier.",
    );
  }

  if (namespace !== derivedNamespace) {
    throw new Error(
      `worldState.namespace "${namespace}" does not match key namespace "${derivedNamespace}".`,
    );
  }

  const confidence = normalizeWorldStateConfidence(
    input.confidence ?? 1,
  );

  const confidenceBasis =
    resolveWorldStateConfidenceBasis(
      input.confidence,
      input.confidenceBasis,
    );

  const observedAt = input.observedAt
    ? requireIsoTimestamp(
        input.observedAt,
        "worldState.observedAt",
      )
    : now.toISOString();

  const updatedAt = input.updatedAt
    ? requireIsoTimestamp(
        input.updatedAt,
        "worldState.updatedAt",
      )
    : now.toISOString();

  const expiresAt = input.expiresAt
    ? requireIsoTimestamp(
        input.expiresAt,
        "worldState.expiresAt",
      )
    : undefined;

  const freshnessTtlMs = normalizeWorldStateTtlMs(
    input.freshnessTtlMs,
  );

  if (
    expiresAt &&
    new Date(expiresAt).getTime() <
      new Date(observedAt).getTime()
  ) {
    throw new Error(
      "worldState.expiresAt must not be earlier than worldState.observedAt.",
    );
  }

  return {
    schemaVersion: CHERNOBOG_WORLD_STATE_SCHEMA_VERSION,
    key,
    namespace,
    value: cloneJsonValue(input.value),
    observedAt,
    updatedAt,
    confidence,
    confidenceBasis,
    freshness: buildWorldStateFreshness(
      {
        observedAt,
        expiresAt,
        basis: input.freshnessBasis,
        ttlMs: freshnessTtlMs,
      },
      { now },
    ),
    provenance: normalizeProvenance(input.provenance),
  };
}

export function assertWorldStateRecord(
  value: unknown,
): asserts value is WorldStateRecord {
  if (!value || typeof value !== "object") {
    throw new Error(
      "worldState record must be an object.",
    );
  }

  const record = value as Partial<WorldStateRecord>;

  if (
    record.schemaVersion !==
    CHERNOBOG_WORLD_STATE_SCHEMA_VERSION
  ) {
    throw new Error(
      "worldState record has an unsupported schema version.",
    );
  }

  createWorldStateRecord(
    {
      key: String(record.key ?? ""),
      namespace: record.namespace,
      value: record.value as WorldStateJsonValue,
      observedAt: String(record.observedAt ?? ""),
      updatedAt: String(record.updatedAt ?? ""),
      confidence: record.confidence,
      confidenceBasis: record.confidenceBasis,
      expiresAt: record.freshness?.expiresAt,
      freshnessBasis: record.freshness?.basis,
      freshnessTtlMs: record.freshness?.ttlMs,
      provenance: record.provenance,
    },
    new Date(
      String(
        record.freshness?.evaluatedAt ??
          record.updatedAt ??
          "",
      ),
    ),
  );
}
