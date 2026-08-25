import assert from "node:assert/strict";

import { createWorldStateRecord } from "../lib/chernobog/worldState";
import {
  ChernobogAttentionQueue,
  ChernobogWorldStateAttention,
  assessWorldStateSalience,
  salienceBandForScore,
} from "../lib/chernobog/cognition";

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

function record(
  key: string,
  value:
    | string
    | number
    | boolean
    | null
    | Record<string, string | number | boolean | null>,
  options: {
    observedAt?: string;
    confidence?: number;
    expiresAt?: string;
  } = {},
) {
  return createWorldStateRecord(
    {
      key,
      value,
      observedAt: options.observedAt ?? "2026-08-25T17:00:00.000Z",
      confidence: options.confidence ?? 1,
      expiresAt: options.expiresAt,
      freshnessBasis: options.expiresAt ? "explicit-expiry" : "none",
      provenance: {
        eventId: `event:${key}`,
        eventType: "verification.observed",
        projectorId: "verification-projector",
        source: { subsystem: "verification" },
      },
    },
    new Date("2026-08-25T17:00:01.000Z"),
  );
}

console.log("Chernobog Phase 11H-A - Attention & Salience");
console.log("=============================================");

assert.equal(salienceBandForScore(10), "none");
assert.equal(salienceBandForScore(25), "low");
assert.equal(salienceBandForScore(50), "normal");
assert.equal(salienceBandForScore(70), "high");
assert.equal(salienceBandForScore(90), "critical");
pass("salience bands are deterministic");

const healthy = assessWorldStateSalience(
  { current: record("service.ollama.health", "healthy") },
  { now: new Date("2026-08-25T17:00:02.000Z") },
);

const failed = assessWorldStateSalience(
  {
    previous: record("service.ollama.health", "healthy", {
      observedAt: "2026-08-25T16:59:00.000Z",
    }),
    current: record("service.ollama.health", "failed"),
  },
  { now: new Date("2026-08-25T17:00:02.000Z") },
);

assert.ok(failed.score > healthy.score);
assert.equal(failed.band, "critical");
assert.ok(failed.reasons.some((reason) => reason.code === "critical-state"));
pass("service failure is substantially more salient than healthy baseline state");

const degraded = assessWorldStateSalience(
  {
    previous: record("storage.vault.health", "healthy", {
      observedAt: "2026-08-25T16:59:00.000Z",
    }),
    current: record("storage.vault.health", "degraded"),
  },
  { now: new Date("2026-08-25T17:00:02.000Z") },
);

assert.ok(degraded.reasons.some((reason) => reason.code === "degraded-state"));
assert.ok(degraded.score > healthy.score);
pass("degraded infrastructure receives elevated attention");

const recovered = assessWorldStateSalience(
  {
    previous: record("service.ollama.health", "failed", {
      observedAt: "2026-08-25T16:59:00.000Z",
    }),
    current: record("service.ollama.health", "healthy"),
  },
  { now: new Date("2026-08-25T17:00:02.000Z") },
);

assert.ok(recovered.reasons.some((reason) => reason.code === "recovery-state"));
pass("recovery transitions are recognized separately from failures");

const stale = assessWorldStateSalience(
  {
    current: record("backup.primary.health", "healthy", {
      observedAt: "2026-08-25T16:00:00.000Z",
      expiresAt: "2026-08-25T16:05:00.000Z",
    }),
  },
  { now: new Date("2026-08-25T17:00:02.000Z") },
);

assert.ok(stale.reasons.some((reason) => reason.code === "stale-evidence"));
pass("stale evidence raises an explicit attention reason");

const highConfidenceFailure = assessWorldStateSalience(
  {
    current: record("service.database.health", "failed", {
      confidence: 1,
    }),
  },
  { now: new Date("2026-08-25T17:00:02.000Z") },
);

const lowConfidenceFailure = assessWorldStateSalience(
  {
    current: record("service.database.health", "failed", {
      confidence: 0.2,
    }),
  },
  { now: new Date("2026-08-25T17:00:02.000Z") },
);

assert.ok(lowConfidenceFailure.score < highConfidenceFailure.score);
assert.ok(
  lowConfidenceFailure.reasons.some((reason) => reason.code === "low-confidence"),
);
pass("weak evidence dampens salience instead of being treated as certain");

const unchanged = assessWorldStateSalience(
  {
    previous: record("project.chernobog.git.dirty", false),
    current: record("project.chernobog.git.dirty", false),
  },
  { now: new Date("2026-08-25T17:00:02.000Z") },
);

const changed = assessWorldStateSalience(
  {
    previous: record("project.chernobog.git.dirty", false),
    current: record("project.chernobog.git.dirty", true),
  },
  { now: new Date("2026-08-25T17:00:02.000Z") },
);

assert.equal(unchanged.changed, false);
assert.equal(changed.changed, true);
assert.ok(changed.score > unchanged.score);
pass("actual state transitions outrank unchanged observations");

const queue = new ChernobogAttentionQueue(3);
queue.upsert(healthy);
queue.upsert(failed);
queue.upsert(degraded);

assert.deepEqual(
  queue.list().map((signal) => signal.key),
  ["service.ollama.health", "storage.vault.health"],
);
pass("attention queue deduplicates by fact key and ranks highest salience first");

const attention = new ChernobogWorldStateAttention({
  clock: () => new Date("2026-08-25T17:00:02.000Z"),
});

const observed = attention.observe(
  record("runtime.node.desktop.online", false),
  record("runtime.node.desktop.online", true, {
    observedAt: "2026-08-25T16:59:00.000Z",
  }),
);

assert.ok(observed.score >= 65);
assert.equal(attention.queue.size, 1);
pass("World State attention facade converts factual changes into queued cognitive signals");

const mutationProbe = attention.queue.get(observed.key);
assert.ok(mutationProbe);
if (!mutationProbe) throw new Error("Expected attention signal.");
mutationProbe.score = 0;
assert.notEqual(attention.queue.get(observed.key)?.score, 0);
pass("attention queue returns defensive clones");

const signalKeys = Object.keys(observed);
assert.equal(signalKeys.includes("action"), false);
assert.equal(signalKeys.includes("decision"), false);
assert.equal(signalKeys.includes("recommendation"), false);
pass("11H-A assesses attention without selecting actions, decisions, or recommendations");

console.log("=============================================");
console.log("PASS Phase 11H-A Attention & Salience acceptance");
