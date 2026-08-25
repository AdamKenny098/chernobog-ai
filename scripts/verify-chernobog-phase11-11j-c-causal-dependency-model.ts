import assert from "node:assert/strict";

import {
  ChernobogWorldModelGraph,
  assessDownstreamImpact,
  createWorldModelCausalObservation,
  evaluateWorldModelCausalHypothesis,
  findDependencyPaths,
} from "../lib/chernobog/worldModel";

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

console.log(
  "Chernobog Phase 11J-C - Causal & Dependency Model",
);
console.log(
  "==================================================",
);

const graph =
  new ChernobogWorldModelGraph();

for (const entity of [
  {
    id:
      "service:ollama",
    kind:
      "service" as const,
    label:
      "Ollama",
  },
  {
    id:
      "model:default",
    kind:
      "model" as const,
    label:
      "Default model",
  },
  {
    id:
      "project:chernobog",
    kind:
      "project" as const,
    label:
      "Chernobog",
  },
  {
    id:
      "application:command-center",
    kind:
      "application" as const,
    label:
      "Command Center",
  },
]) {
  graph.upsertEntity({
    ...entity,
    observedAt:
      "2026-08-25T23:00:00.000Z",
    confidence: 1,
  });
}

graph.upsertRelationship({
  type:
    "requires-model",
  fromEntityId:
    "project:chernobog",
  toEntityId:
    "model:default",
  observedAt:
    "2026-08-25T23:00:01.000Z",
  confidence: 0.95,
});

graph.upsertRelationship({
  type:
    "depends-on",
  fromEntityId:
    "model:default",
  toEntityId:
    "service:ollama",
  observedAt:
    "2026-08-25T23:00:02.000Z",
  confidence: 0.98,
});

graph.upsertRelationship({
  type:
    "depends-on",
  fromEntityId:
    "application:command-center",
  toEntityId:
    "project:chernobog",
  observedAt:
    "2026-08-25T23:00:03.000Z",
  confidence: 0.9,
});

const paths =
  findDependencyPaths(
    graph,
    "project:chernobog",
    "service:ollama",
  );

assert.equal(
  paths.length,
  1,
);
assert.deepEqual(
  paths[0]?.entityIds,
  [
    "project:chernobog",
    "model:default",
    "service:ollama",
  ],
);
assert.equal(
  paths[0]?.depth,
  2,
);
pass(
  "dependency traversal finds deterministic multi-hop structural paths",
);

const impact =
  assessDownstreamImpact(
    graph,
    "service:ollama",
  );

assert.deepEqual(
  impact.directlyDependentEntityIds,
  [
    "model:default",
  ],
);
assert.ok(
  impact.transitivelyDependentEntityIds.includes(
    "project:chernobog",
  ),
);
assert.ok(
  impact.transitivelyDependentEntityIds.includes(
    "application:command-center",
  ),
);
pass(
  "downstream impact separates direct and transitive dependents",
);

graph.upsertRelationship({
  type:
    "has-state",
  fromEntityId:
    "service:ollama",
  toEntityId:
    "project:chernobog",
  observedAt:
    "2026-08-25T23:00:04.000Z",
  confidence: 1,
});

assert.equal(
  findDependencyPaths(
    graph,
    "service:ollama",
    "project:chernobog",
  ).length,
  0,
);
pass(
  "ordinary graph relationships are not silently treated as dependencies",
);

const observation1 =
  createWorldModelCausalObservation({
    id:
      "causal-observation:1",
    causeEntityId:
      "service:ollama",
    effectEntityId:
      "project:chernobog",
    causeObservedAt:
      "2026-08-25T23:10:00.000Z",
    effectObservedAt:
      "2026-08-25T23:10:05.000Z",
    confidence: 0.95,
    supporting: true,
    evidenceEventIds: [
      "event:ollama:failed:1",
      "event:chernobog:degraded:1",
    ],
  });

const oneIncident =
  evaluateWorldModelCausalHypothesis(
    graph,
    "service:ollama",
    "project:chernobog",
    [
      observation1,
    ],
  );

assert.equal(
  oneIncident.status,
  "insufficient",
);
assert.equal(
  oneIncident.supportCount,
  1,
);
pass(
  "a single temporally ordered incident is insufficient to claim causality",
);

const observation2 =
  createWorldModelCausalObservation({
    id:
      "causal-observation:2",
    causeEntityId:
      "service:ollama",
    effectEntityId:
      "project:chernobog",
    causeObservedAt:
      "2026-08-25T23:20:00.000Z",
    effectObservedAt:
      "2026-08-25T23:20:04.000Z",
    confidence: 0.9,
    supporting: true,
  });

const twoIncidents =
  evaluateWorldModelCausalHypothesis(
    graph,
    "service:ollama",
    "project:chernobog",
    [
      observation1,
      observation2,
    ],
  );

assert.equal(
  twoIncidents.status,
  "plausible",
);
assert.equal(
  twoIncidents.supportCount,
  2,
);
pass(
  "repeated temporally ordered evidence can make a causal hypothesis plausible without declaring it fact",
);

const observation3 =
  createWorldModelCausalObservation({
    id:
      "causal-observation:3",
    causeEntityId:
      "service:ollama",
    effectEntityId:
      "project:chernobog",
    causeObservedAt:
      "2026-08-25T23:30:00.000Z",
    effectObservedAt:
      "2026-08-25T23:30:03.000Z",
    confidence: 0.95,
    supporting: true,
  });

const supported =
  evaluateWorldModelCausalHypothesis(
    graph,
    "service:ollama",
    "project:chernobog",
    [
      observation1,
      observation2,
      observation3,
    ],
  );

assert.equal(
  supported.status,
  "supported",
);
assert.ok(
  supported.confidence >=
    0.65,
);
assert.ok(
  supported.structuralRelationships.length >
    0,
);
pass(
  "three strong repeated incidents plus structural dependency can support a causal hypothesis",
);

const contradiction =
  createWorldModelCausalObservation({
    id:
      "causal-observation:contradiction",
    causeEntityId:
      "service:ollama",
    effectEntityId:
      "project:chernobog",
    causeObservedAt:
      "2026-08-25T23:40:05.000Z",
    effectObservedAt:
      "2026-08-25T23:40:00.000Z",
    confidence: 1,
    supporting: true,
  });

const contradicted =
  evaluateWorldModelCausalHypothesis(
    graph,
    "service:ollama",
    "project:chernobog",
    [
      contradiction,
      createWorldModelCausalObservation({
        id:
          "causal-observation:negative-1",
        causeEntityId:
          "service:ollama",
        effectEntityId:
          "project:chernobog",
        causeObservedAt:
          "2026-08-25T23:41:00.000Z",
        effectObservedAt:
          "2026-08-25T23:41:02.000Z",
        confidence: 0.9,
        supporting: false,
      }),
    ],
  );

assert.equal(
  contradicted.status,
  "contradicted",
);
assert.equal(
  contradicted.supportCount,
  0,
);
assert.equal(
  contradicted.contradictionCount,
  2,
);
pass(
  "reversed temporal order and explicit negative evidence count against causal hypotheses",
);

const reordered =
  evaluateWorldModelCausalHypothesis(
    graph,
    "service:ollama",
    "project:chernobog",
    [
      observation3,
      observation1,
      observation2,
    ],
  );

assert.deepEqual(
  reordered.observations.map(
    (observation) =>
      observation.id,
  ),
  supported.observations.map(
    (observation) =>
      observation.id,
  ),
);
assert.equal(
  reordered.confidence,
  supported.confidence,
);
pass(
  "causal evaluation is deterministic regardless of observation input order",
);

assert.throws(() =>
  createWorldModelCausalObservation({
    id:
      "bad-confidence",
    causeEntityId:
      "service:ollama",
    effectEntityId:
      "project:chernobog",
    causeObservedAt:
      "2026-08-25T23:50:00.000Z",
    effectObservedAt:
      "2026-08-25T23:50:01.000Z",
    confidence: 2,
  }),
);
pass(
  "invalid causal observation confidence is rejected",
);

const keys =
  Object.keys(supported);

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
assert.equal(
  keys.includes(
    "execute",
  ),
  false,
);
pass(
  "11J-C keeps causality explicitly hypothetical and does not create an execution path",
);

console.log(
  "==================================================",
);
console.log(
  "PASS Phase 11J-C Causal & Dependency Model acceptance",
);
