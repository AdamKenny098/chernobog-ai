import type { ChernobogEventSource } from "../events/types";

export const CHERNOBOG_WORLD_STATE_SCHEMA_VERSION = 1 as const;

export type WorldStateJsonPrimitive = string | number | boolean | null;

export type WorldStateJsonValue =
  | WorldStateJsonPrimitive
  | WorldStateJsonValue[]
  | { [key: string]: WorldStateJsonValue };

export type WorldStateFreshnessStatus =
  | "fresh"
  | "aging"
  | "stale"
  | "unknown";

export type WorldStateFreshnessBasis =
  | "explicit-expiry"
  | "event-expiry"
  | "ttl"
  | "none";

export interface WorldStateFreshness {
  status: WorldStateFreshnessStatus;
  basis: WorldStateFreshnessBasis;
  expiresAt?: string;
  ttlMs?: number;
  evaluatedAt: string;
}

export type WorldStateConfidenceBasis =
  | "projector"
  | "event"
  | "record"
  | "default";

export type WorldStateConfidenceBand = "high" | "medium" | "low";

export type WorldStateProvenanceStatus =
  | "complete"
  | "partial"
  | "absent";

export interface WorldStateProvenance {
  eventId?: string;
  eventType?: string;
  eventOccurredAt?: string;
  eventReceivedAt?: string;
  projectorId?: string;
  correlationId?: string;
  causationId?: string;
  subject?: string;
  scope?: string;
  source?: ChernobogEventSource;
}

export interface WorldStateRecord<
  TValue extends WorldStateJsonValue = WorldStateJsonValue,
> {
  schemaVersion: typeof CHERNOBOG_WORLD_STATE_SCHEMA_VERSION;
  key: string;
  namespace: string;
  value: TValue;
  observedAt: string;
  updatedAt: string;
  confidence: number;
  confidenceBasis: WorldStateConfidenceBasis;
  freshness: WorldStateFreshness;
  provenance?: WorldStateProvenance;
}

export interface WorldStateRecordInput<
  TValue extends WorldStateJsonValue = WorldStateJsonValue,
> {
  key: string;
  namespace?: string;
  value: TValue;
  observedAt?: string;
  updatedAt?: string;
  confidence?: number;
  confidenceBasis?: WorldStateConfidenceBasis;
  expiresAt?: string;
  freshnessBasis?: WorldStateFreshnessBasis;
  freshnessTtlMs?: number;
  provenance?: WorldStateProvenance;
}

export interface WorldStateQuery {
  namespace?: string;
  keyPrefix?: string;
  freshness?: WorldStateFreshnessStatus[];
  minConfidence?: number;
}

export interface WorldStateUpsertResult<
  TValue extends WorldStateJsonValue = WorldStateJsonValue,
> {
  record: WorldStateRecord<TValue>;
  applied: boolean;
  reason: "created" | "updated" | "older-observation" | "same-observation";
}

export interface WorldStateEvidenceAssessment {
  key: string;
  observedAt: string;
  ageMs: number;
  confidence: number;
  confidenceBasis: WorldStateConfidenceBasis;
  confidenceBand: WorldStateConfidenceBand;
  freshness: WorldStateFreshness;
  provenanceStatus: WorldStateProvenanceStatus;
  eventId?: string;
  eventType?: string;
  projectorId?: string;
  sourceSubsystem?: string;
}
