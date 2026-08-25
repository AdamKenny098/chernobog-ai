import type {
  WorldStateConfidenceBand,
  WorldStateConfidenceBasis,
} from "./types";

export function normalizeWorldStateConfidence(
  confidence: number,
): number {
  if (
    !Number.isFinite(confidence) ||
    confidence < 0 ||
    confidence > 1
  ) {
    throw new Error(
      "worldState.confidence must be between 0 and 1.",
    );
  }

  return confidence;
}

export function getWorldStateConfidenceBand(
  confidence: number,
): WorldStateConfidenceBand {
  const normalized = normalizeWorldStateConfidence(confidence);

  if (normalized >= 0.8) {
    return "high";
  }

  if (normalized >= 0.5) {
    return "medium";
  }

  return "low";
}

export function resolveWorldStateConfidenceBasis(
  confidence: number | undefined,
  requestedBasis: WorldStateConfidenceBasis | undefined,
): WorldStateConfidenceBasis {
  if (requestedBasis) {
    return requestedBasis;
  }

  return confidence === undefined ? "default" : "record";
}
