import assert from "node:assert/strict";

import {
  createWorldStateRecord,
} from "../lib/chernobog/worldState";
import {
  ChernobogWorldModelGraph,
  buildWorldModelEntity,
  buildWorldModelRelationship,
  worldModelEntityFromWorldState,
} from "../lib/chernobog/worldModel";

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

console.log(
  "Chernobog Phase 11J-A - Entity & Relationship Model",
);
console.log(
  "====================================================",
);

const service =
  buildWorldModelEntity({
    id:
      "service:ollama",
    kind:
      "service",
    label:
      "Ollama",
    aliases: [
      "ollama",
      "Ollama",
    ],
    confidence: 1,
    observedAt:
      "2026-08-25T22:20:00.000Z",
    attributes: {
      provider:
        "local",
    },
    evidence: {
      eventIds: [
        "event:ollama:health",
      ],
    },
  });

assert.equal(
  service.id,
  "service:ollama",
);
assert.deepEqual(
  service.aliases,
  [
    "Ollama",
    "ollama",
  ],
);
pass(
  "world-model entities normalize identifiers, evidence, aliases, confidence, and attributes",
);

assert.throws(() =>
  buildWorldModelEntity({
    id:
      "Bad Entity ID",
    kind:
      "service",
    label:
      "Bad",
    observedAt:
      "2026-08-25T22:20:00.000Z",
  }),
);

assert.throws(() =>
  buildWorldModelEntity({
    id:
      "service:bad",
    kind:
      "service",
    label:
      "Bad",
    observedAt:
      "2026-08-25T22:20:00.000Z",
    confidence: 2,
  }),
);

assert.throws(() =>
  buildWorldModelEntity({
    id:
      "service:bad-context",
    kind:
      "service",
    label:
      "Bad",
    observedAt:
      "2026-08-25T22:20:00.000Z",
    attributes: {
      invalid:
        BigInt(1),
    },
  }),
);
pass(
  "invalid identifiers, confidence, and non-JSON-safe attributes are rejected",
);

const project =
  buildWorldModelEntity({
    id:
      "project:chernobog",
    kind:
      "project",
    label:
      "Chernobog",
    confidence: 1,
    observedAt:
      "2026-08-25T22:20:00.000Z",
  });

const relation =
  buildWorldModelRelationship({
    type:
      "depends-on",
    fromEntityId:
      project.id,
    toEntityId:
      service.id,
    confidence: 0.95,
    observedAt:
      "2026-08-25T22:21:00.000Z",
    evidence: {
      worldStateKeys: [
        "service.ollama.health",
      ],
    },
  });

assert.equal(
  relation.id,
  "relation:depends-on:project:chernobog->service:ollama",
);
assert.equal(
  relation.directed,
  true,
);
pass(
  "relationship identity is deterministic from type, direction, and endpoints",
);

const graph =
  new ChernobogWorldModelGraph();

graph.upsertEntity(service);
graph.upsertEntity(project);
graph.upsertRelationship(
  relation,
);

assert.equal(
  graph.entityCount,
  2,
);
assert.equal(
  graph.relationshipCount,
  1,
);
pass(
  "world-model graph stores grounded entities and relationships",
);

assert.throws(() =>
  graph.upsertRelationship({
    type:
      "depends-on",
    fromEntityId:
      "project:missing",
    toEntityId:
      service.id,
    observedAt:
      "2026-08-25T22:21:00.000Z",
  }),
);
pass(
  "relationships cannot reference nonexistent entities",
);

const outgoing =
  graph.neighbors(
    "project:chernobog",
  );

assert.equal(
  outgoing.length,
  1,
);
assert.equal(
  outgoing[0]
    ?.entity.id,
  "service:ollama",
);
assert.equal(
  outgoing[0]
    ?.direction,
  "outgoing",
);

const incoming =
  graph.neighbors(
    "service:ollama",
  );

assert.equal(
  incoming[0]
    ?.entity.id,
  "project:chernobog",
);
assert.equal(
  incoming[0]
    ?.direction,
  "incoming",
);
pass(
  "directed neighborhood queries preserve relationship direction",
);

graph.upsertEntity({
  id:
    "system:homelab",
  kind:
    "system",
  label:
    "Homelab",
  confidence: 1,
  observedAt:
    "2026-08-25T22:22:00.000Z",
});

graph.upsertRelationship({
  type:
    "connected-to",
  fromEntityId:
    "system:homelab",
  toEntityId:
    "service:ollama",
  directed: false,
  confidence: 0.9,
  observedAt:
    "2026-08-25T22:22:01.000Z",
});

assert.ok(
  graph.neighbors(
    "service:ollama",
  ).some(
    (neighbor) =>
      neighbor.direction ===
        "undirected" &&
      neighbor.entity.id ===
        "system:homelab",
  ),
);
pass(
  "undirected relationships are traversable from either endpoint",
);

const older =
  graph.upsertEntity({
    id:
      "service:ollama",
    kind:
      "service",
    label:
      "Old Ollama",
    confidence: 0.2,
    observedAt:
      "2026-08-25T22:00:00.000Z",
  });

assert.equal(
  older.label,
  "Ollama",
);
pass(
  "older entity observations cannot overwrite newer model state",
);

const stateRecord =
  createWorldStateRecord(
    {
      key:
        "service.ollama.health",
      value:
        "failed",
      observedAt:
        "2026-08-25T22:23:00.000Z",
      confidence: 0.98,
      provenance: {
        eventId:
          "event:ollama:failed",
        eventType:
          "service.health.failed",
        projectorId:
          "verification",
        source: {
          subsystem:
            "verification",
        },
      },
    },
    new Date(
      "2026-08-25T22:23:01.000Z",
    ),
  );

const grounded =
  buildWorldModelEntity(
    worldModelEntityFromWorldState(
      stateRecord,
    ),
  );

assert.equal(
  grounded.id,
  "world-state:service.ollama.health",
);
assert.equal(
  grounded.kind,
  "service",
);
assert.deepEqual(
  grounded.evidence
    .worldStateKeys,
  [
    "service.ollama.health",
  ],
);
assert.deepEqual(
  grounded.evidence
    .eventIds,
  [
    "event:ollama:failed",
  ],
);
pass(
  "11G World State records can be grounded into world-model entities with provenance intact",
);

const snapshot =
  graph.snapshot();

snapshot.entities[0]!.label =
  "mutated";

assert.notEqual(
  graph.snapshot()
    .entities[0]?.label,
  "mutated",
);
pass(
  "world-model snapshots and query results are defensively cloned",
);

const relationshipKeys =
  Object.keys(relation);

assert.equal(
  relationshipKeys.includes(
    "causes",
  ),
  false,
);
assert.equal(
  relationshipKeys.includes(
    "prediction",
  ),
  false,
);
assert.equal(
  relationshipKeys.includes(
    "nextState",
  ),
  false,
);
pass(
  "11J-A represents structure without inventing causal inference or prediction",
);

console.log(
  "====================================================",
);
console.log(
  "PASS Phase 11J-A Entity & Relationship Model acceptance",
);
