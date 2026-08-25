import assert from "node:assert/strict";

import {
  createWorldStateRecord,
} from "../lib/chernobog/worldState";
import type {
  WorldStateJsonValue,
} from "../lib/chernobog/worldState";
import {
  ChernobogWorldModelTemporalModel,
  createWorldModelTemporalObservation,
  temporalObservationFromWorldState,
} from "../lib/chernobog/worldModel";

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

function stateRecord(
  value: WorldStateJsonValue,
  observedAt: string,
) {
  return createWorldStateRecord(
    {
      key:
        "service.ollama.health",
      value,
      observedAt,
      confidence: 0.95,
      provenance: {
        eventId:
          `event:ollama:${observedAt}`,
        eventType:
          "service.health.observed",
        projectorId:
          "verification",
        source: {
          subsystem:
            "verification",
        },
      },
    },
    new Date(
      "2026-08-25T23:30:00.000Z",
    ),
  );
}

console.log(
  "Chernobog Phase 11J-D - Temporal Model & State Transitions",
);
console.log(
  "==========================================================",
);

const observation =
  createWorldModelTemporalObservation({
    id:
      "temporal:service:ollama:health:1",
    entityId:
      "service:ollama",
    stateKey:
      "service.ollama.health",
    value:
      "healthy",
    observedAt:
      "2026-08-25T23:00:00.000Z",
    confidence:
      0.9,
    evidenceEventIds: [
      "event:health:1",
      "event:health:1",
    ],
  });

assert.equal(
  observation.entityId,
  "service:ollama",
);
assert.deepEqual(
  observation.evidenceEventIds,
  [
    "event:health:1",
  ],
);
pass(
  "temporal observations normalize identity, confidence, timestamps, and evidence",
);

assert.throws(() =>
  createWorldModelTemporalObservation({
    id:
      "bad-confidence",
    entityId:
      "service:ollama",
    stateKey:
      "service.ollama.health",
    value:
      "healthy",
    observedAt:
      "2026-08-25T23:00:00.000Z",
    confidence:
      2,
  }),
);

assert.throws(() =>
  createWorldModelTemporalObservation({
    id:
      "bad-time",
    entityId:
      "service:ollama",
    stateKey:
      "service.ollama.health",
    value:
      "healthy",
    observedAt:
      "not-a-time",
  }),
);
pass(
  "invalid temporal confidence and timestamps are rejected",
);

const grounded =
  temporalObservationFromWorldState(
    "service:ollama",
    stateRecord(
      "healthy",
      "2026-08-25T23:01:00.000Z",
    ),
  );

assert.equal(
  grounded.value,
  "healthy",
);
assert.deepEqual(
  grounded.evidenceWorldStateKeys,
  [
    "service.ollama.health",
  ],
);
assert.equal(
  grounded.evidenceEventIds.length,
  1,
);
pass(
  "11G World State observations become temporal world-model observations with provenance",
);

const model =
  new ChernobogWorldModelTemporalModel();

for (const item of [
  createWorldModelTemporalObservation({
    id: "obs:1",
    entityId:
      "service:ollama",
    stateKey:
      "service.ollama.health",
    value:
      "healthy",
    observedAt:
      "2026-08-25T23:00:00.000Z",
    confidence:
      0.95,
  }),
  createWorldModelTemporalObservation({
    id: "obs:2",
    entityId:
      "service:ollama",
    stateKey:
      "service.ollama.health",
    value:
      "healthy",
    observedAt:
      "2026-08-25T23:05:00.000Z",
    confidence:
      0.95,
  }),
  createWorldModelTemporalObservation({
    id: "obs:3",
    entityId:
      "service:ollama",
    stateKey:
      "service.ollama.health",
    value:
      "failed",
    observedAt:
      "2026-08-25T23:10:00.000Z",
    confidence:
      0.9,
  }),
  createWorldModelTemporalObservation({
    id: "obs:4",
    entityId:
      "service:ollama",
    stateKey:
      "service.ollama.health",
    value:
      "healthy",
    observedAt:
      "2026-08-25T23:20:00.000Z",
    confidence:
      0.98,
  }),
]) {
  model.add(item);
}

assert.equal(
  model.list().length,
  4,
);
pass(
  "temporal model retains ordered observations without collapsing repeated identical states",
);

const transitions =
  model.transitions({
    entityId:
      "service:ollama",
    stateKey:
      "service.ollama.health",
  });

assert.equal(
  transitions.length,
  2,
);
assert.equal(
  transitions[0]
    ?.fromValue,
  "healthy",
);
assert.equal(
  transitions[0]
    ?.toValue,
  "failed",
);
assert.equal(
  transitions[1]
    ?.fromValue,
  "failed",
);
assert.equal(
  transitions[1]
    ?.toValue,
  "healthy",
);
pass(
  "state transitions are created only when observed value actually changes",
);

assert.equal(
  transitions[0]
    ?.durationMs,
  5 * 60 * 1000,
);
assert.equal(
  transitions[1]
    ?.durationMs,
  10 * 60 * 1000,
);
pass(
  "transition dwell duration is derived deterministically from observation time",
);

const summary =
  model.summary(
    "service:ollama",
    "service.ollama.health",
  );

assert.equal(
  summary.transitionCount,
  2,
);
assert.equal(
  summary.distinctStateCount,
  2,
);
assert.equal(
  summary.latestValue,
  "healthy",
);
assert.equal(
  summary.averageDwellMs,
  7.5 * 60 * 1000,
);
pass(
  "temporal summaries expose transition count, distinct states, current value, and average dwell",
);

const reordered =
  new ChernobogWorldModelTemporalModel();

for (
  const item
  of model.list().reverse()
) {
  reordered.add(item);
}

assert.deepEqual(
  reordered.transitions(),
  model.transitions(),
);
pass(
  "temporal transition extraction is deterministic regardless of insertion order",
);

const snapshot =
  model.snapshot();

snapshot.observations[0]!.value =
  "mutated";

assert.notEqual(
  model.snapshot()
    .observations[0]
    ?.value,
  "mutated",
);
pass(
  "temporal snapshots are defensively cloned",
);

const keys =
  model.transitions()
    .flatMap(
      (transition) =>
        Object.keys(
          transition,
        ),
    );

assert.equal(
  keys.includes(
    "predictedNextValue",
  ),
  false,
);
assert.equal(
  keys.includes(
    "probability",
  ),
  false,
);
assert.equal(
  keys.includes(
    "expectedAt",
  ),
  false,
);
pass(
  "11J-D models observed history and transitions without predicting the future",
);

console.log(
  "==========================================================",
);
console.log(
  "PASS Phase 11J-D Temporal Model & State Transitions acceptance",
);
