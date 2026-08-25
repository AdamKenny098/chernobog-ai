import type {
  CognitiveAttentionSignal,
} from "../cognition";
import type {
  LearningLessonMatch,
} from "./adaptationTypes";
import type {
  LearnedLesson,
} from "./promotionTypes";

function subjectCandidates(
  lesson: LearnedLesson,
): string[] {
  return [
    ...new Set(
      lesson.evidence.subjects
        .map((subject) => subject.trim())
        .filter(Boolean),
    ),
  ];
}

export function matchLessonToSignal(
  lesson: LearnedLesson,
  signal: CognitiveAttentionSignal,
): LearningLessonMatch {
  if (lesson.status !== "active") {
    return {
      lesson: structuredClone(lesson),
      matched: false,
      matchStrength: 0,
      reason: "lesson-revoked",
    };
  }

  const subjects = subjectCandidates(lesson);

  if (subjects.length === 0) {
    return {
      lesson: structuredClone(lesson),
      matched: false,
      matchStrength: 0,
      reason: "lesson-has-no-subject-scope",
    };
  }

  if (subjects.includes(signal.key)) {
    return {
      lesson: structuredClone(lesson),
      matched: true,
      matchStrength: 1,
      reason: "exact-world-state-key",
    };
  }

  if (
    subjects.includes(
      signal.record.namespace,
    )
  ) {
    return {
      lesson: structuredClone(lesson),
      matched: true,
      matchStrength: 0.75,
      reason: "world-state-namespace",
    };
  }

  const prefix = subjects
    .filter((subject) =>
      signal.key.startsWith(subject),
    )
    .sort(
      (left, right) =>
        right.length - left.length,
    )[0];

  if (prefix) {
    return {
      lesson: structuredClone(lesson),
      matched: true,
      matchStrength: 0.85,
      reason: "world-state-prefix",
    };
  }

  return {
    lesson: structuredClone(lesson),
    matched: false,
    matchStrength: 0,
    reason: "lesson-not-relevant",
  };
}
