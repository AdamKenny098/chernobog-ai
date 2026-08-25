import type {
  ChernobogEvent,
  ChernobogEventHandler,
} from "../events/types";
import type {
  ChernobogEventBus,
} from "../events/eventBus";
import {
  buildWorldStateSnapshot,
} from "./snapshotIntegrity";
import {
  JsonWorldStateSnapshotStore,
  WorldStateSnapshotCorruptionError,
} from "./snapshotStore";
import type {
  WorldStateRecoveryResult,
} from "./snapshotTypes";
import {
  ChernobogWorldStateProjectionEngine,
} from "./projectionEngine";

export interface RecoverWorldStateOptions {
  engine: ChernobogWorldStateProjectionEngine;
  eventBus: Pick<
    ChernobogEventBus,
    "replay"
  >;
  store?: JsonWorldStateSnapshotStore;
  now?: () => Date;
}

function timestampMs(
  value: string,
  field: string,
): number {
  const result =
    new Date(value).getTime();

  if (Number.isNaN(result)) {
    throw new Error(
      `${field} must be a valid timestamp.`,
    );
  }

  return result;
}

async function replayAfterSnapshot(
  engine: ChernobogWorldStateProjectionEngine,
  eventBus: Pick<
    ChernobogEventBus,
    "replay"
  >,
  snapshotCreatedAt: string,
): Promise<{
  replayedEvents: number;
  failedEvents: number;
  catchUpEvents: number;
}> {
  const cutoffMs =
    timestampMs(
      snapshotCreatedAt,
      "worldState.snapshot.createdAt",
    );

  let catchUpEvents = 0;

  const result =
    await eventBus.replay(
      ((event: ChernobogEvent) => {
        const receivedAtMs =
          timestampMs(
            event.receivedAt,
            "event.receivedAt",
          );

        if (
          receivedAtMs <= cutoffMs
        ) {
          return;
        }

        catchUpEvents += 1;
        engine.process(event);
      }) as ChernobogEventHandler,
    );

  return {
    replayedEvents:
      result.replayedEvents,
    failedEvents:
      result.failedEvents,
    catchUpEvents,
  };
}

async function persistCurrentState(
  engine: ChernobogWorldStateProjectionEngine,
  store: JsonWorldStateSnapshotStore,
  now: Date,
): Promise<void> {
  const snapshot =
    buildWorldStateSnapshot(
      engine.worldState.snapshot(),
      now,
    );

  await store.save(snapshot);
}

export async function recoverWorldState(
  options: RecoverWorldStateOptions,
): Promise<WorldStateRecoveryResult> {
  const store =
    options.store ??
    new JsonWorldStateSnapshotStore();

  const clock =
    options.now ??
    (() => new Date());

  let loaded:
    | Awaited<
        ReturnType<
          JsonWorldStateSnapshotStore["load"]
        >
      >
    | undefined;

  let quarantinedPath:
    | string
    | undefined;

  try {
    loaded =
      await store.load();
  } catch (error) {
    if (
      !(
        error instanceof
        WorldStateSnapshotCorruptionError
      )
    ) {
      throw error;
    }

    quarantinedPath =
      await store.quarantineCorruptSnapshot(
        clock(),
      );
  }

  if (
    loaded?.status === "loaded"
  ) {
    options.engine.worldState.replace(
      loaded.snapshot.records,
    );

    const catchUp =
      await replayAfterSnapshot(
        options.engine,
        options.eventBus,
        loaded.snapshot.createdAt,
      );

    if (
      catchUp.failedEvents > 0
    ) {
      throw new Error(
        "World State catch-up replay failed; refusing to persist partial state.",
      );
    }

    await persistCurrentState(
      options.engine,
      store,
      clock(),
    );

    return {
      mode:
        catchUp.catchUpEvents > 0
          ? "snapshot-caught-up"
          : "snapshot-restored",
      restoredRecords:
        loaded.snapshot.recordCount,
      replayedEvents:
        catchUp.replayedEvents,
      catchUpEvents:
        catchUp.catchUpEvents,
      stateRecords:
        options.engine.worldState.size,
      persistedSnapshotPath:
        store.filePath,
    };
  }

  const rebuilt =
    await options.engine
      .rebuildFromEventHistory(
        options.eventBus,
      );

  if (
    rebuilt.failedEvents > 0
  ) {
    throw new Error(
      "World State history replay failed; refusing to persist partial state.",
    );
  }

  await persistCurrentState(
    options.engine,
    store,
    clock(),
  );

  return {
    mode:
      quarantinedPath
        ? "corrupt-snapshot-rebuilt"
        : "history-rebuilt",
    restoredRecords: 0,
    replayedEvents:
      rebuilt.replayedEvents,
    catchUpEvents: 0,
    stateRecords:
      rebuilt.stateRecords,
    quarantinedPath,
    persistedSnapshotPath:
      store.filePath,
  };
}
