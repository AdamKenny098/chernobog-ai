import type { ChernobogEvent } from "../events/types";
import { resolveWorldStateExpiry } from "./freshness";
import type { WorldStateProjection } from "./projectorTypes";
import type {
  WorldStateConfidenceBasis,
  WorldStateFreshnessBasis,
  WorldStateRecordInput,
} from "./types";

export function buildWorldStateInputFromEvent(
  event: ChernobogEvent,
  projection: WorldStateProjection,
  projectorId?: string,
): WorldStateRecordInput {
  const observedAt =
    projection.observedAt ?? event.occurredAt;

  let confidence: number;
  let confidenceBasis: WorldStateConfidenceBasis;

  if (projection.confidence !== undefined) {
    confidence = projection.confidence;
    confidenceBasis = "projector";
  } else if (
    event.metadata.confidence !== undefined
  ) {
    confidence = event.metadata.confidence;
    confidenceBasis = "event";
  } else {
    confidence = 1;
    confidenceBasis = "default";
  }

  let expiresAt: string | undefined;
  let freshnessBasis: WorldStateFreshnessBasis;
  let freshnessTtlMs: number | undefined;

  if (projection.expiresAt) {
    expiresAt = projection.expiresAt;
    freshnessBasis = "explicit-expiry";
  } else if (projection.ttlMs !== undefined) {
    expiresAt = resolveWorldStateExpiry(
      observedAt,
      projection.ttlMs,
    );
    freshnessBasis = "ttl";
    freshnessTtlMs = projection.ttlMs;
  } else if (event.metadata.expiresAt) {
    expiresAt = event.metadata.expiresAt;
    freshnessBasis = "event-expiry";
  } else {
    freshnessBasis = "none";
  }

  return {
    key: projection.key,
    namespace: projection.namespace,
    value: projection.value,
    observedAt,
    confidence,
    confidenceBasis,
    expiresAt,
    freshnessBasis,
    freshnessTtlMs,
    provenance: {
      eventId: event.id,
      eventType: event.type,
      eventOccurredAt: event.occurredAt,
      eventReceivedAt: event.receivedAt,
      projectorId,
      correlationId: event.correlationId,
      causationId: event.causationId,
      subject: event.subject,
      scope: event.scope,
      source: event.source,
    },
  };
}
