import type { EvaluatedLearningExperience } from "./evaluationTypes";

export type LearningPatternScope =
  | "global"
  | "project";

export type LearningPatternKind =
  | "preference"
  | "success-pattern"
  | "failure-pattern"
  | "correction-pattern";

export interface LearningPatternEvidence {
  experienceIds: string[];
  subjects: string[];
  feedbackKinds: string[];
  outcomeStatuses: string[];
}

export interface LearningPatternCandidate {
  id: string;
  key: string;
  kind: LearningPatternKind;
  statement: string;
  scope?: LearningPatternScope;
  projectId?: string;
  supportCount: number;
  contradictionCount: number;
  confidence: number;
  firstObservedAt: string;
  lastObservedAt: string;
  evidence: LearningPatternEvidence;
  sourceEvaluations: EvaluatedLearningExperience[];
}

export interface LearningPatternPolicy {
  minimumSupport: number;
  maximumContradictionRatio: number;
  confidenceFloor: number;
}

export interface LearningPatternExtractionResult {
  candidates: LearningPatternCandidate[];
  rejectedKeys: string[];
}
