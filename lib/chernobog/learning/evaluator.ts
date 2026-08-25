import type {
  EvaluatedLearningExperience,
  LearningEvaluationReason,
  LearningFeedbackObservation,
  LearningOutcomeObservation,
} from "./evaluationTypes";
import type {
  LearningExperience,
  LearningFeedbackKind,
  LearningOutcomeStatus,
} from "./types";

function clone<T>(value: T): T {
  return structuredClone(value);
}

function addReason(
  reasons: LearningEvaluationReason[],
  code: LearningEvaluationReason["code"],
  detail: string,
): void {
  reasons.push({ code, detail });
}

function resolveFeedback(
  observations:
    readonly LearningFeedbackObservation[],
): {
  kind: LearningFeedbackKind;
  confidence: number;
  detail?: string;
} {
  const ranked = [...observations].sort(
    (left, right) => {
      const precedence = (
        kind: LearningFeedbackKind,
      ) => {
        switch (kind) {
          case "correction":
            return 4;
          case "explicit-negative":
            return 3;
          case "explicit-positive":
            return 2;
          case "none":
            return 1;
        }
      };

      const precedenceDiff =
        precedence(right.kind) -
        precedence(left.kind);

      if (precedenceDiff !== 0) {
        return precedenceDiff;
      }

      if (
        right.confidence !==
        left.confidence
      ) {
        return (
          right.confidence -
          left.confidence
        );
      }

      const time =
        right.observedAt.localeCompare(
          left.observedAt,
        );

      if (time !== 0) {
        return time;
      }

      return left.id.localeCompare(
        right.id,
      );
    },
  );

  const winner = ranked[0];

  if (!winner) {
    return {
      kind: "none",
      confidence: 0,
    };
  }

  return {
    kind: winner.kind,
    confidence: winner.confidence,
    detail: winner.detail,
  };
}

function resolveOutcome(
  observations:
    readonly LearningOutcomeObservation[],
): {
  status: LearningOutcomeStatus;
  score?: number;
  confidence: number;
  conflicting: boolean;
} {
  const relevant =
    observations.filter(
      (item) =>
        item.status !== "unknown",
    );

  if (relevant.length === 0) {
    return {
      status: "unknown",
      confidence: 0,
      conflicting: false,
    };
  }

  let successWeight = 0;
  let failureWeight = 0;
  let mixedWeight = 0;
  let weightedScore = 0;
  let scoreWeight = 0;

  for (const item of relevant) {
    if (item.status === "success") {
      successWeight += item.confidence;
    } else if (
      item.status === "failure"
    ) {
      failureWeight += item.confidence;
    } else if (
      item.status === "mixed"
    ) {
      mixedWeight += item.confidence;
    }

    if (item.score !== undefined) {
      weightedScore +=
        item.score *
        item.confidence;
      scoreWeight +=
        item.confidence;
    }
  }

  const conflicting =
    successWeight > 0 &&
    failureWeight > 0;

  let status: LearningOutcomeStatus;

  if (conflicting) {
    status = "mixed";
  } else if (
    mixedWeight >
    Math.max(
      successWeight,
      failureWeight,
    )
  ) {
    status = "mixed";
  } else if (
    successWeight >
    failureWeight
  ) {
    status = "success";
  } else if (
    failureWeight >
    successWeight
  ) {
    status = "failure";
  } else {
    status = "mixed";
  }

  const totalWeight =
    successWeight +
    failureWeight +
    mixedWeight;

  const dominantWeight =
    Math.max(
      successWeight,
      failureWeight,
      mixedWeight,
    );

  const averageEvidenceConfidence =
    relevant.length === 0
      ? 0
      : totalWeight /
        relevant.length;

  const agreementRatio =
    totalWeight === 0
      ? 0
      : dominantWeight /
        totalWeight;

  const confidence =
    Math.max(
      0,
      Math.min(
        1,
        averageEvidenceConfidence *
          agreementRatio,
      ),
    );

  return {
    status,
    score:
      scoreWeight > 0
        ? Math.max(
            -1,
            Math.min(
              1,
              weightedScore /
                scoreWeight,
            ),
          )
        : undefined,
    confidence,
    conflicting,
  };
}

export function evaluateLearningExperience(
  experience: LearningExperience,
  outcomeObservations:
    readonly LearningOutcomeObservation[],
  feedbackObservations:
    readonly LearningFeedbackObservation[],
  evaluatedAt = new Date(),
): EvaluatedLearningExperience {
  const outcomes =
    outcomeObservations
      .filter(
        (item) =>
          item.experienceId ===
          experience.id,
      )
      .map(clone);

  const feedback =
    feedbackObservations
      .filter(
        (item) =>
          item.experienceId ===
          experience.id,
      )
      .map(clone);

  const resolvedOutcome =
    resolveOutcome(outcomes);

  const resolvedFeedback =
    resolveFeedback(feedback);

  const reasons:
    LearningEvaluationReason[] = [];

  if (
    resolvedFeedback.kind ===
    "correction"
  ) {
    addReason(
      reasons,
      "explicit-correction",
      "Explicit correction takes precedence as the strongest feedback signal.",
    );
  } else if (
    resolvedFeedback.kind ===
    "explicit-negative"
  ) {
    addReason(
      reasons,
      "explicit-negative-feedback",
      "Explicit negative feedback is present.",
    );
  } else if (
    resolvedFeedback.kind ===
    "explicit-positive"
  ) {
    addReason(
      reasons,
      "explicit-positive-feedback",
      "Explicit positive feedback is present.",
    );
  }

  if (
    resolvedOutcome.status ===
    "success"
  ) {
    addReason(
      reasons,
      "confirmed-success",
      "Observed outcomes resolve to success.",
    );
  } else if (
    resolvedOutcome.status ===
    "failure"
  ) {
    addReason(
      reasons,
      "confirmed-failure",
      "Observed outcomes resolve to failure.",
    );
  } else if (
    resolvedOutcome.status ===
    "mixed"
  ) {
    addReason(
      reasons,
      "mixed-outcomes",
      "Observed outcomes resolve to a mixed result.",
    );
  }

  if (resolvedOutcome.conflicting) {
    addReason(
      reasons,
      "conflicting-evidence",
      "Success and failure evidence conflict, so the result is not treated as certain.",
    );
  }

  if (
    resolvedOutcome.status !==
      "unknown" &&
    resolvedOutcome.confidence <
      0.6
  ) {
    addReason(
      reasons,
      "insufficient-outcome-confidence",
      "Outcome evidence exists but is not strong enough to be treated as highly reliable.",
    );
  }

  if (
    reasons.length === 0
  ) {
    addReason(
      reasons,
      "no-evaluation-signal",
      "No meaningful outcome or feedback signal is available yet.",
    );
  }

  const evaluationConfidence =
    Math.max(
      resolvedFeedback.confidence,
      resolvedOutcome.confidence,
    );

  return {
    experience: clone(experience),
    evaluatedAt:
      evaluatedAt.toISOString(),
    outcomeObservations:
      outcomes.sort(
        (left, right) =>
          left.observedAt.localeCompare(
            right.observedAt,
          ),
      ),
    feedbackObservations:
      feedback.sort(
        (left, right) =>
          left.observedAt.localeCompare(
            right.observedAt,
          ),
      ),
    resolvedOutcome: {
      status:
        resolvedOutcome.status,
      score:
        resolvedOutcome.score,
      confidence:
        resolvedOutcome.confidence,
    },
    resolvedFeedback,
    evaluationConfidence,
    reasons,
  };
}

