import type {
  WorldStateJsonValue,
} from "../worldState";

export type WorldModelPredictionStatus =
  | "insufficient"
  | "weak"
  | "moderate"
  | "strong";

export interface WorldModelNextStateCandidate {
  value: WorldStateJsonValue;
  transitionCount: number;
  probability: number;
  averageDwellMs?: number;
}

export interface WorldModelStatePrediction {
  id: string;
  entityId: string;
  stateKey: string;
  currentValue: WorldStateJsonValue;
  status: WorldModelPredictionStatus;
  confidence: number;
  sampleCount: number;
  generatedAt: string;
  candidates: WorldModelNextStateCandidate[];
  predictedNextValue?: WorldStateJsonValue;
  predictedProbability?: number;
  expectedTransitionAfterMs?: number;
  evidenceTransitionIds: string[];
}
