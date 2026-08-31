import {
  getChernobogWorldModelRuntime,
  isDependencyRelationship,
  type WorldModelCausalHypothesis,
  type WorldModelEntity,
  type WorldModelImpactAssessment,
  type WorldModelRelationship,
  type WorldModelStatePrediction,
} from "@/lib/chernobog/worldModel";
import {
  ChernobogWorldStateQueryService,
  getChernobogWorldStateRuntime,
} from "@/lib/chernobog/worldState";

const MAX_ENTITIES = 24;
const MAX_RELATIONSHIPS = 24;
const MAX_DEPENDENCY_RELATIONSHIPS = 16;
const MAX_STRUCTURAL_RELATIONSHIPS = 8;
const MAX_STATE_RELATIONSHIPS = 6;
const MAX_IMPACT_ASSESSMENTS = 12;
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

function relationshipPriority(
  relationship: WorldModelRelationship,
): number {
  if (isDependencyRelationship(relationship)) {
    return 0;
  }

  if (relationship.type === "has-role") {
    return 1;
  }

  if (relationship.type === "has-state") {
    return 3;
  }

  return 2;
}

function compareRelationshipScored(
  left: ScoredItem<WorldModelRelationship>,
  right: ScoredItem<WorldModelRelationship>,
): number {
  const freshness =
    freshnessRank(left.itemFreshness) -
    freshnessRank(right.itemFreshness);

  if (freshness !== 0) {
    return freshness;
  }

  const priority =
    relationshipPriority(left.item) -
    relationshipPriority(right.item);

  if (priority !== 0) {
    return priority;
  }

  const observed =
    Date.parse(right.observedAt) -
    Date.parse(left.observedAt);

  if (observed !== 0) {
    return observed;
  }

  return left.stableId.localeCompare(right.stableId);
}

function selectRelationships(
  items: ScoredItem<WorldModelRelationship>[],
): ScoredItem<WorldModelRelationship>[] {
  const current = items
    .filter(
      (entry) =>
        entry.itemFreshness === "fresh" ||
        entry.itemFreshness === "aging" ||
        entry.itemFreshness === "mixed",
    )
    .sort(compareRelationshipScored);

  const dependencies = current
    .filter((entry) =>
      isDependencyRelationship(entry.item),
    )
    .slice(0, MAX_DEPENDENCY_RELATIONSHIPS);

  const structural = current
    .filter(
      (entry) =>
        !isDependencyRelationship(entry.item) &&
        entry.item.type !== "has-state",
    )
    .slice(0, MAX_STRUCTURAL_RELATIONSHIPS);

  const selectedIds = new Set(
    [...dependencies, ...structural].map(
      (entry) => entry.item.id,
    ),
  );

  const stateAttachments = current
    .filter(
      (entry) =>
        entry.item.type === "has-state" &&
        !selectedIds.has(entry.item.id),
    )
    .slice(
      0,
      Math.max(
        0,
        MAX_RELATIONSHIPS -
          dependencies.length -
          structural.length,
      ),
    );

  const selected = [
    ...dependencies,
    ...structural,
    ...stateAttachments,
  ].slice(0, MAX_RELATIONSHIPS);

  if (selected.length >= MAX_RELATIONSHIPS) {
    return selected;
  }

  const selectedSet = new Set(
    selected.map((entry) => entry.item.id),
  );

  const historical = items
    .filter(
      (entry) =>
        !selectedSet.has(entry.item.id) &&
        (
          entry.itemFreshness === "stale" ||
          entry.itemFreshness === "unknown"
        ),
    )
    .sort(compareRelationshipScored)
    .slice(
      0,
      Math.min(
        MAX_RELATIONSHIPS - selected.length,
        MAX_HISTORICAL_ITEMS_PER_SECTION,
      ),
    );

  return [...selected, ...historical];
}

function selectEntitiesForRelationships(
  items: ScoredItem<WorldModelEntity>[],
  relationships:
    readonly ScoredItem<WorldModelRelationship>[],
): ScoredItem<WorldModelEntity>[] {
  const byId = new Map(
    items.map((entry) => [
      entry.item.id,
      entry,
    ]),
  );

  const selected: ScoredItem<WorldModelEntity>[] = [];
  const selectedIds = new Set<string>();

  const add = (
    entry:
      | ScoredItem<WorldModelEntity>
      | undefined,
  ): void => {
    if (
      !entry ||
      selectedIds.has(entry.item.id) ||
      selected.length >= MAX_ENTITIES
    ) {
      return;
    }

    selectedIds.add(entry.item.id);
    selected.push(entry);
  };

  for (const relationship of relationships) {
    add(
      byId.get(
        relationship.item.fromEntityId,
      ),
    );
    add(
      byId.get(
        relationship.item.toEntityId,
      ),
    );
  }

  for (
    const entry of items
      .slice()
      .sort(compareScored)
  ) {
    add(entry);

    if (selected.length >= MAX_ENTITIES) {
      break;
    }
  }

  return selected;
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

function formatImpactAssessment(
  assessment: WorldModelImpactAssessment,
): string {
  const paths =
    assessment.dependencyPaths.length > 0
      ? assessment.dependencyPaths
          .map(
            (path) =>
              `${path.fromEntityId}->${path.toEntityId} ` +
              `depth=${path.depth} ` +
              `relationships=${path.relationshipIds.join(">")}`,
          )
          .join(" | ")
      : "none";

  return [
    `- impactSource: ${assessment.sourceEntityId}`,
    `  directlyDependentEntities: ${assessment.directlyDependentEntityIds.join(",") || "none"}`,
    `  transitivelyDependentEntities: ${assessment.transitivelyDependentEntityIds.join(",") || "none"}`,
    `  dependencyPaths: ${paths}`,
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

    const explicitDependencyRelationships =
      scoredRelationships
        .filter((entry) =>
          isDependencyRelationship(entry.item),
        )
        .sort(compareRelationshipScored)
        .slice(0, MAX_DEPENDENCY_RELATIONSHIPS);

    const explicitRoleRelationships =
      scoredRelationships
        .filter(
          (entry) =>
            entry.item.type === "has-role",
        )
        .sort(compareRelationshipScored)
        .slice(0, MAX_STRUCTURAL_RELATIONSHIPS);

    const stateRelationships =
      scoredRelationships
        .filter(
          (entry) =>
            entry.item.type === "has-state",
        )
        .sort(compareRelationshipScored)
        .slice(0, MAX_STATE_RELATIONSHIPS);

    const criticalRelationshipIds =
      new Set(
        [
          ...explicitDependencyRelationships,
          ...explicitRoleRelationships,
          ...stateRelationships,
        ].map((entry) => entry.item.id),
      );

    const otherRelationships =
      scoredRelationships
        .filter(
          (entry) =>
            !criticalRelationshipIds.has(
              entry.item.id,
            ),
        )
        .sort(compareRelationshipScored)
        .slice(
          0,
          Math.max(
            0,
            MAX_RELATIONSHIPS -
              criticalRelationshipIds.size,
          ),
        );

    const relationships = [
      ...explicitDependencyRelationships,
      ...explicitRoleRelationships,
      ...stateRelationships,
      ...otherRelationships,
    ].slice(0, MAX_RELATIONSHIPS);

    const entities =
      selectEntitiesForRelationships(
        scoredEntities,
        relationships,
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

    const insufficientPredictionCount =
      snapshot.predictions.filter(
        (prediction) =>
          prediction.status === "insufficient",
      ).length;

    const impactSourceIds = [
      ...new Set(
        explicitDependencyRelationships.map(
          (entry) =>
            entry.item.toEntityId,
        ),
      ),
    ]
      .sort()
      .slice(0, MAX_IMPACT_ASSESSMENTS);

    const impactAssessments =
      impactSourceIds
        .map((entityId) =>
          runtime.model.impact(entityId),
        )
        .filter(
          (assessment) =>
            assessment.directlyDependentEntityIds.length > 0 ||
            assessment.transitivelyDependentEntityIds.length > 0 ||
            assessment.dependencyPaths.length > 0,
        );

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
      impactAssessments.length > 0 ||
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
      `- predictions stored: ${snapshot.predictions.length}`,
      `- supported predictions exposed: ${supportedPredictions.length}`,
      `- insufficient predictions stored: ${insufficientPredictionCount}`,
      `- explicit dependency relationships exposed: ${explicitDependencyRelationships.length}`,
      `- explicit has-role relationships exposed: ${explicitRoleRelationships.length}`,
      `- impact assessments exposed: ${impactAssessments.length}`,
      `- causal hypotheses: ${snapshot.causalHypotheses.length}`,
      `- unsupported/stale predictions suppressed from current evidence: ${suppressedPredictionCount}`,
      "- Source of truth remains 11G World State. World Model entities and relationships are derived representations, not permissions or executable actions.",
      "- sourceFreshness is derived from the canonical 11G evidence keys supporting each 11J item.",
      "- fresh evidence may support current-state claims; aging evidence must be qualified; mixed evidence spans current and historical support.",
      "- stale and unknown evidence is historical/uncertain only. Never describe its state value as current, pending now, waiting now, failed now, or completed now.",
      "- Predictions and causal hypotheses are not facts. Preserve their status, confidence, samples, and evidence when reasoning.",
      "- Predictions with status=insufficient, confidence=0, or stale-only support are not presented as supported predictions.",
      "- Only relationships explicitly listed below may be attributed to the World Model. Plausible but absent relationships must be labelled as inference.",
      "- Explicit dependency relationships are selected before low-information state attachments so dependency chains remain intact in the bounded packet.",
      "- Use explicit dependency relationships for consequence reasoning. A has-state relationship alone is not a dependency path.",
      "- If at least one explicit dependency relationship is listed, substantive relational evidence is present. Do not state that the World Model lacks substantive relational evidence.",
      "- DEPENDENCY CONTRACT: only relationships in the explicit dependency relationship section are dependencies. Never classify has-state as a dependency.",
      "- PREDICTION CONTRACT: when supported predictions exposed=0, say exactly 'No supported predictions.' Do not invent a placeholder prediction, confidence, sample count, or candidate.",
      "- CONSEQUENCE CONTRACT: prefer the precomputed World Model impact assessments below. Do not replace a non-empty impact assessment with 'no dependency path'.",
      "- RELATIONAL EVIDENCE CONTRACT: when explicit dependency relationships exposed>0, do not output the no-substantive-relational-evidence sentinel.", 
    ];

    if (entities.length > 0) {
      sections.push(
        "",
        "World Model entities (current evidence first; historical tail explicitly labelled):",
        ...entities.map(formatEntity),
      );
    }

    sections.push(
      "",
      "World Model explicit dependency relationships:",
      `- count: ${explicitDependencyRelationships.length}`,
      "- ONLY the relationships in this section are dependency edges.",
    );

    if (explicitDependencyRelationships.length > 0) {
      sections.push(
        ...explicitDependencyRelationships.map(
          formatRelationship,
        ),
      );
    } else {
      sections.push(
        "- none explicitly represented.",
      );
    }

    sections.push(
      "",
      "World Model other relationships (role/state/structural evidence; not dependency edges):",
      `- explicit has-role count: ${explicitRoleRelationships.length}`,
      `- state attachment count: ${stateRelationships.length}`,
    );

    sections.push(
      "",
      `World Model explicit role relationships (count=${explicitRoleRelationships.length}; structural, not dependency edges):`,
    );

    if (explicitRoleRelationships.length > 0) {
      sections.push(
        ...explicitRoleRelationships.map(
          formatRelationship,
        ),
      );
    } else {
      sections.push(
        "- none explicitly represented.",
      );
    }

    if (stateRelationships.length > 0) {
      sections.push(
        "",
        `World Model state attachments (count=${stateRelationships.length}; NOT dependency edges):`,
        ...stateRelationships.map(
          formatRelationship,
        ),
      );
    }

    if (impactAssessments.length > 0) {
      sections.push(
        "",
        "World Model precomputed downstream impact assessments:",
        ...impactAssessments.map(
          formatImpactAssessment,
        ),
      );
    } else {
      sections.push(
        "",
        "World Model precomputed downstream impact assessments:",
        "- none represented by the currently exposed dependency graph.",
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
        "- No supported predictions.",
        "- Canonical stored predictions may exist internally, but none satisfy the support/currentness contract.",
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
