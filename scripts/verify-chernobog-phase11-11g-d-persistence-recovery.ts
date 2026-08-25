import assert from "node:assert/strict";
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type {
  ChernobogEvent,
  ChernobogEventHandler,
} from "../lib/chernobog/events/types";
import {
  ChernobogWorldStateProjectionEngine,
  ChernobogWorldStateRegistry,
  JsonWorldStateSnapshotStore,
  WorldStateSnapshotCorruptionError,
  buildWorldStateSnapshot,
  hashWorldStateRecords,
  recoverWorldState,
} from "../lib/chernobog/worldState";

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

function makeEvent(
  overrides: Partial<ChernobogEvent> = {},
): ChernobogEvent {
  return {
    id: "evt-d-001",
    type: "runtime.ollama.health_changed",
    occurredAt: "2026-08-24T21:00:00.000Z",
    receivedAt: "2026-08-24T21:00:01.000Z",
    source: {
      subsystem: "ollama-health",
      nodeId: "desktop",
    },
    severity: "info",
    payload: {
      health: "healthy",
    },
    metadata: {
      schemaVersion: 1,
      confidence: 0.95,
    },
    ...overrides,
  };
}

function registerHealthProjector(
  engine: ChernobogWorldStateProjectionEngine,
): void {
  engine.register({
    id: "ollama-health-projector",
    eventTypes: [
      "runtime.ollama.health_changed",
    ],
    project(input) {
      const payload =
        input.payload as {
          health: string;
        };

      return {
        key: "service.ollama.health",
        value: payload.health,
        ttlMs: 300_000,
      };
    },
  });
}

function replayBus(
  events: readonly ChernobogEvent[],
) {
  return {
    async replay(
      handler: ChernobogEventHandler,
    ) {
      let replayedEvents = 0;
      const errors: {
        eventId: string;
        eventType: string;
        index: number;
        message: string;
      }[] = [];

      for (
        let index = 0;
        index < events.length;
        index += 1
      ) {
        const event = events[index];

        try {
          await handler(event);
          replayedEvents += 1;
        } catch (error) {
          errors.push({
            eventId: event.id,
            eventType: event.type,
            index,
            message:
              error instanceof Error
                ? error.message
                : String(error),
          });
          break;
        }
      }

      return {
        totalEvents: events.length,
        replayedEvents,
        failedEvents: errors.length,
        startedAt:
          "2026-08-24T22:00:00.000Z",
        finishedAt:
          "2026-08-24T22:00:01.000Z",
        errors,
      };
    },
  };
}

async function main(): Promise<void> {
  console.log(
    "Chernobog Phase 11G-D - Persistence & Recovery",
  );
  console.log(
    "================================================",
  );

  const tempRoot =
    await mkdtemp(
      path.join(
        os.tmpdir(),
        "chernobog-11g-d-",
      ),
    );

  try {
    const filePath =
      path.join(
        tempRoot,
        "world-state",
        "current.json",
      );

    const quarantineDirectory =
      path.join(
        tempRoot,
        "world-state",
        "quarantine",
      );

    const store =
      new JsonWorldStateSnapshotStore({
        filePath,
        quarantineDirectory,
      });

    const registry =
      new ChernobogWorldStateRegistry(
        () =>
          new Date(
            "2026-08-24T21:00:05.000Z",
          ),
      );

    registry.upsert({
      key: "service.ollama.health",
      value: "healthy",
      observedAt:
        "2026-08-24T21:00:00.000Z",
      confidence: 0.95,
      provenance: {
        eventId: "evt-base",
        eventType:
          "runtime.ollama.health_changed",
        eventReceivedAt:
          "2026-08-24T21:00:01.000Z",
        projectorId:
          "ollama-health-projector",
        source: {
          subsystem: "ollama-health",
        },
      },
    });

    const snapshot =
      buildWorldStateSnapshot(
        registry.snapshot(),
        new Date(
          "2026-08-24T21:00:10.000Z",
        ),
      );

    assert.equal(
      snapshot.recordCount,
      1,
    );
    assert.equal(
      snapshot.recordsSha256,
      hashWorldStateRecords(
        snapshot.records,
      ),
    );
    pass(
      "snapshot builder records count and deterministic SHA-256 integrity",
    );

    await store.save(snapshot);

    const loaded =
      await store.load();

    assert.equal(
      loaded.status,
      "loaded",
    );

    if (
      loaded.status !== "loaded"
    ) {
      throw new Error(
        "Expected loaded snapshot.",
      );
    }

    assert.equal(
      loaded.snapshot.createdAt,
      "2026-08-24T21:00:10.000Z",
    );
    assert.equal(
      loaded.snapshot.records[0]?.value,
      "healthy",
    );
    pass(
      "snapshot store atomically persists and loads validated state",
    );

    const directoryEntries =
      await readdir(
        path.dirname(filePath),
      );

    assert.equal(
      directoryEntries.some(
        (entry) =>
          entry.includes(".tmp-"),
      ),
      false,
    );
    pass(
      "successful atomic save leaves no temporary snapshot files",
    );

    const catchUpEngine =
      new ChernobogWorldStateProjectionEngine({
        worldState:
          new ChernobogWorldStateRegistry(
            () =>
              new Date(
                "2026-08-24T21:00:30.000Z",
              ),
          ),
      });

    registerHealthProjector(
      catchUpEngine,
    );

    const catchUpResult =
      await recoverWorldState({
        engine: catchUpEngine,
        eventBus: replayBus([
          makeEvent({
            id: "evt-before-snapshot",
            occurredAt:
              "2026-08-24T21:00:05.000Z",
            receivedAt:
              "2026-08-24T21:00:06.000Z",
            payload: {
              health: "unhealthy",
            },
          }),
          makeEvent({
            id: "evt-after-snapshot",
            occurredAt:
              "2026-08-24T21:00:20.000Z",
            receivedAt:
              "2026-08-24T21:00:21.000Z",
            payload: {
              health: "unhealthy",
            },
          }),
        ]) as never,
        store,
        now: () =>
          new Date(
            "2026-08-24T21:00:30.000Z",
          ),
      });

    assert.equal(
      catchUpResult.mode,
      "snapshot-caught-up",
    );
    assert.equal(
      catchUpResult.restoredRecords,
      1,
    );
    assert.equal(
      catchUpResult.catchUpEvents,
      1,
    );
    assert.equal(
      catchUpEngine.worldState.get(
        "service.ollama.health",
      )?.value,
      "unhealthy",
    );
    assert.equal(
      catchUpEngine.worldState.get(
        "service.ollama.health",
      )?.provenance?.eventId,
      "evt-after-snapshot",
    );
    pass(
      "startup recovery restores snapshot baseline and applies only post-snapshot Event Spine catch-up",
    );

    const missingPath =
      path.join(
        tempRoot,
        "missing",
        "current.json",
      );

    const missingStore =
      new JsonWorldStateSnapshotStore({
        filePath: missingPath,
        quarantineDirectory:
          path.join(
            tempRoot,
            "missing",
            "quarantine",
          ),
      });

    const rebuildEngine =
      new ChernobogWorldStateProjectionEngine({
        worldState:
          new ChernobogWorldStateRegistry(
            () =>
              new Date(
                "2026-08-24T21:10:00.000Z",
              ),
          ),
      });

    registerHealthProjector(
      rebuildEngine,
    );

    const rebuildResult =
      await recoverWorldState({
        engine: rebuildEngine,
        eventBus: replayBus([
          makeEvent({
            id: "evt-rebuild-1",
            occurredAt:
              "2026-08-24T21:05:00.000Z",
            receivedAt:
              "2026-08-24T21:05:01.000Z",
            payload: {
              health: "unhealthy",
            },
          }),
          makeEvent({
            id: "evt-rebuild-2",
            occurredAt:
              "2026-08-24T21:06:00.000Z",
            receivedAt:
              "2026-08-24T21:06:01.000Z",
            payload: {
              health: "healthy",
            },
          }),
        ]) as never,
        store: missingStore,
        now: () =>
          new Date(
            "2026-08-24T21:10:00.000Z",
          ),
      });

    assert.equal(
      rebuildResult.mode,
      "history-rebuilt",
    );
    assert.equal(
      rebuildResult.replayedEvents,
      2,
    );
    assert.equal(
      rebuildEngine.worldState.get(
        "service.ollama.health",
      )?.value,
      "healthy",
    );

    const rebuiltPersisted =
      await missingStore.load();

    assert.equal(
      rebuiltPersisted.status,
      "loaded",
    );
    pass(
      "missing snapshots trigger deterministic full Event Spine rebuild and fresh persistence",
    );

    await writeFile(
      missingPath,
      "{ definitely not valid json",
      "utf8",
    );

    await assert.rejects(
      () =>
        missingStore.load(),
      WorldStateSnapshotCorruptionError,
    );
    pass(
      "corrupt snapshot content is detected before restore",
    );

    const corruptionEngine =
      new ChernobogWorldStateProjectionEngine({
        worldState:
          new ChernobogWorldStateRegistry(
            () =>
              new Date(
                "2026-08-24T21:20:00.000Z",
              ),
          ),
      });

    registerHealthProjector(
      corruptionEngine,
    );

    const corruptionResult =
      await recoverWorldState({
        engine: corruptionEngine,
        eventBus: replayBus([
          makeEvent({
            id: "evt-corruption-rebuild",
            occurredAt:
              "2026-08-24T21:19:00.000Z",
            receivedAt:
              "2026-08-24T21:19:01.000Z",
            payload: {
              health: "healthy",
            },
          }),
        ]) as never,
        store: missingStore,
        now: () =>
          new Date(
            "2026-08-24T21:20:00.000Z",
          ),
      });

    assert.equal(
      corruptionResult.mode,
      "corrupt-snapshot-rebuilt",
    );
    assert.ok(
      corruptionResult.quarantinedPath,
    );

    if (
      !corruptionResult.quarantinedPath
    ) {
      throw new Error(
        "Expected quarantined corrupt snapshot.",
      );
    }

    const quarantinedBody =
      await readFile(
        corruptionResult.quarantinedPath,
        "utf8",
      );

    assert.equal(
      quarantinedBody,
      "{ definitely not valid json",
    );

    const recoveredCurrent =
      await missingStore.load();

    assert.equal(
      recoveredCurrent.status,
      "loaded",
    );
    assert.equal(
      corruptionEngine.worldState.get(
        "service.ollama.health",
      )?.value,
      "healthy",
    );
    pass(
      "corrupt snapshots are quarantined, rebuilt from history, and replaced with clean state",
    );

    if (
      recoveredCurrent.status !== "loaded"
    ) {
      throw new Error(
        "Expected recovered snapshot.",
      );
    }

    const tampered =
      structuredClone(
        recoveredCurrent.snapshot,
      );

    tampered.records[0]!.value =
      "tampered";

    await writeFile(
      missingPath,
      `${JSON.stringify(
        tampered,
        null,
        2,
      )}\n`,
      "utf8",
    );

    await assert.rejects(
      () =>
        missingStore.load(),
      WorldStateSnapshotCorruptionError,
    );
    pass(
      "snapshot SHA-256 detects silent record tampering",
    );

    const replaceRegistry =
      new ChernobogWorldStateRegistry();

    replaceRegistry.replace(
      snapshot.records,
    );

    assert.equal(
      replaceRegistry.size,
      1,
    );
    assert.equal(
      replaceRegistry.get(
        "service.ollama.health",
      )?.value,
      "healthy",
    );
    pass(
      "registry can restore a validated snapshot without changing factual values",
    );

    assert.throws(() =>
      replaceRegistry.replace([
        snapshot.records[0]!,
        snapshot.records[0]!,
      ]),
    );
    pass(
      "snapshot restore rejects duplicate world-state keys",
    );
  } finally {
    await rm(
      tempRoot,
      {
        recursive: true,
        force: true,
      },
    );
  }

  console.log(
    "================================================",
  );
  console.log(
    "PASS Phase 11G-D Persistence & Recovery acceptance",
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
