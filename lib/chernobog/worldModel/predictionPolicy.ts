export interface WorldModelPredictionPolicy {
  minimumTransitions: number;
  moderateTransitions: number;
  strongTransitions: number;
  minimumWinningProbability: number;
}

export const DEFAULT_WORLD_MODEL_PREDICTION_POLICY:
  WorldModelPredictionPolicy = {
    minimumTransitions: 2,
    moderateTransitions: 4,
    strongTransitions: 6,
    minimumWinningProbability: 0.55,
  };

export function validateWorldModelPredictionPolicy(
  policy: WorldModelPredictionPolicy,
): void {
  for (const [field, value] of [
    ["minimumTransitions", policy.minimumTransitions],
    ["moderateTransitions", policy.moderateTransitions],
    ["strongTransitions", policy.strongTransitions],
  ] as const) {
    if (
      !Number.isInteger(value) ||
      value < 1
    ) {
      throw new Error(
        `world model prediction ${field} must be an integer of at least 1.`,
      );
    }
  }

  if (
    policy.moderateTransitions <
      policy.minimumTransitions ||
    policy.strongTransitions <
      policy.moderateTransitions
  ) {
    throw new Error(
      "world model prediction transition thresholds must be nondecreasing.",
    );
  }

  if (
    !Number.isFinite(
      policy.minimumWinningProbability,
    ) ||
    policy.minimumWinningProbability < 0 ||
    policy.minimumWinningProbability > 1
  ) {
    throw new Error(
      "world model prediction minimumWinningProbability must be between 0 and 1.",
    );
  }
}
