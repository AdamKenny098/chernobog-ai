import {
  getChernobogEventBus,
} from "../events";
import {
  getChernobogWorldStateRuntime,
} from "../worldState";
import {
  startChernobogWorldModelRuntime,
} from "./runtimeIntegration";
import type {
  ChernobogWorldModelProductionRuntime,
} from "./runtimeTypes";

type WorldModelRuntimeGlobals =
  typeof globalThis & {
    __chernobogWorldModelRuntimePromise?:
      Promise<ChernobogWorldModelProductionRuntime>;
  };

const worldModelGlobals =
  globalThis as WorldModelRuntimeGlobals;

export function getChernobogWorldModelRuntime():
  Promise<ChernobogWorldModelProductionRuntime> {
  if (
    !worldModelGlobals
      .__chernobogWorldModelRuntimePromise
  ) {
    const startup =
      getChernobogWorldStateRuntime()
        .then(
          (worldStateRuntime) =>
            startChernobogWorldModelRuntime({
              worldStateRuntime,
              eventBus:
                getChernobogEventBus(),
            }),
        )
        .catch((error) => {
          delete worldModelGlobals
            .__chernobogWorldModelRuntimePromise;

          throw error;
        });

    worldModelGlobals
      .__chernobogWorldModelRuntimePromise =
      startup;
  }

  return worldModelGlobals
    .__chernobogWorldModelRuntimePromise;
}
