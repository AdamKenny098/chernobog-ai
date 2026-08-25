import assert from "node:assert/strict";
import {
  mkdtemp,
  rm,
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
  queryPersistedWorldState,
  startChernobogWorldStateRuntime,
} from "../lib/chernobog/worldState";

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

function makeEvent(
  id: string,
  type: string,
  receivedAt: string,
  options: {
    occurredAt?: string;
    subsystem?: string;
    nodeId?: string;
    subject?: string;
    scope?: string;
    severity?:
      ChernobogEvent["severity"];
    payload?: unknown;
    confidence?: number;
  } = {},
): ChernobogEvent {
  return {
    id,
    type,
    occurredAt:
      options.occurredAt ??
      receivedAt,
    receivedAt,
    source: {
      subsystem:
        options.subsystem ??
        "verification",
      nodeId:
        options.nodeId,
    },
    severity:
      options.severity ??
      "info",
    subject:
      options.subject,
    scope:
      options.scope,
    payload:
      options.payload ?? {},
    metadata: {
      schemaVersion: 1,
      confidence:
        options.confidence,
    },
  };
}

class VerificationEventBus {
  private readonly history:
    ChernobogEvent[];

  private handlers =
    new Set<ChernobogEventHandler>();

  constructor(
    history:
      readonly ChernobogEvent[],
  ) {
    this.history =
      [...history];
  }

  subscribe(
    _filter: unknown,
    handler:
      ChernobogEventHandler,
  ): () => void {
    this.handlers.add(handler);

    return () => {
      this.handlers.delete(handler);
    };
  }

  async replay(
    handler:
      ChernobogEventHandler,
  ) {
    let replayedEvents = 0;

    for (
      const event
      of this.history
    ) {
      await handler(event);
      replayedEvents += 1;
    }

    return {
      totalEvents:
        this.history.length,
      replayedEvents,
      failedEvents: 0,
      startedAt:
        "2026-08-24T22:00:00.000Z",
      finishedAt:
        "2026-08-24T22:00:01.000Z",
      errors: [],
    };
  }

  async emit(
    event: ChernobogEvent,
  ): Promise<void> {
    this.history.push(event);

    for (
      const handler
      of [...this.handlers]
    ) {
      await handler(event);
    }
  }
}

async function main(): Promise<void> {
  console.log(
    "Chernobog Phase 11G-F - Integration & Full Acceptance",
  );
  console.log(
    "=======================================================",
  );

  const tempRoot =
    await mkdtemp(
      path.join(
        os.tmpdir(),
        "chernobog-11g-f-",
      ),
    );

  try {
    const snapshotPath =
      path.join(
        tempRoot,
        "world-state",
        "current.json",
      );

    const store =
      new JsonWorldStateSnapshotStore({
        filePath:
          snapshotPath,
      });

    let now =
      new Date(
        "2026-08-24T22:40:00.000Z",
      );

    const history: ChernobogEvent[] = [
      makeEvent(
        "evt-runtime",
        "runtime.health_observed",
        "2026-08-24T22:30:01.000Z",
        {
          subsystem:
            "runtime-health",
          subject:
            "ollama",
          scope:
            "runtime",
          payload: {
            kind: "service",
            id: "ollama",
            status: "healthy",
            nodeId: "desktop",
            platform: "win32",
            latencyMs: 12,
            capabilities: [
              "chat",
            ],
            observedAt:
              "2026-08-24T22:30:00.000Z",
          },
        },
      ),

      makeEvent(
        "evt-service",
        "service.healthy",
        "2026-08-24T22:30:02.000Z",
        {
          subsystem:
            "runtime-health",
          subject:
            "ollama",
          payload: {
            kind: "service",
            id: "ollama",
            status: "healthy",
            nodeId: "desktop",
            observedAt:
              "2026-08-24T22:30:00.000Z",
          },
        },
      ),

      makeEvent(
        "evt-node",
        "runtime.node_online",
        "2026-08-24T22:30:03.000Z",
        {
          subsystem:
            "runtime-health",
          subject:
            "desktop",
          payload: {
            kind: "runtime-node",
            id: "desktop",
            status: "healthy",
            nodeId: "desktop",
          },
        },
      ),

      makeEvent(
        "evt-model",
        "runtime.model_available",
        "2026-08-24T22:30:04.000Z",
        {
          subsystem:
            "runtime-health",
          subject:
            "ollama",
          payload: {
            kind: "model-provider",
            id: "ollama",
            status: "healthy",
          },
        },
      ),

      makeEvent(
        "evt-role",
        "runtime.model_role_observed",
        "2026-08-24T22:30:05.000Z",
        {
          subsystem:
            "model-availability",
          subject:
            "reasoning",
          payload: {
            providerId: "ollama",
            nodeId: "desktop",
            role: "reasoning",
            configuredModel:
              "qwen3",
            source: "configured",
            available: true,
            matchedInstalledModel:
              "qwen3:latest",
          },
        },
      ),

      makeEvent(
        "evt-git",
        "project.git_observed",
        "2026-08-24T22:30:06.000Z",
        {
          subsystem:
            "project-operations",
          subject:
            "chernobog-ai",
          scope:
            "project:chernobog-ai",
          payload: {
            repository: true,
            repositoryName:
              "chernobog-ai",
            branch: "main",
            head:
              "abcdef1234567890",
            detached: false,
            ahead: 0,
            behind: 0,
            dirty: false,
            stagedChanges: 0,
            unstagedChanges: 0,
            untrackedFiles: 0,
            conflicts: 0,
          },
        },
      ),

      makeEvent(
        "evt-validation",
        "project.validation_completed",
        "2026-08-24T22:30:07.000Z",
        {
          subsystem:
            "project-operations",
          subject:
            "typecheck",
          payload: {
            validation:
              "typecheck",
            command:
              "npm run typecheck",
            durationMs: 1500,
            exitCode: 0,
          },
        },
      ),

      makeEvent(
        "evt-tool",
        "tool.completed",
        "2026-08-24T22:30:08.000Z",
        {
          subsystem:
            "tools",
          subject:
            "get_project_git_state",
          payload: {
            toolName:
              "get_project_git_state",
            durationMs: 55,
          },
        },
      ),

      makeEvent(
        "evt-desktop",
        "desktop.observation",
        "2026-08-24T22:30:09.000Z",
        {
          subsystem:
            "desktop-observation",
          subject:
            "vscode",
          payload: {
            application:
              "Visual Studio Code",
            active: true,
          },
        },
      ),

      makeEvent(
        "evt-backup",
        "backup.observation",
        "2026-08-24T22:30:10.000Z",
        {
          subsystem:
            "backup-storage",
          subject:
            "primary",
          payload: {
            status: "healthy",
          },
        },
      ),

      makeEvent(
        "evt-storage",
        "storage.observation",
        "2026-08-24T22:30:11.000Z",
        {
          subsystem:
            "backup-storage",
          subject:
            "vault",
          payload: {
            available: true,
          },
        },
      ),

      makeEvent(
        "evt-execution",
        "execution.observation",
        "2026-08-24T22:30:12.000Z",
        {
          subsystem:
            "execution-runtime",
          subject:
            "task-42",
          payload: {
            status: "completed",
          },
        },
      ),
    ];

    const bus =
      new VerificationEventBus(
        history,
      );

    const engine =
      new ChernobogWorldStateProjectionEngine({
        worldState:
          new ChernobogWorldStateRegistry(
            () => now,
          ),
      });

    const runtime =
      await startChernobogWorldStateRuntime({
        eventBus:
          bus as never,
        engine,
        store,
        clock:
          () => now,
      });

    assert.equal(
      runtime.recovery.mode,
      "history-rebuilt",
    );
    pass(
      "cold start reconstructs World State from retained Event Spine history",
    );

    assert.equal(
      runtime.engine.worldState.get(
        "service.ollama.health",
      )?.value,
      "healthy",
    );

    assert.equal(
      runtime.engine.worldState.get(
        "runtime.node.desktop.online",
      )?.value,
      true,
    );

    assert.equal(
      runtime.engine.worldState.get(
        "model.ollama.available",
      )?.value,
      true,
    );

    assert.equal(
      runtime.engine.worldState.get(
        "model.role.reasoning.available",
      )?.value,
      true,
    );
    pass(
      "real runtime health and model contracts project into canonical facts",
    );

    assert.equal(
      runtime.engine.worldState.get(
        "project.chernobog-ai.git.dirty",
      )?.value,
      false,
    );

    assert.equal(
      runtime.engine.worldState.get(
        "project.chernobog-ai.git.branch",
      )?.value,
      "main",
    );

    assert.equal(
      runtime.engine.worldState.get(
        "project.validation.typecheck.status",
      )?.value,
      "passed",
    );
    pass(
      "real Git and project validation contracts project into current project facts",
    );

    assert.equal(
      runtime.engine.worldState.get(
        "execution.tool.get-project-git-state.status",
      )?.value,
      "completed",
    );
    pass(
      "real tool lifecycle contracts project into execution state",
    );

    const genericKeys =
      runtime.engine.worldState
        .snapshot()
        .map((record) =>
          record.key,
        );

    assert.ok(
      genericKeys.includes(
        "desktop.vscode.observation",
      ),
    );

    assert.ok(
      genericKeys.includes(
        "backup.primary.observation",
      ),
    );

    assert.ok(
      genericKeys.includes(
        "storage.vault.observation",
      ),
    );

    assert.ok(
      genericKeys.includes(
        "execution.task-42.observation",
      ),
    );
    pass(
      "desktop, backup, storage, and execution domains are mirrored without guessed payload contracts",
    );

    const serviceFact =
      runtime.engine.worldState.get(
        "service.ollama.health",
      );

    assert.equal(
      serviceFact?.provenance
        ?.source?.subsystem,
      "runtime-health",
    );

    assert.equal(
      serviceFact?.provenance
        ?.projectorId,
      "domain-service-health",
    );
    pass(
      "integrated facts preserve Event Spine and projector provenance",
    );

    const initialPersisted =
      await queryPersistedWorldState({
        store,
        query: {
          key:
            "service.ollama.health",
        },
        now:
          () => now,
      });

    assert.equal(
      initialPersisted.status,
      "loaded",
    );

    if (
      initialPersisted.status !==
      "loaded"
    ) {
      throw new Error(
        "Expected persisted World State.",
      );
    }

    assert.equal(
      initialPersisted.result
        .items[0]?.record.value,
      "healthy",
    );
    pass(
      "reconstructed state is immediately persisted and available through the read-only query layer",
    );

    now =
      new Date(
        "2026-08-24T22:41:00.000Z",
      );

    await bus.emit(
      makeEvent(
        "evt-live-degraded",
        "service.degraded",
        "2026-08-24T22:40:59.000Z",
        {
          subsystem:
            "runtime-health",
          subject:
            "ollama",
          payload: {
            kind: "service",
            id: "ollama",
            status:
              "degraded",
          },
        },
      ),
    );

    await runtime.flush();

    assert.equal(
      runtime.engine.worldState.get(
        "service.ollama.health",
      )?.value,
      "degraded",
    );

    const livePersisted =
      await queryPersistedWorldState({
        store,
        query: {
          key:
            "service.ollama.health",
        },
        now:
          () => now,
      });

    assert.equal(
      livePersisted.status,
      "loaded",
    );

    if (
      livePersisted.status !==
      "loaded"
    ) {
      throw new Error(
        "Expected live persisted World State.",
      );
    }

    assert.equal(
      livePersisted.result
        .items[0]?.record.value,
      "degraded",
    );

    assert.equal(
      livePersisted.result
        .items[0]?.record.provenance
        ?.eventId,
      "evt-live-degraded",
    );
    pass(
      "live Event Spine events update memory, durable snapshot, and query results end to end",
    );

    const forbiddenPrefixes = [
      "attention.",
      "decision.",
      "recommendation.",
      "action.",
      "cognitive.",
    ];

    const stateKeys =
      runtime.engine.worldState
        .snapshot()
        .map((record) =>
          record.key,
        );

    assert.equal(
      stateKeys.some(
        (key) =>
          forbiddenPrefixes.some(
            (prefix) =>
              key.startsWith(
                prefix,
              ),
          ),
      ),
      false,
    );
    pass(
      "11G integration remains factual and does not cross into 11H cognitive decisions",
    );

    const beforeStop =
      runtime.engine.worldState.get(
        "service.ollama.health",
      )?.value;

    await runtime.stop();

    await bus.emit(
      makeEvent(
        "evt-after-stop",
        "service.failed",
        "2026-08-24T22:42:00.000Z",
        {
          subsystem:
            "runtime-health",
          subject:
            "ollama",
          payload: {
            status: "failed",
          },
        },
      ),
    );

    assert.equal(
      runtime.engine.worldState.get(
        "service.ollama.health",
      )?.value,
      beforeStop,
    );
    pass(
      "World State runtime detaches cleanly from the Event Spine",
    );

    const restartBus =
      new VerificationEventBus(
        [
          ...history,
          makeEvent(
            "evt-live-degraded",
            "service.degraded",
            "2026-08-24T22:40:59.000Z",
            {
              subsystem:
                "runtime-health",
              subject:
                "ollama",
              payload: {
                status:
                  "degraded",
              },
            },
          ),
          makeEvent(
            "evt-post-snapshot",
            "service.healthy",
            "2026-08-24T22:43:00.000Z",
            {
              subsystem:
                "runtime-health",
              subject:
                "ollama",
              payload: {
                status:
                  "healthy",
              },
            },
          ),
        ],
      );

    now =
      new Date(
        "2026-08-24T22:43:01.000Z",
      );

    const restarted =
      await startChernobogWorldStateRuntime({
        eventBus:
          restartBus as never,
        engine:
          new ChernobogWorldStateProjectionEngine({
            worldState:
              new ChernobogWorldStateRegistry(
                () => now,
              ),
          }),
        store,
        clock:
          () => now,
      });

    assert.equal(
      restarted.recovery.mode,
      "snapshot-caught-up",
    );

    assert.equal(
      restarted.engine.worldState.get(
        "service.ollama.health",
      )?.value,
      "healthy",
    );

    assert.equal(
      restarted.engine.worldState.get(
        "service.ollama.health",
      )?.provenance?.eventId,
      "evt-post-snapshot",
    );
    pass(
      "restart restores durable World State and catches up only newer Event Spine history",
    );

    await restarted.stop();
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
    "=======================================================",
  );
  console.log(
    "PASS Phase 11G-F Integration & Full Acceptance",
  );
  console.log(
    "PASS Phase 11G World State COMPLETE",
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
