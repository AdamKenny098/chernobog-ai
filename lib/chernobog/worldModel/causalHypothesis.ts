import type {
  ChernobogWorldModelGraph,
} from "./graph";
import type {
  WorldModelCausalHypothesis,
  WorldModelCausalObservation,
} from "./causalTypes";
import {
  findDependencyPaths,
} from "./dependencyModel";
import {
  normalizeWorldModelEntityId,
} from "./validation";

function normalizeList(
  values:
    readonly string[] | undefined,
): string[] {
  return [
    ...new Set(
      (values ?? [])
        .map((value) =>
          value.trim(),
        )
        .filter(Boolean),
    ),
  ].sort();
}

function requireTimestamp(
  value: string,
  field: string,
): string {
  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    throw new Error(
      `${field} must be a valid timestamp.`,
    );
  }

  return parsed.toISOString();
}

function requireConfidence(
  value: number,
): number {
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  ) {
    throw new Error(
      "world model causal observation confidence must be between 0 and 1.",
    );
  }

  return value;
}

export function createWorldModelCausalObservation(
  input: {
    id: string;
    causeEntityId: string;
    effectEntityId: string;
    causeObservedAt: string;
    effectObservedAt: string;
    confidence?: number;
    supporting?: boolean;
    evidenceEventIds?: string[];
    evidenceWorldStateKeys?: string[];
  },
): WorldModelCausalObservation {
  const id =
    input.id.trim();

  if (!id) {
    throw new Error(
      "world model causal observation id must not be empty.",
    );
  }

  const causeEntityId =
    normalizeWorldModelEntityId(
      input.causeEntityId,
    );

  const effectEntityId =
    normalizeWorldModelEntityId(
      input.effectEntityId,
    );

  if (
    causeEntityId === effectEntityId
  ) {
    throw new Error(
      "world model causal observation endpoints must be distinct.",
    );
  }

  const causeObservedAt =
    requireTimestamp(
      input.causeObservedAt,
      "worldModelCausalObservation.causeObservedAt",
    );

  const effectObservedAt =
    requireTimestamp(
      input.effectObservedAt,
      "worldModelCausalObservation.effectObservedAt",
    );

  return {
    id,
    causeEntityId,
    effectEntityId,
    causeObservedAt,
    effectObservedAt,
    confidence:
      requireConfidence(
        input.confidence ?? 0.5,
      ),
    supporting:
      input.supporting ?? true,
    evidenceEventIds:
      normalizeList(
        input.evidenceEventIds,
      ),
    evidenceWorldStateKeys:
      normalizeList(
        input.evidenceWorldStateKeys,
      ),
  };
}

export function evaluateWorldModelCausalHypothesis(
  graph:
    ChernobogWorldModelGraph,
  causeEntityId: string,
  effectEntityId: string,
  observations:
    readonly WorldModelCausalObservation[],
): WorldModelCausalHypothesis {
  const cause =
    normalizeWorldModelEntityId(
      causeEntityId,
    );

  const effect =
    normalizeWorldModelEntityId(
      effectEntityId,
    );

  const relevant =
    observations
      .filter(
        (observation) =>
          observation.causeEntityId ===
            cause &&
          observation.effectEntityId ===
            effect,
      )
      .map(
        (observation) =>
          structuredClone(
            observation,
          ),
      )
      .sort(
        (left, right) =>
          left.causeObservedAt
            .localeCompare(
              right.causeObservedAt,
            ) ||
          left.id.localeCompare(
            right.id,
          ),
      );

  const temporalSupport =
    relevant.filter(
      (observation) =>
        observation.supporting &&
        observation.causeObservedAt <=
          observation.effectObservedAt,
    );

  const contradictions =
    relevant.filter(
      (observation) =>
        !observation.supporting ||
        observation.causeObservedAt >
          observation.effectObservedAt,
    );

  const supportWeight =
    temporalSupport.reduce(
      (sum, observation) =>
        sum +
        observation.confidence,
      0,
    );

  const contradictionWeight =
    contradictions.reduce(
      (sum, observation) =>
        sum +
        observation.confidence,
      0,
    );

  const totalWeight =
    supportWeight +
    contradictionWeight;

  const evidenceConfidence =
    totalWeight === 0
      ? 0
      : Math.max(
          0,
          Math.min(
            1,
            supportWeight /
              totalWeight,
          ),
        );

  const repetitionFactor =
    Math.min(
      1,
      temporalSupport.length /
        3,
    );

  const structuralPaths =
    findDependencyPaths(
      graph,
      effect,
      cause,
      {
        maxDepth: 8,
      },
    );

  const structuralFactor =
    structuralPaths.length > 0
      ? 1
      : 0.75;

  const confidence =
    Math.max(
      0,
      Math.min(
        1,
        evidenceConfidence *
          repetitionFactor *
          structuralFactor,
      ),
    );

  let status:
    WorldModelCausalHypothesis["status"];

  if (
    contradictions.length >
      temporalSupport.length
  ) {
    status =
      "contradicted";
  } else if (
    temporalSupport.length < 2
  ) {
    status =
      "insufficient";
  } else if (
    temporalSupport.length >= 3 &&
    confidence >= 0.65
  ) {
    status =
      "supported";
  } else {
    status =
      "plausible";
  }

  const observedTimes =
    relevant.flatMap(
      (observation) => [
        observation.causeObservedAt,
        observation.effectObservedAt,
      ],
    )
      .sort();

  return {
    id:
      `causal-hypothesis:${cause}->${effect}`,
    causeEntityId:
      cause,
    effectEntityId:
      effect,
    status,
    confidence,
    supportCount:
      temporalSupport.length,
    contradictionCount:
      contradictions.length,
    observations:
      relevant,
    structuralRelationships:
      structuralPaths.length === 0
        ? []
        : structuralPaths[0]!
            .relationshipIds
            .map(
              (id) =>
                graph.getRelationship(
                  id,
                ),
            )
            .filter(
              (
                relation,
              ): relation is NonNullable<typeof relation> =>
                Boolean(relation),
            ),
    firstObservedAt:
      observedTimes[0],
    lastObservedAt:
      observedTimes[
        observedTimes.length - 1
      ],
  };
}
