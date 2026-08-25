import type {
  CognitiveAttentionSignal,
  CognitiveFocusCandidate,
} from "../cognition";
import type {
  LearnedLesson,
} from "./promotionTypes";

export type LearningAdaptationKind =
  | "priority-adjustment"
  | "guidance";

export interface LearningAdaptationInfluence {
  lessonKey: string;
  kind: LearningAdaptationKind;
  confidence: number;
  priorityDelta: number;
  guidance?: string;
}

export interface LearningAdaptationResult {
  signal: CognitiveAttentionSignal;
  originalScore: number;
  adaptedScore: number;
  influences: LearningAdaptationInfluence[];
}

export interface LearningFocusAdaptationResult {
  candidate: CognitiveFocusCandidate;
  originalScore: number;
  adaptedScore: number;
  influences: LearningAdaptationInfluence[];
}

export interface LearningAdaptationPolicy {
  maxPriorityBoost: number;
  minimumLessonConfidence: number;
}

export interface LearningLessonMatch {
  lesson: LearnedLesson;
  matched: boolean;
  matchStrength: number;
  reason?: string;
}
