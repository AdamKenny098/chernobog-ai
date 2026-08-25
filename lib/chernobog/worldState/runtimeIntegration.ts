import type {
  ChernobogEventBus,
} from "../events/eventBus";
import {
  buildWorldStateSnapshot,
} from "./snapshotIntegrity";
import {
  JsonWorldStateSnapshotStore,
} from "./snapshotStore";
import {
  recoverWorldState,
} from "./recovery";
import {
  ChernobogWorldStateProjectionEngine,
} from "./projectionEngine";
import {
  registerChernobogDomainProjectors,
} from "./domainProjectors";
import type {
  WorldStateRecoveryResult,
} from "./snapshotTypes";

export interface StartChernobogWorldStateRuntimeOptions {
  eventBus: Pick<
    ChernobogEventBus,
    "subscribe" | "replay"
  >;
  engine?:
    ChernobogWorldStateProjectionEngine;
  store?:
    JsonWorldStateSnapshotStore;
  clock?: () => Date;
}

export interface ChernobogWorldStateRuntime {
  engine:
    ChernobogWorldStateProjectionEngine;
  store:
    JsonWorldStateSnapshotStore;
  recovery:
    WorldStateRecoveryResult;
  flush(): Promise<void>;
  stop(): Promise<void>;
}

export async function startChernobogWorldStateRuntime(
  options:
    StartChernobogWorldStateRuntimeOptions,
): Promise<ChernobogWorldStateRuntime> {
  const clock =
    options.clock ??
    (() => new Date());

  const engine =
    options.engine ??
    new ChernobogWorldStateProjectionEngine();

  const store =
    options.store ??
    new JsonWorldStateSnapshotStore();

  const unregisterProjectors =
    registerChernobogDomainProjectors(
      engine,
    );

  let persistenceChain:
    Promise<void> =
      Promise.resolve();

  const persist =
    (): Promise<void> => {
      persistenceChain =
        persistenceChain.then(
          async () => {
            const snapshot =
              buildWorldStateSnapshot(
                engine.worldState.snapshot(),
                clock(),
              );

            await store.save(snapshot);
          },
        );

      return persistenceChain;
    };

  let recovery:
    WorldStateRecoveryResult;

  try {
    recovery =
      await recoverWorldState({
        engine,
        eventBus:
          options.eventBus,
        store,
        now:
          clock,
      });
  } catch (error) {
    unregisterProjectors();
    throw error;
  }

  let stopped = false;

  const unsubscribe =
    options.eventBus.subscribe(
      {},
      async (event) => {
        if (stopped) {
          return;
        }

        engine.process(event);
        await persist();
      },
    );

  return {
    engine,
    store,
    recovery,

    async flush() {
      await persistenceChain;
    },

    async stop() {
      if (stopped) {
        await persistenceChain;
        return;
      }

      stopped = true;
      unsubscribe();
      unregisterProjectors();
      await persistenceChain;
    },
  };
}
