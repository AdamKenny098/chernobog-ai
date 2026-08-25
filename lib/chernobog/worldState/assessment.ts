import { getWorldStateConfidenceBand } from "./confidence";
import { buildWorldStateFreshness } from "./freshness";
import { getWorldStateProvenanceStatus } from "./provenance";
import type {
  WorldStateEvidenceAssessment,
  WorldStateRecord,
} from "./types";

export function assessWorldStateEvidence(
  record: WorldStateRecord,
  now = new Date(),
): WorldStateEvidenceAssessment {
  const observedAtMs = new Date(record.observedAt).getTime();

  if (Number.isNaN(observedAtMs)) {
    throw new Error(
      "worldState.observedAt must be a valid timestamp.",
    );
  }

  return {
    key: record.key,
    observedAt: record.observedAt,
    ageMs: Math.max(0, now.getTime() - observedAtMs),
    confidence: record.confidence,
    confidenceBasis: record.confidenceBasis,
    confidenceBand: getWorldStateConfidenceBand(
      record.confidence,
    ),
    freshness: buildWorldStateFreshness(
      {
        observedAt: record.observedAt,
        expiresAt: record.freshness.expiresAt,
        basis: record.freshness.basis,
        ttlMs: record.freshness.ttlMs,
      },
      { now },
    ),
    provenanceStatus: getWorldStateProvenanceStatus(
      record.provenance,
    ),
    eventId: record.provenance?.eventId,
    eventType: record.provenance?.eventType,
    projectorId: record.provenance?.projectorId,
    sourceSubsystem: record.provenance?.source?.subsystem,
  };
}
