import {
  getChernobogWorldModelRuntime,
  type WorldModelCausalHypothesis,
  type WorldModelEntity,
  type WorldModelRelationship,
  type WorldModelStatePrediction,
} from "@/lib/chernobog/worldModel";

const MAX_ENTITIES = 16;
const MAX_RELATIONSHIPS = 16;
const MAX_PREDICTIONS = 10;
const MAX_CAUSAL_HYPOTHESES = 8;
const MAX_ATTRIBUTES_CHARS = 500;

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

function formatEntity(entity: WorldModelEntity): string {
  return [
    `- entity: ${entity.id}`,
    `  kind: ${entity.kind}`,
    `  label: ${entity.label}`,
    `  observedAt: ${entity.observedAt}`,
    `  confidence: ${entity.confidence.toFixed(2)}`,
    `  attributes: ${serializeValue(entity.attributes)}`,
    `  evidence: ${evidenceText(entity.evidence)}`,
  ].join("\n");
}

function formatRelationship(
  relationship: WorldModelRelationship,
): string {
  return [
    `- relationship: ${relationship.id}`,
    `  type: ${relationship.type}`,
    `  from: ${relationship.fromEntityId}`,
    `  to: ${relationship.toEntityId}`,
    `  directed: ${relationship.directed}`,
    `  observedAt: ${relationship.observedAt}`,
    `  confidence: ${relationship.confidence.toFixed(2)}`,
    `  attributes: ${serializeValue(relationship.attributes)}`,
    `  evidence: ${evidenceText(relationship.evidence)}`,
  ].join("\n");
}

function formatPrediction(
  prediction: WorldModelStatePrediction,
): string {
  return [
    `- prediction: ${prediction.id}`,
    `  entity: ${prediction.entityId}`,
    `  stateKey: ${prediction.stateKey}`,
    `  status: ${prediction.status}`,
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
): string {
  return [
    `- causalHypothesis: ${hypothesis.id}`,
    `  cause: ${hypothesis.causeEntityId}`,
    `  effect: ${hypothesis.effectEntityId}`,
    `  status: ${hypothesis.status}`,
    `  confidence: ${hypothesis.confidence.toFixed(2)}`,
    `  supportCount: ${hypothesis.supportCount}`,
    `  contradictionCount: ${hypothesis.contradictionCount}`,
    `  firstObservedAt: ${hypothesis.firstObservedAt ?? "unknown"}`,
    `  lastObservedAt: ${hypothesis.lastObservedAt ?? "unknown"}`,
  ].join("\n");
}

export async function buildChernobogWorldModelContext():
  Promise<ChernobogWorldModelContext> {
  try {
    const runtime =
      await getChernobogWorldModelRuntime();

    runtime.ingestCurrentWorldState();

    const snapshot = runtime.model.snapshot();

    const entities =
      snapshot.graph.entities
        .slice(0, MAX_ENTITIES);

    const relationships =
      snapshot.graph.relationships
        .slice(0, MAX_RELATIONSHIPS);

    const predictions =
      snapshot.predictions
        .slice(0, MAX_PREDICTIONS);

    const causalHypotheses =
      snapshot.causalHypotheses
        .slice(0, MAX_CAUSAL_HYPOTHESES);

    const hasEvidence =
      entities.length > 0 ||
      relationships.length > 0 ||
      predictions.length > 0 ||
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
      "- Source of truth remains 11G World State. World Model entities and relationships are derived representations, not permissions or executable actions.",
      "- Predictions and causal hypotheses are not facts. Preserve their status, confidence, samples, and evidence when reasoning.",
      "- Only relationships explicitly listed below may be attributed to the World Model. Plausible but absent relationships must be labelled as inference.",
    ];

    if (entities.length > 0) {
      sections.push(
        "",
        "World Model entities:",
        ...entities.map(formatEntity),
      );
    }

    if (relationships.length > 0) {
      sections.push(
        "",
        "World Model relationships:",
        ...relationships.map(formatRelationship),
      );
    }

    if (predictions.length > 0) {
      sections.push(
        "",
        "World Model predictions:",
        ...predictions.map(formatPrediction),
      );
    }

    if (causalHypotheses.length > 0) {
      sections.push(
        "",
        "World Model causal hypotheses:",
        ...causalHypotheses.map(formatCausalHypothesis),
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
