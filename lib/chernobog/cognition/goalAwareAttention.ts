import {
  ChernobogGoalRegistry,
} from "./goalRegistry";
import {
  prioritizeAttentionForGoals,
} from "./prioritization";
import type {
  GoalPrioritizedAttention,
} from "./goalTypes";
import type {
  CognitiveAttentionSignal,
} from "./types";

export class ChernobogGoalAwareAttention {
  readonly goals:
    ChernobogGoalRegistry;

  constructor(
    goals =
      new ChernobogGoalRegistry(),
  ) {
    this.goals = goals;
  }

  prioritize(
    signal:
      CognitiveAttentionSignal,
  ): GoalPrioritizedAttention {
    return prioritizeAttentionForGoals(
      signal,
      this.goals.list({
        activeOnly: true,
      }),
    );
  }
}
