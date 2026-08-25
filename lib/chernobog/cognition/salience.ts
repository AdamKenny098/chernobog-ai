import { assessWorldStateEvidence } from "../worldState";
import type { WorldStateJsonValue, WorldStateRecord } from "../worldState";
import type {
  CognitiveAttentionSignal,
  CognitiveSalienceBand,
  CognitiveSaliencePolicy,
  CognitiveSalienceReason,
  WorldStateChange,
} from "./types";

export const DEFAULT_COGNITIVE_SALIENCE_POLICY: CognitiveSaliencePolicy = {
  baseScore: 8,
  namespaceWeights: {
    service: 12,
    runtime: 10,
    model: 8,
    project: 8,
    backup: 12,
    storage: 12,
    execution: 8,
    desktop: 4,
    system: 10,
    repository: 8,
  },
  stateChangeWeight: 15,
  criticalStateWeight: 55,
  degradedStateWeight: 30,
  recoveryStateWeight: 20,
  staleEvidenceWeight: 15,
  agingEvidenceWeight: 6,
  unknownFreshnessWeight: 4,
  confidenceFloorMultiplier: 0.5,
};

const CRITICAL_TERMS = new Set([
  "failed",
  "failure",
  "offline",
  "critical",
  "corrupt",
  "corrupted",
  "unavailable",
  "error",
  "fatal",
]);

const DEGRADED_TERMS = new Set([
  "degraded",
  "warning",
  "warn",
  "dirty",
  "stale",
  "unhealthy",
]);

const POSITIVE_TERMS = new Set([
  "healthy",
  "recovered",
  "online",
  "available",
  "completed",
  "complete",
  "passed",
  "success",
  "successful",
  "clean",
]);

const BAND_ORDER: Record<CognitiveSalienceBand, number> = {
  none: 0,
  low: 1,
  normal: 2,
  high: 3,
  critical: 4,
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function salienceBandForScore(score: number): CognitiveSalienceBand {
  const normalized = clampScore(score);
  if (normalized >= 85) return "critical";
  if (normalized >= 65) return "high";
  if (normalized >= 40) return "normal";
  if (normalized >= 20) return "low";
  return "none";
}

export function compareSalienceBands(
  left: CognitiveSalienceBand,
  right: CognitiveSalienceBand,
): number {
  return BAND_ORDER[left] - BAND_ORDER[right];
}

function normalizeToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function collectTokens(value: WorldStateJsonValue, path = ""): string[] {
  if (typeof value === "string") {
    return value
      .split(/[\s,/:._-]+/)
      .map(normalizeToken)
      .filter(Boolean);
  }

  if (typeof value === "boolean") {
    if (
      path.endsWith("available") ||
      path.endsWith("online") ||
      path.endsWith("healthy") ||
      path.endsWith("success")
    ) {
      return [value ? "available" : "unavailable"];
    }
    if (path.endsWith("dirty")) {
      return [value ? "dirty" : "clean"];
    }
    return [];
  }

  if (value === null || typeof value === "number") return [];

  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectTokens(entry, path));
  }

  const relevantKeys = new Set([
    "status",
    "health",
    "state",
    "available",
    "online",
    "dirty",
    "success",
    "result",
  ]);

  return Object.entries(value)
    .filter(([key]) => relevantKeys.has(key.toLowerCase()))
    .flatMap(([key, entry]) => collectTokens(entry, key.toLowerCase()));
}

function semanticState(record: WorldStateRecord): {
  critical: boolean;
  degraded: boolean;
  positive: boolean;
} {
  const tokens = new Set(collectTokens(record.value, record.key.toLowerCase()));
  return {
    critical: [...tokens].some((token) => CRITICAL_TERMS.has(token)),
    degraded: [...tokens].some((token) => DEGRADED_TERMS.has(token)),
    positive: [...tokens].some((token) => POSITIVE_TERMS.has(token)),
  };
}

function recordsDiffer(
  previous: WorldStateRecord | undefined,
  current: WorldStateRecord,
): boolean {
  if (!previous) return true;
  return JSON.stringify(previous.value) !== JSON.stringify(current.value);
}

function addReason(
  reasons: CognitiveSalienceReason[],
  code: CognitiveSalienceReason["code"],
  weight: number,
  detail: string,
): number {
  reasons.push({ code, weight, detail });
  return weight;
}

export function assessWorldStateSalience(
  change: WorldStateChange,
  options: { now?: Date; policy?: CognitiveSaliencePolicy } = {},
): CognitiveAttentionSignal {
  const now = options.now ?? new Date();
  const policy = options.policy ?? DEFAULT_COGNITIVE_SALIENCE_POLICY;
  const current = structuredClone(change.current);
  const previous = change.previous ? structuredClone(change.previous) : undefined;
  const assessment = assessWorldStateEvidence(current, now);
  const reasons: CognitiveSalienceReason[] = [];
  let rawScore = policy.baseScore;

  const domainWeight = policy.namespaceWeights[current.namespace] ?? 0;
  if (domainWeight > 0) {
    rawScore += addReason(
      reasons,
      "domain-priority",
      domainWeight,
      `Baseline attention weight for ${current.namespace} facts.`,
    );
  }

  const changed = recordsDiffer(previous, current);
  if (changed) {
    rawScore += addReason(
      reasons,
      "state-changed",
      policy.stateChangeWeight,
      previous
        ? "The current fact differs from its previous value."
        : "A new current fact entered World State.",
    );
  }

  const currentSemantic = semanticState(current);
  const previousSemantic = previous ? semanticState(previous) : undefined;

  if (currentSemantic.critical) {
    rawScore += addReason(
      reasons,
      "critical-state",
      policy.criticalStateWeight,
      "The current fact contains a failure, offline, corruption, or unavailable state.",
    );
  } else if (currentSemantic.degraded) {
    rawScore += addReason(
      reasons,
      "degraded-state",
      policy.degradedStateWeight,
      "The current fact indicates degraded, warning, dirty, stale, or unhealthy state.",
    );
  }

  if (
    previousSemantic &&
    (previousSemantic.critical || previousSemantic.degraded) &&
    currentSemantic.positive
  ) {
    rawScore += addReason(
      reasons,
      "recovery-state",
      policy.recoveryStateWeight,
      "The fact recovered from a previously negative state.",
    );
  }

  switch (assessment.freshness.status) {
    case "stale":
      rawScore += addReason(
        reasons,
        "stale-evidence",
        policy.staleEvidenceWeight,
        "The evidence behind this fact is stale.",
      );
      break;
    case "aging":
      rawScore += addReason(
        reasons,
        "aging-evidence",
        policy.agingEvidenceWeight,
        "The evidence behind this fact is approaching expiry.",
      );
      break;
    case "unknown":
      rawScore += addReason(
        reasons,
        "unknown-freshness",
        policy.unknownFreshnessWeight,
        "The fact has no explicit freshness horizon.",
      );
      break;
    case "fresh":
      break;
  }

  if (current.confidence < 0.5) {
    addReason(
      reasons,
      "low-confidence",
      0,
      "The evidence confidence is below 0.5, so salience is dampened.",
    );
  }

  const confidenceMultiplier =
    policy.confidenceFloorMultiplier +
    (1 - policy.confidenceFloorMultiplier) * current.confidence;

  const score = clampScore(rawScore * confidenceMultiplier);

  return {
    id: `attention:${current.key}:${current.observedAt}`,
    key: current.key,
    generatedAt: now.toISOString(),
    score,
    band: salienceBandForScore(score),
    reasons,
    changed,
    record: current,
    assessment,
  };
}
