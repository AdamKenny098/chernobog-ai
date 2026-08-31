import assert from "node:assert/strict";

import type { WorldStateRecord } from "../lib/chernobog/worldState";
import {
  assessDownstreamImpact,
  ChernobogWorldModelProjector,
  groundWorldStateRelationship,
} from "../lib/chernobog/worldModel";

function record(input: {
  key: string;
  value: WorldStateRecord["value"];
  eventType: string;
  eventId: string;
  observedAt?: string;
}): WorldStateRecord {
  const observedAt = input.observedAt ?? "2026-08-31T15:00:53.936Z";
  return {
    schemaVersion: 1,
    key: input.key,
    namespace: "model",
    value: input.value,
    observedAt,
    updatedAt: observedAt,
    confidence: 1,
    confidenceBasis: "default",
    freshness: {
      status: "fresh",
      basis: "ttl",
      expiresAt: "2026-08-31T15:05:53.936Z",
      ttlMs: 300_000,
      evaluatedAt: "2026-08-31T15:00:54.000Z",
    },
    provenance: {
      eventId: input.eventId,
      eventType: input.eventType,
      eventOccurredAt: observedAt,
      eventReceivedAt: observedAt,
      projectorId: "phase11-model-dependency-test",
      source: { subsystem: "runtime-health" },
    },
  };
}

function pass(label: string): void {
  console.log(`PASS ${label}`);
}

const provider = record({
  key: "model.ollama.observation",
  value: {
    id: "ollama",
    kind: "model-provider",
    status: "healthy",
    platform: "win32",
    latencyMs: 6,
    capabilities: ["generate", "model-discovery"],
  },
  eventType: "runtime.model_available",
  eventId: "evt-provider",
});

const assignment = record({
  key: "model.role.planner.assignment",
  value: {
    providerId: "ollama",
    role: "planner",
    configuredModel: "deepseek-coder-v2:16b",
    source: "env",
    available: true,
    matchedInstalledModel: "deepseek-coder-v2:16b",
  },
  eventType: "runtime.model_role_available",
  eventId: "evt-role-planner",
});

const projection = groundWorldStateRelationship(assignment);
assert.ok(projection.entities.some((item) => item.id === "model-role:planner"));
pass("assignment grounds a role-specific canonical entity");

assert.ok(
  projection.entities.some(
    (item) => item.id === "model:deepseek-coder-v2:16b",
  ),
);
pass("assignment grounds its observed matched model as a canonical entity");

assert.ok(
  projection.relationships.some(
    (item) =>
      item.type === "requires-model" &&
      item.fromEntityId === "model-role:planner" &&
      item.toEntityId === "model:deepseek-coder-v2:16b",
  ),
);
pass("role assignment grounds a requires-model dependency");

assert.ok(
  projection.relationships.some(
    (item) =>
      item.type === "served-by" &&
      item.fromEntityId === "model:deepseek-coder-v2:16b" &&
      item.toEntityId === "model:ollama",
  ),
);
pass("assignment grounds concrete model served-by provider dependency");

const requiresModel = projection.relationships.find(
  (item) => item.type === "requires-model",
);
assert.deepEqual(requiresModel?.evidence?.worldStateKeys, [
  "model.role.planner.assignment",
]);
assert.deepEqual(requiresModel?.evidence?.eventIds, ["evt-role-planner"]);
pass("dependency preserves World State key and event provenance");

assert.ok(projection.relationships.some((item) => item.type === "has-state"));
pass("existing has-state grounding remains present");

const projector = new ChernobogWorldModelProjector();
const result = projector.project([assignment, provider]);
assert.equal(result.skippedRelationships, 0);
pass("entity-first projector resolves cross-record provider endpoint without skipped relationships");

const graph = projector.graph;
assert.ok(graph.getEntity("model:ollama"));
assert.ok(graph.getEntity("model:deepseek-coder-v2:16b"));
assert.ok(graph.getEntity("model-role:planner"));
pass("provider concrete model and role all exist in canonical graph");

const impact = assessDownstreamImpact(graph, "model:ollama");
assert.ok(
  impact.directlyDependentEntityIds.includes("model:deepseek-coder-v2:16b"),
);
assert.ok(
  impact.transitivelyDependentEntityIds.includes("model-role:planner"),
);
pass("provider impact propagates through model to dependent role");

const unsupported = record({
  key: "model.role.planner.assignment",
  value: { role: "planner", available: false },
  eventType: "runtime.model_role_unavailable",
  eventId: "evt-role-missing",
});
const unsupportedProjection = groundWorldStateRelationship(unsupported);
assert.equal(
  unsupportedProjection.relationships.filter(
    (item) => item.type === "requires-model" || item.type === "served-by",
  ).length,
  0,
);
pass("missing provider/model fields do not manufacture dependencies");

console.log("PASS Phase 11 Model Dependency Grounding v1 Acceptance");
