import type {
  WorldStateProvenance,
  WorldStateProvenanceStatus,
} from "./types";

function hasText(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

export function getWorldStateProvenanceStatus(
  provenance: WorldStateProvenance | undefined,
): WorldStateProvenanceStatus {
  if (!provenance) {
    return "absent";
  }

  const hasAny =
    hasText(provenance.eventId) ||
    hasText(provenance.eventType) ||
    hasText(provenance.projectorId) ||
    hasText(provenance.correlationId) ||
    hasText(provenance.causationId) ||
    hasText(provenance.subject) ||
    hasText(provenance.scope) ||
    hasText(provenance.source?.subsystem);

  if (!hasAny) {
    return "absent";
  }

  const complete =
    hasText(provenance.eventId) &&
    hasText(provenance.eventType) &&
    hasText(provenance.projectorId) &&
    hasText(provenance.source?.subsystem);

  return complete ? "complete" : "partial";
}
