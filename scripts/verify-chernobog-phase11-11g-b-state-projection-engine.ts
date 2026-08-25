import assert from "node:assert/strict";

import type {
  ChernobogEvent,
  ChernobogEventHandler,
} from "../lib/chernobog/events/types";
import {
  ChernobogWorldStateProjectionEngine,
  ChernobogWorldStateProjectorRegistry,
  ChernobogWorldStateRegistry,
  buildWorldStateInputFromEvent,
} from "../lib/chernobog/worldState";

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

function event(
  overrides: Partial<ChernobogEvent> = {},
): ChernobogEvent {
  return {
    id: "evt-001",
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
      confidence: 0.9,
      expiresAt: "2026-08-24T21:05:00.000Z",
    },
    ...overrides,
  };
}

async function main(): Promise<void> {
  console.log("Chernobog Phase 11G-B - State Projection Engine");
  console.log("===============================================");

  const derived = buildWorldStateInputFromEvent(event(), {
    key: "service.ollama.health",
    value: "healthy",
  });

  assert.equal(derived.observedAt, "2026-08-24T21:00:00.000Z");
  assert.equal(derived.confidence, 0.9);
  assert.equal(derived.expiresAt, "2026-08-24T21:05:00.000Z");
  assert.equal(derived.provenance?.eventId, "evt-001");
  assert.equal(derived.provenance?.eventType, "runtime.ollama.health_changed");
  assert.equal(derived.provenance?.source?.subsystem, "ollama-health");
  pass("event metadata becomes canonical world-state provenance");

  const projectorRegistry = new ChernobogWorldStateProjectorRegistry();

  const detachExact = projectorRegistry.register({
    id: "ollama-health",
    eventTypes: ["runtime.ollama.health_changed"],
    project(input) {
      const payload = input.payload as { health: string };
      return {
        key: "service.ollama.health",
        value: payload.health,
      };
    },
  });

  projectorRegistry.register({
    id: "runtime-catchall",
    eventTypePrefixes: ["runtime."],
    project() {
      return undefined;
    },
  });

  assert.equal(projectorRegistry.size, 2);
  assert.deepEqual(
    projectorRegistry.matching(event()).map((item) => item.id),
    ["ollama-health", "runtime-catchall"],
  );
  pass("projector registry matches exact types and prefixes deterministically");

  assert.throws(() =>
    projectorRegistry.register({
      id: "ollama-health",
      project() {
        return undefined;
      },
    }),
  );
  pass("duplicate projector ids are rejected");

  detachExact();
  assert.equal(projectorRegistry.size, 1);
  pass("projectors can detach cleanly");

  const fixedClock = () => new Date("2026-08-24T21:00:02.000Z");
  const worldState = new ChernobogWorldStateRegistry(fixedClock);
  const engine = new ChernobogWorldStateProjectionEngine({
    worldState,
  });

  engine.register({
    id: "service-health-projector",
    eventTypes: ["runtime.ollama.health_changed"],
    project(input) {
      const payload = input.payload as { health: string };
      return {
        key: "service.ollama.health",
        value: payload.health,
      };
    },
  });

  const firstResult = engine.process(event());
  assert.equal(firstResult.matchedProjectors, 1);
  assert.equal(firstResult.emittedProjections, 1);
  assert.equal(firstResult.appliedProjections, 1);
  assert.equal(firstResult.ignoredProjections, 0);
  assert.equal(worldState.get("service.ollama.health")?.value, "healthy");
  assert.equal(
    worldState.get("service.ollama.health")?.provenance?.eventId,
    "evt-001",
  );
  pass("events project into canonical current state");

  const olderResult = engine.process(
    event({
      id: "evt-older",
      occurredAt: "2026-08-24T20:59:00.000Z",
      receivedAt: "2026-08-24T20:59:01.000Z",
      payload: { health: "unhealthy" },
    }),
  );

  assert.equal(olderResult.appliedProjections, 0);
  assert.equal(olderResult.ignoredProjections, 1);
  assert.equal(worldState.get("service.ollama.health")?.value, "healthy");
  pass("out-of-order older events cannot overwrite newer world state");

  const newerResult = engine.process(
    event({
      id: "evt-002",
      occurredAt: "2026-08-24T21:01:00.000Z",
      receivedAt: "2026-08-24T21:01:01.000Z",
      payload: { health: "unhealthy" },
    }),
  );

  assert.equal(newerResult.appliedProjections, 1);
  assert.equal(worldState.get("service.ollama.health")?.value, "unhealthy");
  assert.equal(
    worldState.get("service.ollama.health")?.provenance?.eventId,
    "evt-002",
  );
  pass("newer observations supersede current state");

  engine.register({
    id: "multi-state-projector",
    eventTypes: ["project.snapshot_changed"],
    project(input) {
      const payload = input.payload as {
        phase: string;
        status: string;
      };

      return [
        {
          key: "project.chernobog.phase",
          value: payload.phase,
        },
        {
          key: "project.chernobog.status",
          value: payload.status,
        },
      ];
    },
  });

  const multi = engine.process(
    event({
      id: "evt-project",
      type: "project.snapshot_changed",
      occurredAt: "2026-08-24T21:02:00.000Z",
      receivedAt: "2026-08-24T21:02:01.000Z",
      payload: {
        phase: "11G",
        status: "active",
      },
      metadata: {
        schemaVersion: 1,
      },
    }),
  );

  assert.equal(multi.emittedProjections, 2);
  assert.equal(multi.appliedProjections, 2);
  assert.equal(worldState.get("project.chernobog.phase")?.value, "11G");
  assert.equal(worldState.get("project.chernobog.status")?.value, "active");
  pass("one event may deterministically emit multiple state facts");

  let subscribedHandler: ChernobogEventHandler | undefined;
  let detached = false;

  const fakeBus = {
    subscribe(
      _filter: unknown,
      handler: ChernobogEventHandler,
    ): () => void {
      subscribedHandler = handler;
      return () => {
        detached = true;
      };
    },
  };

  const detach = engine.attach(fakeBus as never);
  assert.ok(subscribedHandler);

  await subscribedHandler?.(
    event({
      id: "evt-live",
      occurredAt: "2026-08-24T21:03:00.000Z",
      receivedAt: "2026-08-24T21:03:01.000Z",
      payload: { health: "healthy" },
    }),
  );

  assert.equal(worldState.get("service.ollama.health")?.value, "healthy");
  detach();
  assert.equal(detached, true);
  pass("projection engine attaches to and detaches from the Event Spine");

  const replayEngine = new ChernobogWorldStateProjectionEngine({
    worldState: new ChernobogWorldStateRegistry(fixedClock),
  });

  replayEngine.register({
    id: "replay-health",
    eventTypes: ["runtime.ollama.health_changed"],
    project(input) {
      const payload = input.payload as { health: string };
      return {
        key: "service.ollama.health",
        value: payload.health,
      };
    },
  });

  const replayEvents = [
    event({
      id: "evt-r1",
      occurredAt: "2026-08-24T20:00:00.000Z",
      receivedAt: "2026-08-24T20:00:01.000Z",
      payload: { health: "unhealthy" },
    }),
    event({
      id: "evt-r2",
      occurredAt: "2026-08-24T20:10:00.000Z",
      receivedAt: "2026-08-24T20:10:01.000Z",
      payload: { health: "healthy" },
    }),
  ];

  const replayBus = {
    async replay(handler: ChernobogEventHandler) {
      for (const item of replayEvents) {
        await handler(item);
      }
      return {
        totalEvents: replayEvents.length,
        replayedEvents: replayEvents.length,
        failedEvents: 0,
        startedAt: "2026-08-24T21:00:00.000Z",
        finishedAt: "2026-08-24T21:00:01.000Z",
        errors: [],
      };
    },
  };

  const rebuild = await replayEngine.rebuildFromEventHistory(
    replayBus as never,
  );

  assert.equal(rebuild.replayedEvents, 2);
  assert.equal(rebuild.failedEvents, 0);
  assert.equal(rebuild.stateRecords, 1);
  assert.equal(
    replayEngine.worldState.get("service.ollama.health")?.value,
    "healthy",
  );
  assert.equal(
    replayEngine.worldState.get("service.ollama.health")?.provenance?.eventId,
    "evt-r2",
  );
  pass("event history reconstructs deterministic current state");

  console.log("===============================================");
  console.log("PASS Phase 11G-B State Projection Engine acceptance");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
