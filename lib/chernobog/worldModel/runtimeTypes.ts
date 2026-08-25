import type {
  ChernobogEventBus,
} from "../events/eventBus";
import type {
  ChernobogWorldStateRuntime,
  WorldStateRecord,
} from "../worldState";
import type {
  WorldModelCausalHypothesis,
  WorldModelCausalObservation,
  WorldModelImpactAssessment,
} from "./causalTypes";
import type {
  WorldModelStatePrediction,
} from "./predictionTypes";
import type {
  WorldModelTemporalSnapshot,
} from "./temporalTypes";
import type {
  WorldModelSnapshot,
} from "./types";

export interface WorldModelRuntimeIngestResult {
  records: number;
  entityWrites: number;
  relationshipWrites: number;
  skippedRelationships: number;
  temporalWrites: number;
  predictionWrites: number;
}

export interface WorldModelRuntimeSnapshot {
  generatedAt: string;
  graph: WorldModelSnapshot;
  temporal: WorldModelTemporalSnapshot;
  predictions: WorldModelStatePrediction[];
  causalObservations: WorldModelCausalObservation[];
  causalHypotheses: WorldModelCausalHypothesis[];
}

export interface ChernobogWorldModelRuntimeOptions {
  clock?: () => Date;
}

export interface StartChernobogWorldModelRuntimeOptions {
  worldStateRuntime: Pick<
    ChernobogWorldStateRuntime,
    "engine"
  >;
  eventBus: Pick<
    ChernobogEventBus,
    "subscribe"
  >;
  model?: import("./worldModelRuntime").ChernobogWorldModelRuntime;
}

export interface ChernobogWorldModelProductionRuntime {
  model: import("./worldModelRuntime").ChernobogWorldModelRuntime;
  ingestCurrentWorldState(): WorldModelRuntimeIngestResult;
  stop(): void;
}

export type WorldModelWorldStateReader =
  () => WorldStateRecord[];

export interface WorldModelRuntimeImpactResult {
  assessment: WorldModelImpactAssessment;
}
