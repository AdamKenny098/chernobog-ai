import assert from "node:assert/strict";

import type {
  ChernobogEventHandler,
  ChernobogEventSubscriptionFilter,
} from "../lib/chernobog/events";
import {
  ChernobogWorldStateProjectionEngine,
  registerChernobogDomainProjectors,
} from "../lib/chernobog/worldState";
import {
  ChernobogWorldModelRuntime,
  createWorldModelCausalObservation,
  startChernobogWorldModelRuntime,
} from "../lib/chernobog/worldModel";

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

async function main(): Promise<void> {
  console.log(
    "Chernobog Phase 11J-F - World Model Integration & Full Acceptance",
  );
  console.log(
    "=================================================================",
  );

  let now =
    new Date(
      "2026-08-25T23:50:00.000Z",
    );

  const worldStateEngine =
    new ChernobogWorldStateProjectionEngine();

  const unregisterProjectors =
    registerChernobogDomainProjectors(
      worldStateEngine,
    );

  worldStateEngine.worldState.upsert({
    key:
      "service.ollama.health",
    value:
      "failed",
    observedAt:
      "2026-08-25T23:50:01.000Z",
    confidence:
      0.95,
    provenance: {
      eventId:
        "event:ollama:failed",
      eventType:
        "service.health.failed",
      eventReceivedAt:
        "2026-08-25T23:50:01.000Z",
      projectorId:
        "verification",
      source: {
        subsystem:
          "verification",
      },
    },
  });

  const subscribers =
    new Set<
      () => void | Promise<void>
    >();

  const eventBus = {
    subscribe(
      _filter: ChernobogEventSubscriptionFilter,
      handler: ChernobogEventHandler,
    ) {
      const wrapped =
        () => handler(
          undefined as never,
        );

      subscribers.add(wrapped);

      return () => {
        subscribers.delete(
          wrapped,
        );
      };
    },
  };

  const worldStateRuntime = {
    engine:
      worldStateEngine,
  };

  const model =
    new ChernobogWorldModelRuntime({
      clock:
        () => now,
    });

  const production =
    startChernobogWorldModelRuntime({
      worldStateRuntime,
      eventBus,
      model,
    });

  const snapshot1 =
    model.snapshot();

  assert.ok(
    snapshot1.graph.entities.some(
      (entity) =>
        entity.id ===
        "service:ollama",
    ),
  );
  pass(
    "production bridge consumes canonical 11G World State rather than creating an independent fact source",
  );

  assert.ok(
    snapshot1.temporal.observations.some(
      (observation) =>
        observation.entityId ===
          "service:ollama",
    ),
  );
  pass(
    "live World State facts enter the temporal model alongside graph projection",
  );

  /*
   * Build a deterministic historical sequence directly through 11G records.
   * The integration runtime must retain each changed observation.
   */
  const healthKey =
    snapshot1.temporal.observations.find(
      (observation) =>
        observation.entityId ===
          "service:ollama",
    )?.stateKey;

  assert.ok(healthKey);

  if (!healthKey) {
    throw new Error(
      "Expected projected Ollama health key.",
    );
  }

  const baseRecord =
    worldStateEngine
      .worldState
      .get(healthKey);

  assert.ok(baseRecord);

  if (!baseRecord) {
    throw new Error(
      "Expected World State health record.",
    );
  }

  const sequence = [
    ["healthy", "2026-08-25T23:51:00.000Z"],
    ["failed", "2026-08-25T23:52:00.000Z"],
    ["healthy", "2026-08-25T23:53:00.000Z"],
    ["failed", "2026-08-25T23:54:00.000Z"],
    ["healthy", "2026-08-25T23:55:00.000Z"],
    ["failed", "2026-08-25T23:56:00.000Z"],
    ["healthy", "2026-08-25T23:57:00.000Z"],
    ["failed", "2026-08-25T23:58:00.000Z"],
    ["healthy", "2026-08-25T23:59:00.000Z"],
    ["failed", "2026-08-26T00:00:00.000Z"],
    ["healthy", "2026-08-26T00:01:00.000Z"],
    ["failed", "2026-08-26T00:02:00.000Z"],
    ["healthy", "2026-08-26T00:03:00.000Z"],
  ] as const;

  for (
    const [value, observedAt]
    of sequence
  ) {
    now =
      new Date(observedAt);

    worldStateEngine
      .worldState
      .upsert({
        key:
          baseRecord.key,
        value,
        observedAt,
        confidence:
          0.95,
        provenance: {
          ...baseRecord.provenance,
          eventId:
            `event:verification:${observedAt}`,
          eventReceivedAt:
            observedAt,
        },
      });

    for (const subscriber of subscribers) {
      await subscriber();
    }
  }

  const temporalSummary =
    model.temporal.summary(
      "service:ollama",
      healthKey,
    );

  assert.ok(
    temporalSummary.transitionCount >=
      12,
  );
  pass(
    "integrated runtime retains ordered state history and derives real transitions",
  );

  const prediction =
    model.prediction(
      "service:ollama",
      healthKey,
    );

  assert.ok(prediction);

  assert.equal(
    prediction?.status,
    "strong",
  );

  assert.equal(
    prediction
      ?.predictedNextValue,
    "failed",
  );
  pass(
    "temporal history feeds bounded empirical next-state prediction in the integrated runtime",
  );

  model.graph.upsertEntity({
    id:
      "model:default",
    kind:
      "model",
    label:
      "Default model",
    observedAt:
      "2026-08-26T00:04:00.000Z",
    confidence: 1,
  });

  model.graph.upsertEntity({
    id:
      "project:chernobog",
    kind:
      "project",
    label:
      "Chernobog",
    observedAt:
      "2026-08-26T00:04:00.000Z",
    confidence: 1,
  });

  model.graph.upsertRelationship({
    type:
      "requires-model",
    fromEntityId:
      "project:chernobog",
    toEntityId:
      "model:default",
    observedAt:
      "2026-08-26T00:04:01.000Z",
    confidence: 0.95,
  });

  model.graph.upsertRelationship({
    type:
      "depends-on",
    fromEntityId:
      "model:default",
    toEntityId:
      "service:ollama",
    observedAt:
      "2026-08-26T00:04:02.000Z",
    confidence: 0.98,
  });

  const impact =
    model.impact(
      "service:ollama",
    );

  assert.ok(
    impact.directlyDependentEntityIds.includes(
      "model:default",
    ),
  );

  assert.ok(
    impact.transitivelyDependentEntityIds.includes(
      "project:chernobog",
    ),
  );
  pass(
    "integrated graph exposes direct and transitive blast-radius reasoning",
  );

  for (
    let index = 1;
    index <= 3;
    index += 1
  ) {
    model.addCausalObservation(
      createWorldModelCausalObservation({
        id:
          `causal:verification:${index}`,
        causeEntityId:
          "service:ollama",
        effectEntityId:
          "project:chernobog",
        causeObservedAt:
          `2026-08-26T00:1${index}:00.000Z`,
        effectObservedAt:
          `2026-08-26T00:1${index}:05.000Z`,
        confidence:
          0.95,
        supporting:
          true,
      }),
    );
  }

  const causal =
    model.evaluateCausalHypothesis(
      "service:ollama",
      "project:chernobog",
    );

  assert.equal(
    causal.status,
    "supported",
  );

  assert.ok(
    causal.structuralRelationships.length >
      0,
  );
  pass(
    "repeated temporal evidence plus structural dependency can support an explicitly hypothetical causal model",
  );

  const finalSnapshot =
    model.snapshot();

  assert.ok(
    finalSnapshot.graph.entities.length >
      0,
  );

  assert.ok(
    finalSnapshot.temporal.observations.length >
      0,
  );

  assert.ok(
    finalSnapshot.predictions.length >
      0,
  );

  assert.equal(
    finalSnapshot.causalHypotheses.length,
    1,
  );
  pass(
    "world-model snapshot unifies graph, temporal, predictive, and causal state",
  );

  const mutated =
    model.snapshot();

  mutated.graph.entities[0]!.label =
    "mutated externally";

  assert.notEqual(
    model.snapshot()
      .graph.entities[0]?.label,
    "mutated externally",
  );
  pass(
    "integrated World Model snapshots remain defensively cloned",
  );

  const predictionKeys =
    prediction
      ? Object.keys(
          prediction,
        )
      : [];

  const causalKeys =
    Object.keys(causal);

  assert.equal(
    predictionKeys.includes(
      "execute",
    ),
    false,
  );

  assert.equal(
    causalKeys.includes(
      "execute",
    ),
    false,
  );

  assert.equal(
    predictionKeys.includes(
      "permission",
    ),
    false,
  );

  assert.equal(
    causalKeys.includes(
      "permission",
    ),
    false,
  );
  pass(
    "World Model inference creates no execution or permission path",
  );

  production.stop();
  unregisterProjectors();

  console.log(
    "=================================================================",
  );
  console.log(
    "PASS Phase 11J-F World Model Integration & Full Acceptance",
  );
  console.log(
    "PASS Phase 11J World Model COMPLETE",
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
