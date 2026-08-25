import type {
  WorldModelRelationship,
} from "./types";

export type WorldModelCausalHypothesisStatus =
  | "insufficient"
  | "plausible"
  | "supported"
  | "contradicted";

export interface WorldModelDependencyPath {
  fromEntityId: string;
  toEntityId: string;
  relationshipIds: string[];
  entityIds: string[];
  depth: number;
}

export interface WorldModelImpactAssessment {
  sourceEntityId: string;
  directlyDependentEntityIds: string[];
  transitivelyDependentEntityIds: string[];
  dependencyPaths: WorldModelDependencyPath[];
}

export interface WorldModelCausalObservation {
  id: string;
  causeEntityId: string;
  effectEntityId: string;
  causeObservedAt: string;
  effectObservedAt: string;
  confidence: number;
  supporting: boolean;
  evidenceEventIds: string[];
  evidenceWorldStateKeys: string[];
}

export interface WorldModelCausalHypothesis {
  id: string;
  causeEntityId: string;
  effectEntityId: string;
  status: WorldModelCausalHypothesisStatus;
  confidence: number;
  supportCount: number;
  contradictionCount: number;
  observations: WorldModelCausalObservation[];
  structuralRelationships: WorldModelRelationship[];
  firstObservedAt?: string;
  lastObservedAt?: string;
}
