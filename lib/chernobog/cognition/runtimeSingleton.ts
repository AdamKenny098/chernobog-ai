import {
  getChernobogWorldStateRuntime,
} from "../worldState";
import {
  resolvePersonalAttentionForCognition,
} from "../personalAssistance";
import {
  ChernobogCognitiveRuntime,
} from "./cognitiveRuntime";

type CognitiveRuntimeGlobals =
  typeof globalThis & {
    __chernobogCognitiveRuntimePromise?:
      Promise<ChernobogCognitiveRuntime>;
  };

const cognitiveGlobals =
  globalThis as CognitiveRuntimeGlobals;

export function getChernobogCognitiveRuntime():
  Promise<ChernobogCognitiveRuntime> {
  if (
    !cognitiveGlobals
      .__chernobogCognitiveRuntimePromise
  ) {
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
