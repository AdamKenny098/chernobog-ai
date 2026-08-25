import {
  salienceBandForScore,
} from "./salience";
import {
  assessGoalRelevance,
} from "./goalRelevance";
import type {
  CognitiveGoal,
  GoalPrioritizedAttention,
} from "./goalTypes";
import type {
  CognitiveAttentionSignal,
} from "./types";

function clampScore(
  value: number,
): number {
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(value),
    ),
  );
}

export function prioritizeAttentionForGoals(
  signal: CognitiveAttentionSignal,
  goals:
    readonly CognitiveGoal[],
): GoalPrioritizedAttention {
  const matchedGoals =
    goals
      .filter(
        (goal) =>
          goal.status ===
          "active",
      )
      .map((goal) =>
        assessGoalRelevance(
          signal,
          goal,
        ),
      )
      .filter(
        (assessment) =>
          assessment.relevanceScore >
          0,
      )
      .sort((left, right) => {
        const relevance =
          right.relevanceScore -
          left.relevanceScore;

        if (
          relevance !== 0
        ) {
          return relevance;
        }

        const priority =
          right.priorityScore -
          left.priorityScore;

        if (
          priority !== 0
        ) {
          return priority;
        }

        return left.goalId.localeCompare(
          right.goalId,
        );
      });

  const rawBoost =
    matchedGoals.reduce(
      (total, match) =>
        total +
        (
          match.relevanceScore /
          100
        ) *
          (
            match.priorityScore /
            100
          ) *
          30,
      0,
    );

  const goalBoost =
    Math.min(
      35,
      Math.round(rawBoost),
    );

  const score =
    clampScore(
      signal.score +
      goalBoost,
    );

  return {
    signal:
      structuredClone(
        signal,
      ),
    baseScore:
      signal.score,
    goalBoost,
    score,
    band:
      salienceBandForScore(
        score,
      ),
    matchedGoals:
      structuredClone(
        matchedGoals,
      ),
  };
}
