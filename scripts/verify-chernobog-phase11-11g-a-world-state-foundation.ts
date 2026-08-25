import assert from "node:assert/strict";

import {
  ChernobogWorldStateRegistry,
  CHERNOBOG_WORLD_STATE_SCHEMA_VERSION,
  buildWorldStateFreshness,
  compareWorldStateRecency,
  createWorldStateKey,
  createWorldStateRecord,
  getWorldStateNamespace,
} from "../lib/chernobog/worldState";

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

function expectThrow(action: () => unknown, message: string): void {
  assert.throws(action);
  pass(message);
}

const baseNow = new Date("2026-08-24T21:00:00.000Z");

console.log("Chernobog Phase 11G-A â€” World State Foundation");
console.log("================================================");

assert.equal(
  createWorldStateKey("service", "ollama", "health"),
  "service.ollama.health",
);
pass("canonical world-state keys can be constructed");

assert.equal(getWorldStateNamespace("project.chernobog.phase"), "project");
pass("namespace derives deterministically from key");

expectThrow(
  () =>
    createWorldStateRecord(
      {
        key: "Service.Ollama.Health",
        value: "healthy",
      },
      baseNow,
    ),
  "invalid non-canonical keys are rejected",
);

expectThrow(
  () =>
    createWorldStateRecord(
      {
        key: "service.ollama.health",
        namespace: "runtime",
        value: "healthy",
      },
      baseNow,
    ),
  "namespace/key mismatches are rejected",
);

const record = createWorldStateRecord(
  {
    key: "service.ollama.health",
    value: "healthy",
    observedAt: "2026-08-24T20:59:55+00:00",
    confidence: 0.95,
    expiresAt: "2026-08-24T21:01:00+00:00",
    provenance: {
      eventId: "event-001",
      eventType: "runtime.ollama_health",
      eventOccurredAt: "2026-08-24T20:59:55+00:00",
      eventReceivedAt: "2026-08-24T20:59:56+00:00",
      source: {
        subsystem: "ollama-health",
        nodeId: "desktop",
      },
    },
  },
  baseNow,
);

assert.equal(record.schemaVersion, CHERNOBOG_WORLD_STATE_SCHEMA_VERSION);
assert.equal(record.namespace, "service");
assert.equal(record.observedAt, "2026-08-24T20:59:55.000Z");
assert.equal(record.confidence, 0.95);
assert.equal(record.freshness.status, "aging");
assert.equal(record.provenance?.eventId, "event-001");
pass("canonical records preserve value, timestamps, confidence, freshness, and provenance");

expectThrow(
  () =>
    createWorldStateRecord(
      {
        key: "service.ollama.health",
        value: "healthy",
        confidence: 1.1,
      },
      baseNow,
    ),
  "confidence outside zero-to-one is rejected",
);


expectThrow(
  () =>
    createWorldStateRecord(
      {
        key: "runtime.load.value",
        value: Number.NaN,
      },
      baseNow,
    ),
  "non-JSON-safe world-state values are rejected",
);

assert.equal(
  buildWorldStateFreshness(
    {
      observedAt: "2026-08-24T21:00:00.000Z",
      expiresAt: "2026-08-24T21:10:00.000Z",
    },
    {
      now: new Date("2026-08-24T21:05:00.000Z"),
      agingWindowMs: 60_000,
    },
  ).status,
  "fresh",
);
pass("freshness marks observations fresh before aging window");

assert.equal(
  buildWorldStateFreshness(
    {
      observedAt: "2026-08-24T21:00:00.000Z",
      expiresAt: "2026-08-24T21:10:00.000Z",
    },
    {
      now: new Date("2026-08-24T21:09:30.000Z"),
      agingWindowMs: 60_000,
    },
  ).status,
  "aging",
);
pass("freshness marks observations aging near expiry");

assert.equal(
  buildWorldStateFreshness(
    {
      observedAt: "2026-08-24T21:00:00.000Z",
      expiresAt: "2026-08-24T21:10:00.000Z",
    },
    {
      now: new Date("2026-08-24T21:10:00.000Z"),
    },
  ).status,
  "stale",
);
pass("freshness marks expired observations stale");

assert.equal(
  buildWorldStateFreshness(
    {
      observedAt: "2026-08-24T21:00:00.000Z",
    },
    {
      now: baseNow,
    },
  ).status,
  "unknown",
);
pass("observations without an expiry have explicit unknown freshness");

const older = createWorldStateRecord(
  {
    key: "service.ollama.health",
    value: "unhealthy",
    observedAt: "2026-08-24T20:59:00.000Z",
    provenance: {
      eventId: "event-old",
      eventReceivedAt: "2026-08-24T20:59:01.000Z",
    },
  },
  baseNow,
);

const newer = createWorldStateRecord(
  {
    key: "service.ollama.health",
    value: "healthy",
    observedAt: "2026-08-24T21:00:00.000Z",
    provenance: {
      eventId: "event-new",
      eventReceivedAt: "2026-08-24T21:00:01.000Z",
    },
  },
  baseNow,
);

assert.equal(compareWorldStateRecency(older, newer), -1);
assert.equal(compareWorldStateRecency(newer, older), 1);
pass("record recency comparison is deterministic");

let registryNow = new Date("2026-08-24T21:00:00.000Z");
const registry = new ChernobogWorldStateRegistry(() => registryNow);

const created = registry.upsert({
  key: "service.ollama.health",
  value: "healthy",
  observedAt: "2026-08-24T20:59:55.000Z",
  expiresAt: "2026-08-24T21:01:00.000Z",
  provenance: {
    eventId: "event-001",
    eventReceivedAt: "2026-08-24T20:59:56.000Z",
  },
});

assert.equal(created.applied, true);
assert.equal(created.reason, "created");
assert.equal(registry.size, 1);
pass("registry creates canonical current-state records");

const rejectedOlder = registry.upsert({
  key: "service.ollama.health",
  value: "unhealthy",
  observedAt: "2026-08-24T20:59:00.000Z",
  provenance: {
    eventId: "event-older",
    eventReceivedAt: "2026-08-24T20:59:01.000Z",
  },
});

assert.equal(rejectedOlder.applied, false);
assert.equal(rejectedOlder.reason, "older-observation");
assert.equal(registry.get("service.ollama.health")?.value, "healthy");
pass("registry rejects older observations");

const updated = registry.upsert({
  key: "service.ollama.health",
  value: "unhealthy",
  observedAt: "2026-08-24T21:00:05.000Z",
  expiresAt: "2026-08-24T21:01:05.000Z",
  provenance: {
    eventId: "event-002",
    eventReceivedAt: "2026-08-24T21:00:06.000Z",
  },
});

assert.equal(updated.applied, true);
assert.equal(updated.reason, "updated");
assert.equal(registry.get("service.ollama.health")?.value, "unhealthy");
pass("registry accepts newer observations");

registry.upsert({
  key: "project.chernobog.phase",
  value: "11G",
  observedAt: "2026-08-24T21:00:05.000Z",
});

registry.upsert({
  key: "backup.primary.status",
  value: "success",
  observedAt: "2026-08-24T21:00:05.000Z",
});

const serviceRecords = registry.list({ namespace: "service" });
assert.equal(serviceRecords.length, 1);
assert.equal(serviceRecords[0]?.key, "service.ollama.health");
pass("registry supports namespace queries");

const snapshotKeys = registry.snapshot().map((entry) => entry.key);
assert.deepEqual(snapshotKeys, [
  "backup.primary.status",
  "project.chernobog.phase",
  "service.ollama.health",
]);
pass("registry snapshots are stable and key-sorted");

const returned = registry.get("project.chernobog.phase");
assert.ok(returned);
returned.value = "mutated";
assert.equal(registry.get("project.chernobog.phase")?.value, "11G");
pass("registry returns defensive clones");

registryNow = new Date("2026-08-24T21:02:00.000Z");
const staleServices = registry.list({ freshness: ["stale"] });
assert.ok(
  staleServices.some((entry) => entry.key === "service.ollama.health"),
);
pass("registry re-evaluates freshness at read time");

console.log("================================================");
console.log("PASS Phase 11G-A World State Foundation acceptance");

