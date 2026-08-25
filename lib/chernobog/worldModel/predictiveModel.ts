import type {
  WorldStateJsonValue,
} from "../worldState";
import type {
  ChernobogWorldModelTemporalModel,
} from "./temporalModel";
import type {
  WorldModelNextStateCandidate,
  WorldModelStatePrediction,
} from "./predictionTypes";
import {
  DEFAULT_WORLD_MODEL_PREDICTION_POLICY,
  validateWorldModelPredictionPolicy,
} from "./predictionPolicy";
import type {
  WorldModelPredictionPolicy,
} from "./predictionPolicy";
import {
  normalizeWorldModelEntityId,
} from "./validation";

function valueKey(
  value: WorldStateJsonValue,
): string {
  return JSON.stringify(value);
}

function cloneValue(
  value: WorldStateJsonValue,
): WorldStateJsonValue {
  return structuredClone(value);
}

export function predictNextWorldModelState(
  temporal:
    ChernobogWorldModelTemporalModel,
  entityId: string,
  stateKey: string,
  options: {
    now?: Date;
    policy?: WorldModelPredictionPolicy;
  } = {},
): WorldModelStatePrediction | undefined {
  const normalizedEntityId =
    normalizeWorldModelEntityId(
      entityId,
    );

  const normalizedStateKey =
    stateKey.trim().toLowerCase();

  if (!normalizedStateKey) {
    throw new Error(
      "world model prediction stateKey must not be empty.",
    );
  }

  const policy =
    options.policy ??
    DEFAULT_WORLD_MODEL_PREDICTION_POLICY;

  validateWorldModelPredictionPolicy(
    policy,
  );

  const observations =
    temporal.list({
      entityId:
        normalizedEntityId,
      stateKey:
        normalizedStateKey,
    });

  const latest =
    observations[
      observations.length - 1
    ];

  if (!latest) {
    return undefined;
  }

  const currentValue =
    latest.value;

  const transitions =
    temporal.transitions({
      entityId:
        normalizedEntityId,
      stateKey:
        normalizedStateKey,
    });

  const relevant =
    transitions.filter(
      (transition) =>
        valueKey(
          transition.fromValue,
        ) ===
        valueKey(
          currentValue,
        ),
    );

  const groups =
    new Map<
      string,
      {
        value: WorldStateJsonValue;
        transitions:
          typeof relevant;
      }
    >();

  for (
    const transition
    of relevant
  ) {
    const key =
      valueKey(
        transition.toValue,
      );

    const current =
      groups.get(key) ?? {
        value:
          cloneValue(
            transition.toValue,
          ),
        transitions: [],
      };

    current.transitions.push(
      transition,
    );

    groups.set(
      key,
      current,
    );
  }

  const sampleCount =
    relevant.length;

  const candidates:
    WorldModelNextStateCandidate[] = [
      ...groups.values(),
    ].map(
      (group) => {
        const averageDwellMs =
          group.transitions.length === 0
            ? undefined
            : group.transitions.reduce(
                (
                  sum,
                  transition,
                ) =>
                  sum +
                  transition.durationMs,
                0,
              ) /
              group.transitions.length;

        return {
          value:
            cloneValue(
              group.value,
            ),
          transitionCount:
            group.transitions.length,
          probability:
            sampleCount === 0
              ? 0
              : group.transitions.length /
                sampleCount,
          averageDwellMs,
        };
      },
    )
    .sort(
      (left, right) => {
        if (
          left.probability !==
          right.probability
        ) {
          return (
            right.probability -
            left.probability
          );
        }

        return valueKey(
          left.value,
        ).localeCompare(
          valueKey(
            right.value,
          ),
        );
      },
    );

  const winner =
    candidates[0];

  const repetitionFactor =
    Math.min(
      1,
      sampleCount /
        policy.strongTransitions,
    );

  const confidence =
    winner
      ? Math.max(
          0,
          Math.min(
            1,
            winner.probability *
              repetitionFactor,
          ),
        )
      : 0;

  let status:
    WorldModelStatePrediction["status"] =
      "insufficient";

  if (
    sampleCount >=
      policy.minimumTransitions &&
    winner &&
    winner.probability >=
      policy.minimumWinningProbability
  ) {
    if (
      sampleCount >=
        policy.strongTransitions &&
      confidence >= 0.7
    ) {
      status = "strong";
    } else if (
      sampleCount >=
        policy.moderateTransitions &&
      confidence >= 0.45
    ) {
      status = "moderate";
    } else {
      status = "weak";
    }
  }

  const canPredict =
    status !== "insufficient" &&
    Boolean(winner);

  return {
    id:
      `prediction:${normalizedEntityId}:${normalizedStateKey}:${latest.observedAt}`,
    entityId:
      normalizedEntityId,
    stateKey:
      normalizedStateKey,
    currentValue:
      cloneValue(
        currentValue,
      ),
    status,
    confidence,
    sampleCount,
    generatedAt:
      (
        options.now ??
        new Date()
      ).toISOString(),
    candidates:
      candidates.map(
        (candidate) =>
          structuredClone(
            candidate,
          ),
      ),
    predictedNextValue:
      canPredict && winner
        ? cloneValue(
            winner.value,
          )
        : undefined,
    predictedProbability:
      canPredict && winner
        ? winner.probability
        : undefined,
    expectedTransitionAfterMs:
      canPredict && winner
        ? winner.averageDwellMs
        : undefined,
    evidenceTransitionIds:
      relevant
        .map(
          (transition) =>
            transition.id,
        )
        .sort(),
  };
}
