import {
  getChernobogWorldModelRuntime,
  type WorldModelCausalHypothesis,
  type WorldModelEntity,
  type WorldModelRelationship,
  type WorldModelStatePrediction,
} from "@/lib/chernobog/worldModel";
import {
  ChernobogWorldStateQueryService,
  getChernobogWorldStateRuntime,
} from "@/lib/chernobog/worldState";

const MAX_ENTITIES = 16;
const MAX_RELATIONSHIPS = 16;
const MAX_PREDICTIONS = 10;
const MAX_CAUSAL_HYPOTHESES = 8;
const MAX_HISTORICAL_ITEMS_PER_SECTION = 4;
const MAX_ATTRIBUTES_CHARS = 500;

type EvidenceFreshness =
  | "fresh"
  | "aging"
  | "mixed"
  | "stale"
  | "unknown";

interface FreshnessEvidence {
  itemFreshness: EvidenceFreshness;
  worldStateKeys: readonly string[];
}

interface ScoredItem<T> extends FreshnessEvidence {
  item: T;
  observedAt: string;
  stableId: string;
}

export interface ChernobogWorldModelContext {
  status: "available" | "empty" | "unavailable";
  entityCount: number;
  relationshipCount: number;
  predictionCount: number;
  causalHypothesisCount: number;
  systemText: string;
}

function serializeValue(value: unknown): string {
  let rendered: string;

  try {
    rendered =
      typeof value === "string"
        ? value
        : JSON.stringify(value);
  } catch {
    rendered = String(value);
  }

  if (rendered.length <= MAX_ATTRIBUTES_CHARS) {
    return rendered;
  }

  return `${rendered.slice(0, MAX_ATTRIBUTES_CHARS)}...[value truncated]`;
}

function evidenceText(input: {
  eventIds?: readonly string[];
  worldStateKeys?: readonly string[];
  lessonKeys?: readonly string[];
}): string {
  const parts: string[] = [];

  if (input.worldStateKeys?.length) {
    parts.push(
      `worldStateKeys=${input.worldStateKeys.join(",")}`,
    );
  }

  if (input.eventIds?.length) {
    parts.push(
      `eventIds=${input.eventIds.join(",")}`,
    );
  }

  if (input.lessonKeys?.length) {
    parts.push(
      `lessonKeys=${input.lessonKeys.join(",")}`,
    );
  }

  return parts.length > 0
    ? parts.join("; ")
    : "none";
}

function freshnessRank(
  freshness: EvidenceFreshness,
): number {
  switch (freshness) {
    case "fresh":
      return 0;
    case "aging":
      return 1;
    case "mixed":
      return 2;
    case "unknown":
      return 3;
    case "stale":
      return 4;
    default:
      return 5;
  }
}

function classifyEvidenceFreshness(
  worldStateKeys: readonly string[] | undefined,
  freshnessByKey: ReadonlyMap<string, string>,
): EvidenceFreshness {
  if (!worldStateKeys?.length) {
    return "unknown";
  }

  const statuses = worldStateKeys
    .map((key) => freshnessByKey.get(key) ?? "unknown");

  const unique = new Set(statuses);

  if (unique.size === 1) {
    const only = statuses[0];

    if (
      only === "fresh" ||
      only === "aging" ||
      only === "stale"
    ) {
      return only;
    }

    return "unknown";
  }

  if (
    statuses.some(
      (status) =>
        status === "fresh" ||
        status === "aging",
    )
  ) {
    return "mixed";
  }

  if (statuses.every((status) => status === "stale")) {
    return "stale";
  }

  return "unknown";
}

function compareScored<T>(
  left: ScoredItem<T>,
  right: ScoredItem<T>,
): number {
  const freshness =
    freshnessRank(left.itemFreshness) -
    freshnessRank(right.itemFreshness);

  if (freshness !== 0) {
    return freshness;
  }

  const observed =
    Date.parse(right.observedAt) -
    Date.parse(left.observedAt);

  if (observed !== 0) {
    return observed;
  }

  return left.stableId.localeCompare(right.stableId);
}

function selectBounded<T>(
  items: ScoredItem<T>[],
  maximum: number,
): ScoredItem<T>[] {
  const sorted = items.slice().sort(compareScored);
  const current = sorted
    .filter(
      (entry) =>
        entry.itemFreshness === "fresh" ||
        entry.itemFreshness === "aging" ||
        entry.itemFreshness === "mixed",
    )
    .slice(0, maximum);

  if (current.length >= maximum) {
    return current;
  }

  const historical = sorted
    .filter(
      (entry) =>
        entry.itemFreshness === "stale" ||
        entry.itemFreshness === "unknown",
    )
    .slice(
      0,
      Math.min(
        maximum - current.length,
        MAX_HISTORICAL_ITEMS_PER_SECTION,
      ),
    );

  return [...current, ...historical];
}

function formatEntity(
  entry: ScoredItem<WorldModelEntity>,
): string {
  const entity = entry.item;

  return [
    `- entity: ${entity.id}`,
    `  kind: ${entity.kind}`,
    `  label: ${entity.label}`,
    `  observedAt: ${entity.observedAt}`,
    `  sourceFreshness: ${entry.itemFreshness}`,
    `  confidence: ${entity.confidence.toFixed(2)}`,
    `  attributes: ${serializeValue(entity.attributes)}`,
    `  evidence: ${evidenceText(entity.evidence)}`,
  ].join("\n");
}

function formatRelationship(
  entry: ScoredItem<WorldModelRelationship>,
): string {
  const relationship = entry.item;

  return [
    `- relationship: ${relationship.id}`,
    `  type: ${relationship.type}`,
    `  from: ${relationship.fromEntityId}`,
    `  to: ${relationship.toEntityId}`,
    `  directed: ${relationship.directed}`,
    `  observedAt: ${relationship.observedAt}`,
    `  sourceFreshness: ${entry.itemFreshness}`,
    `  confidence: ${relationship.confidence.toFixed(2)}`,
    `  attributes: ${serializeValue(relationship.attributes)}`,
    `  evidence: ${evidenceText(relationship.evidence)}`,
  ].join("\n");
}

function formatPrediction(
  prediction: WorldModelStatePrediction,
  sourceFreshness: EvidenceFreshness,
): string {
  return [
    `- prediction: ${prediction.id}`,
    `  entity: ${prediction.entityId}`,
    `  stateKey: ${prediction.stateKey}`,
    `  status: ${prediction.status}`,
    `  sourceFreshness: ${sourceFreshness}`,
    `  confidence: ${prediction.confidence.toFixed(2)}`,
    `  sampleCount: ${prediction.sampleCount}`,
    `  generatedAt: ${prediction.generatedAt}`,
    `  currentValue: ${serializeValue(prediction.currentValue)}`,
    `  predictedNextValue: ${prediction.predictedNextValue === undefined ? "none" : serializeValue(prediction.predictedNextValue)}`,
    `  predictedProbability: ${prediction.predictedProbability ?? "none"}`,
    `  evidenceTransitionIds: ${prediction.evidenceTransitionIds.join(",") || "none"}`,
  ].join("\n");
}

function formatCausalHypothesis(
  hypothesis: WorldModelCausalHypothesis,
  sourceFreshness: EvidenceFreshness,
): string {
  return [
    `- causalHypothesis: ${hypothesis.id}`,
    `  cause: ${hypothesis.causeEntityId}`,
    `  effect: ${hypothesis.effectEntityId}`,
    `  status: ${hypothesis.status}`,
    `  sourceFreshness: ${sourceFreshness}`,
    `  confidence: ${hypothesis.confidence.toFixed(2)}`,
    `  supportCount: ${hypothesis.supportCount}`,
    `  contradictionCount: ${hypothesis.contradictionCount}`,
    `  firstObservedAt: ${hypothesis.firstObservedAt ?? "unknown"}`,
    `  lastObservedAt: ${hypothesis.lastObservedAt ?? "unknown"}`,
  ].join("\n");
}

function combineFreshness(
  left: EvidenceFreshness | undefined,
  right: EvidenceFreshness | undefined,
): EvidenceFreshness {
  const values = [left ?? "unknown", right ?? "unknown"];

  if (values.every((value) => value === "fresh")) {
    return "fresh";
  }

  if (
    values.every(
      (value) =>
        value === "fresh" ||
        value === "aging",
    )
  ) {
    return values.includes("aging") ? "aging" : "fresh";
  }

  if (
    values.some(
      (value) =>
        value === "fresh" ||
        value === "aging" ||
        value === "mixed",
    )
  ) {
    return "mixed";
  }

  if (values.every((value) => value === "stale")) {
    return "stale";
  }

  return "unknown";
}

export async function buildChernobogWorldModelContext():
  Promise<ChernobogWorldModelContext> {
  try {
    const runtime =
      await getChernobogWorldModelRuntime();

    runtime.ingestCurrentWorldState();

    const snapshot = runtime.model.snapshot();

    const worldStateRuntime =
      await getChernobogWorldStateRuntime();
    const worldStateQuery =
      new ChernobogWorldStateQueryService(
        worldStateRuntime.engine.worldState,
      );
    const worldStateResult =
      worldStateQuery.read({}, "registry");
    const freshnessByKey = new Map(
      worldStateResult.items.map((entry) => [
        entry.record.key,
        entry.assessment.freshness.status,
      ]),
    );

    const scoredEntities =
      snapshot.graph.entities.map((entity) => ({
        item: entity,
        itemFreshness: classifyEvidenceFreshness(
          entity.evidence.worldStateKeys,
          freshnessByKey,
        ),
        worldStateKeys:
          entity.evidence.worldStateKeys ?? [],
        observedAt: entity.observedAt,
        stableId: entity.id,
      } satisfies ScoredItem<WorldModelEntity>));

    const freshnessByEntityId = new Map(
      scoredEntities.map((entry) => [
        entry.item.id,
        entry.itemFreshness,
      ]),
    );

    const scoredRelationships =
      snapshot.graph.relationships.map(
        (relationship) => ({
          item: relationship,
          itemFreshness: classifyEvidenceFreshness(
            relationship.evidence.worldStateKeys,
            freshnessByKey,
          ),
          worldStateKeys:
            relationship.evidence.worldStateKeys ?? [],
          observedAt: relationship.observedAt,
          stableId: relationship.id,
        } satisfies ScoredItem<WorldModelRelationship>),
      );

    const entities =
      selectBounded(
        scoredEntities,
        MAX_ENTITIES,
      );

    const relationships =
      selectBounded(
        scoredRelationships,
        MAX_RELATIONSHIPS,
      );

    const supportedPredictions =
      snapshot.predictions
        .filter(
          (prediction) =>
            prediction.status !== "insufficient" &&
            prediction.confidence > 0,
        )
        .map((prediction) => ({
          prediction,
          sourceFreshness:
            freshnessByEntityId.get(
              prediction.entityId,
            ) ?? "unknown" as EvidenceFreshness,
        }))
        .filter(
          (entry) =>
            entry.sourceFreshness === "fresh" ||
            entry.sourceFreshness === "aging" ||
            entry.sourceFreshness === "mixed",
        )
        .sort((left, right) =>
          right.prediction.generatedAt.localeCompare(
            left.prediction.generatedAt,
          ),
        )
        .slice(0, MAX_PREDICTIONS);

    const suppressedPredictionCount =
      snapshot.predictions.length -
      supportedPredictions.length;

    const causalHypotheses =
      snapshot.causalHypotheses
        .map((hypothesis) => ({
          hypothesis,
          sourceFreshness: combineFreshness(
            freshnessByEntityId.get(
              hypothesis.causeEntityId,
            ),
            freshnessByEntityId.get(
              hypothesis.effectEntityId,
            ),
          ),
        }))
        .sort((left, right) => {
          const freshness =
            freshnessRank(left.sourceFreshness) -
            freshnessRank(right.sourceFreshness);

          if (freshness !== 0) {
            return freshness;
          }

          return right.hypothesis.confidence -
            left.hypothesis.confidence;
        })
        .slice(0, MAX_CAUSAL_HYPOTHESES);

    const hasEvidence =
      entities.length > 0 ||
      relationships.length > 0 ||
      supportedPredictions.length > 0 ||
      causalHypotheses.length > 0;

    if (!hasEvidence) {
      return {
        status: "empty",
        entityCount: 0,
        relationshipCount: 0,
        predictionCount: 0,
        causalHypothesisCount: 0,
        systemText: [
          "Canonical World Model (11J, derived/read-only evidence):",
          "- No substantive World Model entities, relationships, predictions, or causal hypotheses are currently available.",
          "- Do not invent World Model relationships from Project Operations or general reasoning.",
        ].join("\n"),
      };
    }

    const sections: string[] = [
      "Canonical World Model (11J, derived/read-only evidence):",
      `- generatedAt: ${snapshot.generatedAt}`,
      `- entities: ${snapshot.graph.entities.length}`,
      `- relationships: ${snapshot.graph.relationships.length}`,
      `- predictions: ${snapshot.predictions.length}`,
      `- causal hypotheses: ${snapshot.causalHypotheses.length}`,
      `- unsupported/stale predictions suppressed from current evidence: ${suppressedPredictionCount}`,
      "- Source of truth remains 11G World State. World Model entities and relationships are derived representations, not permissions or executable actions.",
      "- sourceFreshness is derived from the canonical 11G evidence keys supporting each 11J item.",
      "- fresh evidence may support current-state claims; aging evidence must be qualified; mixed evidence spans current and historical support.",
      "- stale and unknown evidence is historical/uncertain only. Never describe its state value as current, pending now, waiting now, failed now, or completed now.",
      "- Predictions and causal hypotheses are not facts. Preserve their status, confidence, samples, and evidence when reasoning.",
      "- Predictions with status=insufficient, confidence=0, or stale-only support are not presented as supported predictions.",
      "- Only relationships explicitly listed below may be attributed to the World Model. Plausible but absent relationships must be labelled as inference.",
    ];

    if (entities.length > 0) {
      sections.push(
        "",
        "World Model entities (current evidence first; historical tail explicitly labelled):",
        ...entities.map(formatEntity),
      );
    }

    if (relationships.length > 0) {
      sections.push(
        "",
        "World Model relationships (current evidence first; historical tail explicitly labelled):",
        ...relationships.map(formatRelationship),
      );
    }

    if (supportedPredictions.length > 0) {
      sections.push(
        "",
        "World Model supported predictions:",
        ...supportedPredictions.map((entry) =>
          formatPrediction(
            entry.prediction,
            entry.sourceFreshness,
          ),
        ),
      );
    } else {
      sections.push(
        "",
        "World Model supported predictions:",
        "- none currently supported by non-stale evidence and nonzero confidence.",
      );
    }

    if (causalHypotheses.length > 0) {
      sections.push(
        "",
        "World Model causal hypotheses:",
        ...causalHypotheses.map((entry) =>
          formatCausalHypothesis(
            entry.hypothesis,
            entry.sourceFreshness,
          ),
        ),
      );
    }

    return {
      status: "available",
      entityCount: snapshot.graph.entities.length,
      relationshipCount: snapshot.graph.relationships.length,
      predictionCount: snapshot.predictions.length,
      causalHypothesisCount: snapshot.causalHypotheses.length,
      systemText: sections.join("\n"),
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    return {
      status: "unavailable",
      entityCount: 0,
      relationshipCount: 0,
      predictionCount: 0,
      causalHypothesisCount: 0,
      systemText: [
        "Canonical World Model (11J, derived/read-only evidence):",
        "- World Model is currently unavailable.",
        `- reason: ${message}`,
        "- Do not invent replacement entities, relationships, predictions, or causal hypotheses.",
      ].join("\n"),
    };
  }
}
