import assert from "node:assert/strict";

import {
  ChernobogWorldModelPredictionStore,
  ChernobogWorldModelTemporalModel,
  createWorldModelTemporalObservation,
  predictNextWorldModelState,
} from "../lib/chernobog/worldModel";

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

function observation(
  id: string,
  value:
    "healthy" |
    "degraded" |
    "failed",
  observedAt: string,
) {
  return createWorldModelTemporalObservation({
    id,
    entityId:
      "service:ollama",
    stateKey:
      "service.ollama.health",
    value,
    observedAt,
    confidence: 0.95,
  });
}

console.log(
  "Chernobog Phase 11J-E - Predictive State Model",
);
console.log(
  "===============================================",
);

const insufficient =
  new ChernobogWorldModelTemporalModel();

insufficient.add(
  observation(
    "obs:i1",
    "healthy",
    "2026-08-25T23:00:00.000Z",
  ),
);

insufficient.add(
  observation(
    "obs:i2",
    "failed",
    "2026-08-25T23:10:00.000Z",
  ),
);

insufficient.add(
  observation(
    "obs:i3",
    "healthy",
    "2026-08-25T23:20:00.000Z",
  ),
);

const insufficientPrediction =
  predictNextWorldModelState(
    insufficient,
    "service:ollama",
    "service.ollama.health",
    {
      now:
        new Date(
          "2026-08-25T23:21:00.000Z",
        ),
    },
  );

assert.ok(
  insufficientPrediction,
);

assert.equal(
  insufficientPrediction
    ?.status,
  "insufficient",
);

assert.equal(
  insufficientPrediction
    ?.predictedNextValue,
  undefined,
);
pass(
  "one matching historical transition is insufficient to emit a next-state prediction",
);

const model =
  new ChernobogWorldModelTemporalModel();

const sequence: Array<
  [
    string,
    "healthy" |
      "degraded" |
      "failed",
    string,
  ]
> = [
  [
    "obs:1",
    "healthy",
    "2026-08-25T20:00:00.000Z",
  ],
  [
    "obs:2",
    "failed",
    "2026-08-25T20:10:00.000Z",
  ],
  [
    "obs:3",
    "healthy",
    "2026-08-25T20:20:00.000Z",
  ],
  [
    "obs:4",
    "failed",
    "2026-08-25T20:30:00.000Z",
  ],
  [
    "obs:5",
    "healthy",
    "2026-08-25T20:40:00.000Z",
  ],
  [
    "obs:6",
    "failed",
    "2026-08-25T20:50:00.000Z",
  ],
  [
    "obs:7",
    "healthy",
    "2026-08-25T21:00:00.000Z",
  ],
  [
    "obs:8",
    "failed",
    "2026-08-25T21:10:00.000Z",
  ],
  [
    "obs:9",
    "healthy",
    "2026-08-25T21:20:00.000Z",
  ],
  [
    "obs:10",
    "failed",
    "2026-08-25T21:30:00.000Z",
  ],
  [
    "obs:11",
    "healthy",
    "2026-08-25T21:40:00.000Z",
  ],
  [
    "obs:12",
    "failed",
    "2026-08-25T21:50:00.000Z",
  ],
  [
    "obs:13",
    "healthy",
    "2026-08-25T22:00:00.000Z",
  ],
];

for (
  const [id, value, time]
  of sequence
) {
  model.add(
    observation(
      id,
      value,
      time,
    ),
  );
}

const strong =
  predictNextWorldModelState(
    model,
    "service:ollama",
    "service.ollama.health",
    {
      now:
        new Date(
          "2026-08-25T22:01:00.000Z",
        ),
    },
  );

assert.ok(strong);

assert.equal(
  strong?.status,
  "strong",
);

assert.equal(
  strong?.predictedNextValue,
  "failed",
);

assert.equal(
  strong?.predictedProbability,
  1,
);

assert.equal(
  strong?.sampleCount,
  6,
);
pass(
  "repeated deterministic transitions produce a strong empirical next-state forecast",
);

assert.equal(
  strong
    ?.expectedTransitionAfterMs,
  10 * 60 * 1000,
);
pass(
  "prediction derives expected transition timing from observed dwell history",
);

const mixed =
  new ChernobogWorldModelTemporalModel();

const mixedSequence: Array<
  [
    string,
    "healthy" |
      "degraded" |
      "failed",
    string,
  ]
> = [
  ["mix:1", "healthy", "2026-08-25T18:00:00.000Z"],
  ["mix:2", "failed", "2026-08-25T18:05:00.000Z"],
  ["mix:3", "healthy", "2026-08-25T18:10:00.000Z"],
  ["mix:4", "degraded", "2026-08-25T18:15:00.000Z"],
  ["mix:5", "healthy", "2026-08-25T18:20:00.000Z"],
  ["mix:6", "failed", "2026-08-25T18:25:00.000Z"],
  ["mix:7", "healthy", "2026-08-25T18:30:00.000Z"],
];

for (
  const [id, value, time]
  of mixedSequence
) {
  mixed.add(
    observation(
      id,
      value,
      time,
    ),
  );
}

const mixedPrediction =
  predictNextWorldModelState(
    mixed,
    "service:ollama",
    "service.ollama.health",
    {
      now:
        new Date(
          "2026-08-25T18:31:00.000Z",
        ),
    },
  );

assert.ok(
  mixedPrediction,
);

assert.equal(
  mixedPrediction
    ?.predictedNextValue,
  "failed",
);

assert.equal(
  mixedPrediction
    ?.predictedProbability,
  2 / 3,
);

assert.equal(
  mixedPrediction
    ?.status,
  "weak",
);
pass(
  "mixed transition history preserves competing candidates and lowers forecast strength",
);

assert.deepEqual(
  mixedPrediction
    ?.candidates.map(
      (candidate) =>
        candidate.value,
    ),
  [
    "failed",
    "degraded",
  ],
);
pass(
  "candidate next states are ranked deterministically by empirical probability",
);

const reordered =
  new ChernobogWorldModelTemporalModel();

for (
  const item
  of model.list().reverse()
) {
  reordered.add(item);
}

const reorderedPrediction =
  predictNextWorldModelState(
    reordered,
    "service:ollama",
    "service.ollama.health",
    {
      now:
        new Date(
          "2026-08-25T22:01:00.000Z",
        ),
    },
  );

assert.deepEqual(
  reorderedPrediction,
  strong,
);
pass(
  "prediction output is deterministic regardless of temporal insertion order",
);

const missing =
  predictNextWorldModelState(
    model,
    "service:missing",
    "service.missing.health",
  );

assert.equal(
  missing,
  undefined,
);
pass(
  "prediction returns no result when there is no observed state history",
);

const store =
  new ChernobogWorldModelPredictionStore();

if (!strong) {
  throw new Error(
    "Expected strong prediction.",
  );
}

store.upsert(strong);

const stored =
  store.get(strong.id);

assert.ok(stored);

if (!stored) {
  throw new Error(
    "Expected stored prediction.",
  );
}

stored.status =
  "insufficient";

assert.equal(
  store.get(strong.id)
    ?.status,
  "strong",
);
pass(
  "prediction store returns defensive clones",
);

const keys =
  Object.keys(strong);

assert.equal(
  keys.includes(
    "execute",
  ),
  false,
);
assert.equal(
  keys.includes(
    "action",
  ),
  false,
);
assert.equal(
  keys.includes(
    "fact",
  ),
  false,
);
assert.equal(
  keys.includes(
    "certain",
  ),
  false,
);
pass(
  "11J-E forecasts remain probabilistic evidence and cannot execute or masquerade as fact",
);

console.log(
  "===============================================",
);
console.log(
  "PASS Phase 11J-E Predictive State Model acceptance",
);
