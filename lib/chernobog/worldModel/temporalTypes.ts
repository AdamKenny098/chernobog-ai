import type {
  WorldStateJsonValue,
} from "../worldState";

export interface WorldModelTemporalObservation {
  id: string;
  entityId: string;
  stateKey: string;
  value: WorldStateJsonValue;
  observedAt: string;
  confidence: number;
  evidenceEventIds: string[];
  evidenceWorldStateKeys: string[];
}

export interface WorldModelStateTransition {
  id: string;
  entityId: string;
  stateKey: string;
  fromValue: WorldStateJsonValue;
  toValue: WorldStateJsonValue;
  fromObservedAt: string;
  toObservedAt: string;
  durationMs: number;
  confidence: number;
  evidenceObservationIds: [string, string];
}

export interface WorldModelTransitionSummary {
  entityId: string;
  stateKey: string;
  transitionCount: number;
  distinctStateCount: number;
  firstObservedAt?: string;
  lastObservedAt?: string;
  latestValue?: WorldStateJsonValue;
  averageDwellMs?: number;
}

export interface WorldModelTemporalSnapshot {
  observations: WorldModelTemporalObservation[];
  transitions: WorldModelStateTransition[];
}
