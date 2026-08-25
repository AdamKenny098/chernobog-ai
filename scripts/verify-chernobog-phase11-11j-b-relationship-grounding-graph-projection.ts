import assert from "node:assert/strict";

import {
  createWorldStateRecord,
} from "../lib/chernobog/worldState";
import type {
  WorldStateJsonValue,
} from "../lib/chernobog/worldState";
import {
  ChernobogWorldModelProjector,
  groundWorldStateRelationship,
} from "../lib/chernobog/worldModel";

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

function record(
  key: string,
  value: WorldStateJsonValue,
  observedAt =
    "2026-08-25T22:40:00.000Z",
) {
  return createWorldStateRecord(
    {
      key,
      value,
      observedAt,
      confidence: 0.95,
      provenance: {
        eventId:
          `event:${key}:${observedAt}`,
        eventType:
          "verification.observed",
        projectorId:
          "verification",
        source: {
          subsystem:
            "verification",
        },
      },
    },
    new Date(
      "2026-08-25T22:40:01.000Z",
    ),
  );
}

console.log(
  "Chernobog Phase 11J-B - Relationship Grounding & Graph Projection",
);
console.log(
  "=================================================================",
);

const serviceRecord =
  record(
    "service.ollama.health",
    "healthy",
  );

const serviceProjection =
  groundWorldStateRelationship(
    serviceRecord,
  );

assert.ok(
  serviceProjection.entities.some(
    (entity) =>
      entity.id ===
      "service:ollama",
  ),
);

assert.ok(
  serviceProjection.entities.some(
    (entity) =>
      entity.id ===
      "world-state:service.ollama.health",
  ),
);

assert.deepEqual(
  serviceProjection.relationships.map(
    (relation) =>
      relation.type,
  ),
  ["has-state"],
);
pass(
  "service World State facts ground into canonical service plus fact entities",
);

const projectRecord =
  record(
    "project.chernobog.repository.main.health",
    "healthy",
  );

const projectProjection =
  groundWorldStateRelationship(
    projectRecord,
  );

assert.ok(
  projectProjection.entities.some(
    (entity) =>
      entity.id ===
      "project:chernobog",
  ),
);

assert.ok(
  projectProjection.entities.some(
    (entity) =>
      entity.id ===
      "repository:main",
  ),
);

assert.ok(
  projectProjection.relationships.some(
    (relation) =>
      relation.type ===
      "uses-repository" &&
      relation.fromEntityId ===
      "project:chernobog" &&
      relation.toEntityId ===
      "repository:main",
  ),
);
pass(
  "project repository facts create grounded project-to-repository structure",
);

const genericRecord =
  record(
    "runtime.node.desktop.online",
    true,
  );

const genericProjection =
  groundWorldStateRelationship(
    genericRecord,
  );

assert.equal(
  genericProjection.entities.length,
  1,
);
assert.equal(
  genericProjection.relationships.length,
  0,
);
pass(
  "unsupported namespaces remain grounded facts without invented relationships",
);

const projector =
  new ChernobogWorldModelProjector();

const result =
  projector.project([
    serviceRecord,
    projectRecord,
    record(
      "repository.main.dirty",
      false,
    ),
    record(
      "model.default.available",
      true,
    ),
    record(
      "storage.primary.health",
      "healthy",
    ),
    record(
      "backup.primary.status",
      "complete",
    ),
  ]);

assert.equal(
  result.projectedRecords,
  6,
);
assert.equal(
  result.skippedRelationships,
  0,
);
assert.ok(
  projector.graph.entityCount >=
    10,
);
assert.ok(
  projector.graph.relationshipCount >=
    6,
);
pass(
  "projection engine deterministically builds a multi-domain world graph",
);

const serviceNeighbors =
  projector.graph.neighbors(
    "service:ollama",
  );

assert.ok(
  serviceNeighbors.some(
    (neighbor) =>
      neighbor.relationship.type ===
        "has-state" &&
      neighbor.entity.id ===
        "world-state:service.ollama.health",
  ),
);
pass(
  "canonical entities connect to the factual evidence that currently describes them",
);

const projectNeighbors =
  projector.graph.neighbors(
    "project:chernobog",
  );

assert.ok(
  projectNeighbors.some(
    (neighbor) =>
      neighbor.relationship.type ===
        "uses-repository" &&
      neighbor.entity.id ===
        "repository:main",
  ),
);
pass(
  "grounded cross-entity relationships are traversable after projection",
);

const firstSnapshot =
  projector.graph.snapshot();

projector.project([
  serviceRecord,
  projectRecord,
]);

const secondSnapshot =
  projector.graph.snapshot();

assert.equal(
  secondSnapshot.entities.length,
  firstSnapshot.entities.length,
);
assert.equal(
  secondSnapshot.relationships.length,
  firstSnapshot.relationships.length,
);
pass(
  "replaying identical World State facts is idempotent at graph identity level",
);

projector.project([
  record(
    "service.ollama.health",
    "failed",
    "2026-08-25T22:41:00.000Z",
  ),
]);

const serviceFact =
  projector.graph.getEntity(
    "world-state:service.ollama.health",
  );

assert.equal(
  serviceFact?.attributes.value,
  "failed",
);
pass(
  "newer World State observations update existing grounded fact entities",
);

projector.project([
  record(
    "service.ollama.health",
    "healthy",
    "2026-08-25T22:39:00.000Z",
  ),
]);

assert.equal(
  projector.graph.getEntity(
    "world-state:service.ollama.health",
  )?.attributes.value,
  "failed",
);
pass(
  "older observations cannot roll the projected graph backward",
);

const relation =
  projector.graph
    .listRelationships()
    .find(
      (item) =>
        item.type ===
        "uses-repository",
    );

assert.ok(relation);

if (!relation) {
  throw new Error(
    "Expected uses-repository relation.",
  );
}

assert.ok(
  relation.evidence
    .worldStateKeys.includes(
      "project.chernobog.repository.main.health",
    ),
);
assert.ok(
  relation.evidence
    .eventIds.length === 1,
);
pass(
  "projected relationships retain World State and Event Spine provenance",
);

const relationshipKeys =
  projector.graph
    .listRelationships()
    .flatMap(
      (item) =>
        Object.keys(item),
    );

assert.equal(
  relationshipKeys.includes(
    "inferredCause",
  ),
  false,
);
assert.equal(
  relationshipKeys.includes(
    "predictedState",
  ),
  false,
);
assert.equal(
  relationshipKeys.includes(
    "probability",
  ),
  false,
);
pass(
  "11J-B grounds observed structure without inventing causal or predictive semantics",
);

console.log(
  "=================================================================",
);
console.log(
  "PASS Phase 11J-B Relationship Grounding & Graph Projection acceptance",
);

