import type {
  LearnedLesson,
} from "./promotionTypes";

export function activeLessonGuidance(
  lessons: readonly LearnedLesson[],
): string[] {
  return lessons
    .filter(
      (lesson) =>
        lesson.status === "active" &&
        (
          lesson.kind === "preference" ||
          lesson.kind === "correction-pattern"
        ),
    )
    .sort((left, right) => {
      if (
        left.confidence !==
        right.confidence
      ) {
        return (
          right.confidence -
          left.confidence
        );
      }

      return left.key.localeCompare(
        right.key,
      );
    })
    .map(
      (lesson) => lesson.statement,
    );
}
