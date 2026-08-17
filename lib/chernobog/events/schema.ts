import { randomUUID } from "node:crypto";

import {
  CHERNOBOG_EVENT_SCHEMA_VERSION,
  ChernobogEvent,
  ChernobogEventInput,
} from "./types";

const EVENT_TYPE_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)+$/;

function requireNonEmpty(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${field} must not be empty.`);
  }
  return normalized;
}

function requireIsoTimestamp(value: string, field: string): string {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    throw new Error(`${field} must be a valid timestamp.`);
  }
  return timestamp.toISOString();
}

function normalizeOptional(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeTags(tags: string[] | undefined): string[] | undefined {
  if (!tags) {
    return undefined;
  }

  const normalized = [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
  return normalized.length > 0 ? normalized : undefined;
}

export function createChernobogEvent<TPayload>(
  input: ChernobogEventInput<TPayload>,
  receivedAt = new Date(),
): ChernobogEvent<TPayload> {
  const type = requireNonEmpty(input.type, "event.type");
  if (!EVENT_TYPE_PATTERN.test(type)) {
    throw new Error(
      "event.type must be a lowercase namespaced identifier such as project.test_failed.",
    );
  }

  const subsystem = requireNonEmpty(input.source.subsystem, "event.source.subsystem");
  const receivedAtIso = receivedAt.toISOString();
  const occurredAt = input.occurredAt
    ? requireIsoTimestamp(input.occurredAt, "event.occurredAt")
    : receivedAtIso;

  const confidence = input.metadata?.confidence;
  if (confidence !== undefined && (confidence < 0 || confidence > 1)) {
    throw new Error("event.metadata.confidence must be between 0 and 1.");
  }

  const expiresAt = input.metadata?.expiresAt
    ? requireIsoTimestamp(input.metadata.expiresAt, "event.metadata.expiresAt")
    : undefined;

  return {
    id: randomUUID(),
    type,
    occurredAt,
    receivedAt: receivedAtIso,
    source: {
      subsystem,
      nodeId: normalizeOptional(input.source.nodeId),
      instanceId: normalizeOptional(input.source.instanceId),
    },
    severity: input.severity ?? "info",
    subject: normalizeOptional(input.subject),
    scope: normalizeOptional(input.scope),
    correlationId: normalizeOptional(input.correlationId),
    causationId: normalizeOptional(input.causationId),
    dedupeKey: normalizeOptional(input.dedupeKey),
    payload: input.payload,
    metadata: {
      schemaVersion: CHERNOBOG_EVENT_SCHEMA_VERSION,
      confidence,
      tags: normalizeTags(input.metadata?.tags),
      expiresAt,
      sensitive: input.metadata?.sensitive,
    },
  };
}
