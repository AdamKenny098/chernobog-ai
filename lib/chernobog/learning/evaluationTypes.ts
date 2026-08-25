import type {
  LearningExperience,
  LearningFeedbackKind,
  LearningOutcomeStatus,
} from "./types";

export interface LearningOutcomeObservation {
  id: string;
  experienceId: string;
  observedAt: string;
  status: LearningOutcomeStatus;
  score?: number;
  confidence: number;
  detail?: string;
  evidenceEventIds: string[];
  evidenceWorldStateKeys: string[];
}

export interface LearningFeedbackObservation {
  id: string;
  experienceId: string;
  observedAt: string;
  kind: LearningFeedbackKind;
  confidence: number;
  detail?: string;
}

export type LearningEvaluationReasonCode =
  | "explicit-correction"
  | "explicit-negative-feedback"
  | "explicit-positive-feedback"
  | "confirmed-success"
  | "confirmed-failure"
  | "mixed-outcomes"
  | "conflicting-evidence"
  | "insufficient-outcome-confidence"
  | "no-evaluation-signal";

export interface LearningEvaluationReason {
  code: LearningEvaluationReasonCode;
  detail: string;
}

export interface EvaluatedLearningExperience {
  experience: LearningExperience;
  evaluatedAt: string;
  outcomeObservations: LearningOutcomeObservation[];
  feedbackObservations: LearningFeedbackObservation[];
  resolvedOutcome: {
    status: LearningOutcomeStatus;
    score?: number;
    confidence: number;
  };
  resolvedFeedback: {
    kind: LearningFeedbackKind;
    confidence: number;
    detail?: string;
  };
  evaluationConfidence: number;
  reasons: LearningEvaluationReason[];
}
