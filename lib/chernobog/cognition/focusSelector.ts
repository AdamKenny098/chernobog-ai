import type {
  CognitiveGoal,
} from "./goalTypes";
import {
  prioritizeAttentionForGoals,
} from "./prioritization";
import type {
  CognitiveAttentionSignal,
} from "./types";
import type {
  CognitiveFocusCandidate,
  CognitiveFocusPolicy,
  CognitiveFocusSelection,
} from "./focusTypes";

export const DEFAULT_COGNITIVE_FOCUS_POLICY:
  CognitiveFocusPolicy = {
    minimumFocusScore: 40,
    switchMargin: 10,
    maxCandidates: 8,
  };

function validatePolicy(
  policy: CognitiveFocusPolicy,
): void {
  if (
    !Number.isFinite(
      policy.minimumFocusScore,
    ) ||
    policy.minimumFocusScore < 0 ||
    policy.minimumFocusScore > 100
  ) {
    throw new Error(
      "cognitive focus minimumFocusScore must be between 0 and 100.",
    );
  }

  if (
    !Number.isFinite(
      policy.switchMargin,
    ) ||
    policy.switchMargin < 0 ||
    policy.switchMargin > 100
  ) {
    throw new Error(
      "cognitive focus switchMargin must be between 0 and 100.",
    );
  }

  if (
    !Number.isInteger(
      policy.maxCandidates,
    ) ||
    policy.maxCandidates < 1
  ) {
    throw new Error(
      "cognitive focus maxCandidates must be a positive integer.",
    );
  }
}

function cloneCandidate(
  candidate: CognitiveFocusCandidate,
): CognitiveFocusCandidate {
  return structuredClone(
    candidate,
  );
}

export function rankCognitiveFocusCandidates(
  signals:
    readonly CognitiveAttentionSignal[],
  goals:
    readonly CognitiveGoal[],
  policy:
    CognitiveFocusPolicy =
      DEFAULT_COGNITIVE_FOCUS_POLICY,
): CognitiveFocusCandidate[] {
  validatePolicy(policy);

  const ranked =
    signals
      .map((signal) => {
        const prioritized =
          prioritizeAttentionForGoals(
            signal,
            goals,
          );

        return {
          signal:
            structuredClone(
              signal,
            ),
          prioritized,
        };
      })
      .sort((left, right) => {
        if (
          left.prioritized.score !==
          right.prioritized.score
        ) {
          return (
            right.prioritized.score -
            left.prioritized.score
          );
        }

        if (
          left.prioritized.goalBoost !==
          right.prioritized.goalBoost
        ) {
          return (
            right.prioritized.goalBoost -
            left.prioritized.goalBoost
          );
        }

        if (
          left.signal.generatedAt !==
          right.signal.generatedAt
        ) {
          return (
            right.signal.generatedAt
              .localeCompare(
                left.signal.generatedAt,
              )
          );
        }

        return left.signal.key.localeCompare(
          right.signal.key,
        );
      })
      .slice(
        0,
        policy.maxCandidates,
      );

  return ranked.map(
    (
      entry,
      index,
    ) => ({
      rank:
        index + 1,
      eligible:
        entry.prioritized.score >=
        policy.minimumFocusScore,
      signal:
        entry.signal,
      prioritized:
        structuredClone(
          entry.prioritized,
        ),
    }),
  );
}

export function selectCognitiveFocus(
  signals:
    readonly CognitiveAttentionSignal[],
  goals:
    readonly CognitiveGoal[],
  previousKey?: string,
  policy:
    CognitiveFocusPolicy =
      DEFAULT_COGNITIVE_FOCUS_POLICY,
): CognitiveFocusSelection {
  const candidates =
    rankCognitiveFocusCandidates(
      signals,
      goals,
      policy,
    );

  if (
    candidates.length === 0
  ) {
    return {
      reason:
        "no-candidates",
      changed:
        previousKey !== undefined,
      previousKey,
      candidates: [],
    };
  }

  const eligible =
    candidates.filter(
      (candidate) =>
        candidate.eligible,
    );

  if (
    eligible.length === 0
  ) {
    return {
      reason:
        "below-threshold",
      changed:
        previousKey !== undefined,
      previousKey,
      candidates:
        structuredClone(
          candidates,
        ),
    };
  }

  const challenger =
    eligible[0];

  if (!previousKey) {
    return {
      reason:
        "initial-focus",
      changed: true,
      previousKey,
      selected:
        cloneCandidate(
          challenger,
        ),
      candidates:
        structuredClone(
          candidates,
        ),
    };
  }

  const incumbent =
    eligible.find(
      (candidate) =>
        candidate.signal.key ===
        previousKey,
    );

  if (!incumbent) {
    return {
      reason:
        "switched-focus",
      changed:
        challenger.signal.key !==
        previousKey,
      previousKey,
      selected:
        cloneCandidate(
          challenger,
        ),
      candidates:
        structuredClone(
          candidates,
        ),
    };
  }

  if (
    challenger.signal.key ===
    incumbent.signal.key
  ) {
    return {
      reason:
        "retained-focus",
      changed: false,
      previousKey,
      selected:
        cloneCandidate(
          incumbent,
        ),
      candidates:
        structuredClone(
          candidates,
        ),
    };
  }

  const switchThreshold =
    incumbent.prioritized.score +
    policy.switchMargin;

  if (
    challenger.prioritized.score <
    switchThreshold
  ) {
    return {
      reason:
        "retained-focus",
      changed: false,
      previousKey,
      selected:
        cloneCandidate(
          incumbent,
        ),
      candidates:
        structuredClone(
          candidates,
        ),
    };
  }

  return {
    reason:
      "switched-focus",
    changed: true,
    previousKey,
    selected:
      cloneCandidate(
        challenger,
      ),
    candidates:
      structuredClone(
        candidates,
      ),
  };
}
