import type {
  CognitiveAttentionSignal,
  CognitiveRuntimeCycle,
} from "../cognition";
import type {
  EvaluatedLearningExperience,
  LearningFeedbackObservation,
  LearningOutcomeObservation,
} from "./evaluationTypes";
import type {
  LearningAdaptationResult,
} from "./adaptationTypes";
import type {
  LearnedLesson,
  LearningPromotionContext,
} from "./promotionTypes";
import type {
  LearningPatternCandidate,
} from "./patternTypes";
import type {
  LearningExperience,
} from "./types";

export interface ChernobogLearningRuntimeOptions {
  lessonPath?: string;
  clock?: () => Date;
}

export interface LearningRuntimeSnapshot {
  generatedAt: string;
  experiences: LearningExperience[];
  evaluations: EvaluatedLearningExperience[];
  patterns: LearningPatternCandidate[];
  lessons: LearnedLesson[];
  activeLessons: LearnedLesson[];
}

export interface LearningRuntimePromotionResult {
  pattern: LearningPatternCandidate;
  lesson: LearnedLesson;
  context: LearningPromotionContext;
}

export interface LearningRuntimeAdaptationResult {
  input: CognitiveAttentionSignal;
  result: LearningAdaptationResult;
}

export interface LearningRuntimeCognitiveCapture {
  cycle: CognitiveRuntimeCycle;
  experience: LearningExperience;
}

export interface LearningRuntimeOutcomeInput {
  observation: LearningOutcomeObservation;
}

export interface LearningRuntimeFeedbackInput {
  observation: LearningFeedbackObservation;
}
