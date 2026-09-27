import type {
  PersonalAttentionProvider,
  PersonalAttentionState,
} from "@chernobog/contracts/personal-assistance";

import {
  getChernobogWorldStateRuntime,
} from "../worldState";
import {
  ChernobogCognitiveRuntime,
} from "./cognitiveRuntime";
import type {
  CognitiveUserAttentionState,
} from "./initiativeTypes";

export interface ChernobogCognitiveRuntimeDependencies {
  personalAttentionProvider?:
    PersonalAttentionProvider;
}

type CognitiveRuntimeGlobals =
  typeof globalThis & {
    __chernobogCognitiveRuntimePromise?:
      Promise<ChernobogCognitiveRuntime>;
    __chernobogPersonalAttentionProvider?:
      PersonalAttentionProvider;
  };

const cognitiveGlobals =
  globalThis as CognitiveRuntimeGlobals;

const fallbackPersonalAttentionProvider:
  PersonalAttentionProvider = {
    getAttention: () => ({
      state: "available",
    }),
  };

function cognitiveAttentionState(
  state: PersonalAttentionState,
): CognitiveUserAttentionState {
  if (state === "busy") {
    return "busy";
  }

  if (state === "away") {
    return "away";
  }

  if (
    state === "dnd" ||
    state === "do-not-disturb"
  ) {
    return "do-not-disturb";
  }

  return "available";
}

export function getChernobogCognitiveRuntime(
  dependencies:
    ChernobogCognitiveRuntimeDependencies = {},
): Promise<ChernobogCognitiveRuntime> {
  if (dependencies.personalAttentionProvider) {
    cognitiveGlobals
      .__chernobogPersonalAttentionProvider =
        dependencies.personalAttentionProvider;
  }

  if (
    !cognitiveGlobals
      .__chernobogCognitiveRuntimePromise
  ) {
    const attentionProvider =
      cognitiveGlobals
        .__chernobogPersonalAttentionProvider ??
      fallbackPersonalAttentionProvider;

    const resolvePersonalAttentionForCognition =
      async ():
        Promise<CognitiveUserAttentionState> =>
          cognitiveAttentionState(
            (
              await attentionProvider
                .getAttention()
            ).state,
          );

    const startup =
      getChernobogWorldStateRuntime()
        .then(
          (worldStateRuntime) =>
            new ChernobogCognitiveRuntime({
              readWorldState:
                () =>
                  worldStateRuntime
                    .engine
                    .worldState
                    .snapshot(),
              resolveUserAttention:
                resolvePersonalAttentionForCognition,
            }),
        )
        .catch((error) => {
          delete cognitiveGlobals
            .__chernobogCognitiveRuntimePromise;
          throw error;
        });

    cognitiveGlobals
      .__chernobogCognitiveRuntimePromise =
      startup;
  }

  return cognitiveGlobals
    .__chernobogCognitiveRuntimePromise;
}
