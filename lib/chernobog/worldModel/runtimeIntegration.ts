import type {
  ChernobogWorldModelProductionRuntime,
  StartChernobogWorldModelRuntimeOptions,
} from "./runtimeTypes";
import {
  ChernobogWorldModelRuntime,
} from "./worldModelRuntime";

export function startChernobogWorldModelRuntime(
  options:
    StartChernobogWorldModelRuntimeOptions,
): ChernobogWorldModelProductionRuntime {
  const model =
    options.model ??
    new ChernobogWorldModelRuntime();

  let stopped = false;

  const ingestCurrentWorldState =
    () =>
      model.ingestWorldState(
        options.worldStateRuntime
          .engine
          .worldState
          .snapshot(),
      );

  ingestCurrentWorldState();

  const unsubscribe =
    options.eventBus.subscribe(
      {},
      () => {
        if (stopped) {
          return;
        }

        /*
         * The 11G runtime is started before this subscription.
         * Its Event Spine subscriber updates the canonical registry
         * synchronously before its persistence await, so this
         * subscriber reads the newly projected current state.
         */
        ingestCurrentWorldState();
      },
    );

  return {
    model,
    ingestCurrentWorldState,

    stop() {
      if (stopped) {
        return;
      }

      stopped = true;
      unsubscribe();
    },
  };
}
