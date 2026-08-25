import {
  calculateCognitiveGoalPriorityScore,
} from "./goals";
import type {
  CognitiveGoal,
  GoalRelevanceAssessment,
  GoalRelevanceReason,
} from "./goalTypes";
import type {
  CognitiveAttentionSignal,
} from "./types";

function addReason(
  reasons: GoalRelevanceReason[],
  code:
    GoalRelevanceReason["code"],
  weight: number,
  detail: string,
): void {
  reasons.push({
    code,
    weight,
    detail,
  });
}

export function assessGoalRelevance(
  signal: CognitiveAttentionSignal,
  goal: CognitiveGoal,
): GoalRelevanceAssessment {
  const reasons:
    GoalRelevanceReason[] = [];

  let relevanceScore = 0;

  if (
    goal.scope.keys?.includes(
      signal.key,
    )
  ) {
    relevanceScore += 100;

    addReason(
      reasons,
      "exact-key",
      100,
      `Goal explicitly targets ${signal.key}.`,
    );
  } else {
    const prefix =
      goal.scope.keyPrefixes
        ?.filter((candidate) =>
          signal.key.startsWith(
            candidate,
          ),
        )
        .sort(
          (
            left,
            right,
          ) =>
            right.length -
            left.length,
        )[0];

    if (prefix) {
      relevanceScore += 75;

      addReason(
        reasons,
        "key-prefix",
        75,
        `Goal targets World State prefix ${prefix}.`,
      );
    } else if (
      goal.scope.namespaces?.includes(
        signal.record.namespace,
      )
    ) {
      relevanceScore += 50;

      addReason(
        reasons,
        "namespace",
        50,
        `Goal targets ${signal.record.namespace} World State facts.`,
      );
    }
  }

  return {
    goalId:
      goal.id,
    goalTitle:
      goal.title,
    goalPriority:
      goal.priority,
    relevanceScore:
      Math.min(
        100,
        relevanceScore,
      ),
    priorityScore:
      calculateCognitiveGoalPriorityScore(
        goal,
      ),
    reasons,
  };
}
