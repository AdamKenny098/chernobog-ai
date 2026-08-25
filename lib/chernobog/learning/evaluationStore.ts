import type {
  LearningFeedbackObservation,
  LearningOutcomeObservation,
} from "./evaluationTypes";

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class ChernobogLearningEvaluationStore {
  private readonly outcomes =
    new Map<
      string,
      LearningOutcomeObservation
    >();

  private readonly feedback =
    new Map<
      string,
      LearningFeedbackObservation
    >();

  addOutcome(
    observation:
      LearningOutcomeObservation,
  ): void {
    this.outcomes.set(
      observation.id,
      clone(observation),
    );
  }

  addFeedback(
    observation:
      LearningFeedbackObservation,
  ): void {
    this.feedback.set(
      observation.id,
      clone(observation),
    );
  }

  outcomesFor(
    experienceId: string,
  ): LearningOutcomeObservation[] {
    return [
      ...this.outcomes.values(),
    ]
      .filter(
        (item) =>
          item.experienceId ===
          experienceId,
      )
      .sort(
        (left, right) =>
          left.observedAt.localeCompare(
            right.observedAt,
          ),
      )
      .map(clone);
  }

  feedbackFor(
    experienceId: string,
  ): LearningFeedbackObservation[] {
    return [
      ...this.feedback.values(),
    ]
      .filter(
        (item) =>
          item.experienceId ===
          experienceId,
      )
      .sort(
        (left, right) =>
          left.observedAt.localeCompare(
            right.observedAt,
          ),
      )
      .map(clone);
  }

  clear(): void {
    this.outcomes.clear();
    this.feedback.clear();
  }
}
