import type {
  WorldStateRecord,
} from "../worldState";
import type {
  WorldModelCausalHypothesis,
  WorldModelCausalObservation,
  WorldModelImpactAssessment,
} from "./causalTypes";
import {
  evaluateWorldModelCausalHypothesis,
} from "./causalHypothesis";
import {
  assessDownstreamImpact,
} from "./dependencyModel";
import {
  ChernobogWorldModelGraph,
} from "./graph";
import {
  ChernobogWorldModelPredictionStore,
} from "./predictionStore";
import {
  predictNextWorldModelState,
} from "./predictiveModel";
import {
  ChernobogWorldModelProjector,
} from "./projector";
import type {
  ChernobogWorldModelRuntimeOptions,
  WorldModelRuntimeIngestResult,
  WorldModelRuntimeSnapshot,
} from "./runtimeTypes";
import {
  ChernobogWorldModelTemporalModel,
} from "./temporalModel";
import {
  temporalObservationFromWorldState,
} from "./temporalObservation";
import type {
  WorldModelStatePrediction,
} from "./predictionTypes";

function canonicalEntityIdForWorldState(
  record: WorldStateRecord,
): string {
  const parts =
    record.key
      .split(".")
      .map((part) =>
        part.trim().toLowerCase(),
      )
      .filter(Boolean);

  const name = parts[1];

  switch (record.namespace) {
    case "service":
      return name
        ? `service:${name}`
        : `world-state:${record.key}`;

    case "project":
      return name
        ? `project:${name}`
        : `world-state:${record.key}`;

    case "repository":
      return name
        ? `repository:${name}`
        : `world-state:${record.key}`;

    case "model":
      return name
        ? `model:${name}`
        : `world-state:${record.key}`;

    case "storage":
      return name
        ? `storage:${name}`
        : `world-state:${record.key}`;

    case "backup":
      return name
        ? `backup:${name}`
        : `world-state:${record.key}`;

    default:
      return `world-state:${record.key}`;
  }
}

function causalObservationOrder(
  left: WorldModelCausalObservation,
  right: WorldModelCausalObservation,
): number {
  return (
    left.causeObservedAt.localeCompare(
      right.causeObservedAt,
    ) ||
    left.effectObservedAt.localeCompare(
      right.effectObservedAt,
    ) ||
    left.id.localeCompare(
      right.id,
    )
  );
}

export class ChernobogWorldModelRuntime {
  readonly graph:
    ChernobogWorldModelGraph;

  readonly projector:
    ChernobogWorldModelProjector;

  readonly temporal =
    new ChernobogWorldModelTemporalModel();

  readonly predictions =
    new ChernobogWorldModelPredictionStore();

  private readonly causalObservations =
    new Map<
      string,
      WorldModelCausalObservation
    >();

  private readonly causalHypotheses =
    new Map<
      string,
      WorldModelCausalHypothesis
    >();

  private readonly clock:
    () => Date;

  constructor(
    options:
      ChernobogWorldModelRuntimeOptions = {},
  ) {
    this.graph =
      new ChernobogWorldModelGraph();

    this.projector =
      new ChernobogWorldModelProjector({
        graph:
          this.graph,
      });

    this.clock =
      options.clock ??
      (() => new Date());
  }

  ingestWorldState(
    records:
      readonly WorldStateRecord[],
  ): WorldModelRuntimeIngestResult {
    const projection =
      this.projector.project(
        records,
      );

    let temporalWrites = 0;
    let predictionWrites = 0;

    const ordered =
      [...records].sort(
        (left, right) =>
          left.key.localeCompare(
            right.key,
          ) ||
          left.observedAt.localeCompare(
            right.observedAt,
          ),
      );

    for (
      const record
      of ordered
    ) {
      const entityId =
        canonicalEntityIdForWorldState(
          record,
        );

      const observation =
        temporalObservationFromWorldState(
          entityId,
          record,
        );

      this.temporal.add(
        observation,
      );

      temporalWrites += 1;

      const prediction =
        predictNextWorldModelState(
          this.temporal,
          entityId,
          record.key,
          {
            now:
              this.clock(),
          },
        );

      if (prediction) {
        this.predictions.upsert(
          prediction,
        );

        predictionWrites += 1;
      }
    }

    return {
      records:
        ordered.length,
      entityWrites:
        projection.entityWrites,
      relationshipWrites:
        projection.relationshipWrites,
      skippedRelationships:
        projection.skippedRelationships,
      temporalWrites,
      predictionWrites,
    };
  }

  addCausalObservation(
    observation:
      WorldModelCausalObservation,
  ): WorldModelCausalObservation {
    this.causalObservations.set(
      observation.id,
      structuredClone(
        observation,
      ),
    );

    return structuredClone(
      observation,
    );
  }

  listCausalObservations():
    WorldModelCausalObservation[] {
    return [
      ...this.causalObservations.values(),
    ]
      .sort(
        causalObservationOrder,
      )
      .map(
        (observation) =>
          structuredClone(
            observation,
          ),
      );
  }

  evaluateCausalHypothesis(
    causeEntityId: string,
    effectEntityId: string,
  ): WorldModelCausalHypothesis {
    const hypothesis =
      evaluateWorldModelCausalHypothesis(
        this.graph,
        causeEntityId,
        effectEntityId,
        this.listCausalObservations(),
      );

    this.causalHypotheses.set(
      hypothesis.id,
      structuredClone(
        hypothesis,
      ),
    );

    return structuredClone(
      hypothesis,
    );
  }

  impact(
    sourceEntityId: string,
  ): WorldModelImpactAssessment {
    return assessDownstreamImpact(
      this.graph,
      sourceEntityId,
    );
  }

  prediction(
    entityId: string,
    stateKey: string,
  ): WorldModelStatePrediction | undefined {
    const latest =
      predictNextWorldModelState(
        this.temporal,
        entityId,
        stateKey,
        {
          now:
            this.clock(),
        },
      );

    if (!latest) {
      return undefined;
    }

    this.predictions.upsert(
      latest,
    );

    return structuredClone(
      latest,
    );
  }

  snapshot():
    WorldModelRuntimeSnapshot {
    return {
      generatedAt:
        this.clock().toISOString(),
      graph:
        this.graph.snapshot(),
      temporal:
        this.temporal.snapshot(),
      predictions:
        this.predictions.list(),
      causalObservations:
        this.listCausalObservations(),
      causalHypotheses: [
        ...this.causalHypotheses.values(),
      ]
        .sort(
          (left, right) =>
            left.id.localeCompare(
              right.id,
            ),
        )
        .map(
          (hypothesis) =>
            structuredClone(
              hypothesis,
            ),
        ),
    };
  }
}
