import {
  getChernobogEventBus,
} from "../events";
import {
  startChernobogWorldStateRuntime,
  type ChernobogWorldStateRuntime,
} from "./runtimeIntegration";

type WorldStateRuntimeGlobals =
  typeof globalThis & {
    __chernobogWorldStateRuntimePromise?:
      Promise<ChernobogWorldStateRuntime>;
  };

const worldStateGlobals =
  globalThis as WorldStateRuntimeGlobals;

export function getChernobogWorldStateRuntime():
  Promise<ChernobogWorldStateRuntime> {
  if (
    !worldStateGlobals
      .__chernobogWorldStateRuntimePromise
  ) {
    const eventBus =
      getChernobogEventBus();

    const startup =
      startChernobogWorldStateRuntime({
        eventBus,
      }).catch((error) => {
        delete worldStateGlobals
          .__chernobogWorldStateRuntimePromise;
        throw error;
      });

    worldStateGlobals
      .__chernobogWorldStateRuntimePromise =
      startup;
  }

  return worldStateGlobals
    .__chernobogWorldStateRuntimePromise;
}
