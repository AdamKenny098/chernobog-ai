import {
  salienceBandForScore,
} from "../cognition";
import {
  DEFAULT_LEARNING_ADAPTATION_POLICY,
  validateLearningAdaptationPolicy,
} from "./adaptationPolicy";
import {
  matchLessonToSignal,
} from "./lessonApplicability";
import type {
  LearnedLesson,
} from "./promotionTypes";
import type {
  LearningAdaptationInfluence,
  LearningAdaptationPolicy,
  LearningAdaptationResult,
  LearningFocusAdaptationResult,
} from "./adaptationTypes";
import type {
  CognitiveAttentionSignal,
  CognitiveFocusCandidate,
} from "../cognition";

function clampScore(value: number): number {
  return Math.max(
    0,
    Math.min(100, Math.round(value)),
  );
}

function influenceForLesson(
  lesson: LearnedLesson,
  signal: CognitiveAttentionSignal,
  policy: LearningAdaptationPolicy,
): LearningAdaptationInfluence | undefined {
  if (
    lesson.status !== "active" ||
    lesson.confidence <
      policy.minimumLessonConfidence
  ) {
    return undefined;
  }

  const match =
    matchLessonToSignal(
      lesson,
      signal,
    );

  if (!match.matched) {
    return undefined;
  }

  const boundedBoost =
    Math.min(
      policy.maxPriorityBoost,
      Math.round(
        policy.maxPriorityBoost *
          lesson.confidence *
          match.matchStrength,
      ),
    );

  if (
    lesson.kind === "correction-pattern" ||
    lesson.kind === "preference"
  ) {
    return {
      lessonKey: lesson.key,
      kind: "guidance",
      confidence: lesson.confidence,
      priorityDelta: boundedBoost,
      guidance: lesson.statement,
    };
  }

  return {
    lessonKey: lesson.key,
    kind: "priority-adjustment",
    confidence: lesson.confidence,
    priorityDelta: boundedBoost,
  };
}

export function adaptAttentionWithLessons(
  signal: CognitiveAttentionSignal,
  lessons: readonly LearnedLesson[],
  policy:
    LearningAdaptationPolicy =
      DEFAULT_LEARNING_ADAPTATION_POLICY,
): LearningAdaptationResult {
  validateLearningAdaptationPolicy(policy);

  const influences = lessons
    .map((lesson) =>
      influenceForLesson(
        lesson,
        signal,
        policy,
      ),
    )
    .filter(
      (
        influence,
      ): influence is LearningAdaptationInfluence =>
        Boolean(influence),
    )
    .sort((left, right) => {
      if (
        left.priorityDelta !==
        right.priorityDelta
      ) {
        return (
          right.priorityDelta -
          left.priorityDelta
        );
      }

      return left.lessonKey.localeCompare(
        right.lessonKey,
      );
    });

  const totalBoost = Math.min(
    policy.maxPriorityBoost,
    influences.reduce(
      (sum, influence) =>
        sum + influence.priorityDelta,
      0,
    ),
  );

  const adaptedScore = clampScore(
    signal.score + totalBoost,
  );

  return {
    signal: {
      ...structuredClone(signal),
      score: adaptedScore,
      band:
        salienceBandForScore(
          adaptedScore,
        ),
    },
    originalScore: signal.score,
    adaptedScore,
    influences:
      structuredClone(influences),
  };
}

export function adaptFocusCandidateWithLessons(
  candidate: CognitiveFocusCandidate,
  lessons: readonly LearnedLesson[],
  policy:
    LearningAdaptationPolicy =
      DEFAULT_LEARNING_ADAPTATION_POLICY,
): LearningFocusAdaptationResult {
  const adapted =
    adaptAttentionWithLessons(
      candidate.signal,
      lessons,
      policy,
    );

  return {
    candidate: {
      ...structuredClone(candidate),
      signal:
        structuredClone(
          adapted.signal,
        ),
      prioritized: {
        ...structuredClone(
          candidate.prioritized,
        ),
        score:
          adapted.adaptedScore,
        band:
          salienceBandForScore(
            adapted.adaptedScore,
          ),
      },
    },
    originalScore:
      candidate.prioritized.score,
    adaptedScore:
      adapted.adaptedScore,
    influences:
      structuredClone(
        adapted.influences,
      ),
  };
}
