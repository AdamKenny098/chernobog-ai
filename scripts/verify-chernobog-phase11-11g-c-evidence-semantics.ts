import assert from "node:assert/strict";

import type { ChernobogEvent } from "../lib/chernobog/events/types";
import {
  ChernobogWorldStateProjectionEngine,
  ChernobogWorldStateRegistry,
  assessWorldStateEvidence,
  buildWorldStateInputFromEvent,
  createWorldStateRecord,
  getWorldStateConfidenceBand,
  getWorldStateProvenanceStatus,
  resolveWorldStateExpiry,
} from "../lib/chernobog/worldState";

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

function makeEvent(
  overrides: Partial<ChernobogEvent> = {},
): ChernobogEvent {
  return {
    id: "evt-c-001",
    type: "runtime.ollama.health_changed",
    occurredAt: "2026-08-24T21:00:00.000Z",
    receivedAt: "2026-08-24T21:00:01.000Z",
    source: {
      subsystem: "ollama-health",
      nodeId: "desktop",
    },
    severity: "info",
    subject: "ollama",
    scope: "local-runtime",
    correlationId: "corr-001",
    causationId: "cause-001",
    payload: {
      health: "healthy",
    },
    metadata: {
      schemaVersion: 1,
      confidence: 0.72,
      expiresAt: "2026-08-24T21:05:00.000Z",
    },
    ...overrides,
  };
}

async function main(): Promise<void> {
  console.log(
    "Chernobog Phase 11G-C - Provenance, Freshness & Confidence",
  );
  console.log(
    "==========================================================",
  );

  assert.equal(
    getWorldStateConfidenceBand(0.95),
    "high",
  );
  assert.equal(
    getWorldStateConfidenceBand(0.72),
    "medium",
  );
  assert.equal(
    getWorldStateConfidenceBand(0.2),
    "low",
  );
  pass("confidence bands are deterministic");

  assert.equal(
    resolveWorldStateExpiry(
      "2026-08-24T21:00:00.000Z",
      120_000,
    ),
    "2026-08-24T21:02:00.000Z",
  );
  pass("TTL freshness resolves to deterministic expiry");

  assert.throws(() =>
    resolveWorldStateExpiry(
      "2026-08-24T21:00:00.000Z",
      -1,
    ),
  );
  pass("invalid TTL values are rejected");

  const eventDerived =
    buildWorldStateInputFromEvent(
      makeEvent(),
      {
        key: "service.ollama.health",
        value: "healthy",
      },
      "ollama-health-projector",
    );

  assert.equal(
    eventDerived.confidence,
    0.72,
  );
  assert.equal(
    eventDerived.confidenceBasis,
    "event",
  );
  assert.equal(
    eventDerived.freshnessBasis,
    "event-expiry",
  );
  assert.equal(
    eventDerived.provenance?.projectorId,
    "ollama-health-projector",
  );
  assert.equal(
    eventDerived.provenance?.correlationId,
    "corr-001",
  );
  assert.equal(
    eventDerived.provenance?.causationId,
    "cause-001",
  );
  assert.equal(
    eventDerived.provenance?.subject,
    "ollama",
  );
  assert.equal(
    eventDerived.provenance?.scope,
    "local-runtime",
  );
  pass(
    "event confidence, expiry, lineage, subject, scope, and projector provenance are preserved",
  );

  const projectorOverride =
    buildWorldStateInputFromEvent(
      makeEvent(),
      {
        key: "service.ollama.health",
        value: "healthy",
        confidence: 0.98,
        ttlMs: 30_000,
      },
      "ollama-health-projector",
    );

  assert.equal(
    projectorOverride.confidence,
    0.98,
  );
  assert.equal(
    projectorOverride.confidenceBasis,
    "projector",
  );
  assert.equal(
    projectorOverride.expiresAt,
    "2026-08-24T21:00:30.000Z",
  );
  assert.equal(
    projectorOverride.freshnessBasis,
    "ttl",
  );
  assert.equal(
    projectorOverride.freshnessTtlMs,
    30_000,
  );
  pass(
    "projector confidence and TTL deliberately override event defaults",
  );

  const defaultDerived =
    buildWorldStateInputFromEvent(
      makeEvent({
        metadata: {
          schemaVersion: 1,
        },
      }),
      {
        key: "service.ollama.health",
        value: "healthy",
      },
      "ollama-health-projector",
    );

  assert.equal(
    defaultDerived.confidence,
    1,
  );
  assert.equal(
    defaultDerived.confidenceBasis,
    "default",
  );
  assert.equal(
    defaultDerived.freshnessBasis,
    "none",
  );
  pass(
    "missing evidence metadata remains explicit through default confidence and unknown freshness",
  );

  const now =
    new Date("2026-08-24T21:00:10.000Z");

  const record = createWorldStateRecord(
    projectorOverride,
    now,
  );

  assert.equal(
    record.confidenceBasis,
    "projector",
  );
  assert.equal(
    record.freshness.basis,
    "ttl",
  );
  assert.equal(
    record.freshness.ttlMs,
    30_000,
  );
  assert.equal(
    record.freshness.status,
    "aging",
  );
  assert.equal(
    getWorldStateProvenanceStatus(
      record.provenance,
    ),
    "complete",
  );
  pass(
    "canonical records retain evidence semantics and complete provenance",
  );

  assert.equal(
    getWorldStateProvenanceStatus({
      eventId: "evt-only",
    }),
    "partial",
  );
  assert.equal(
    getWorldStateProvenanceStatus(undefined),
    "absent",
  );
  pass(
    "provenance explicitly distinguishes complete, partial, and absent lineage",
  );

  const assessment =
    assessWorldStateEvidence(
      record,
      new Date(
        "2026-08-24T21:00:31.000Z",
      ),
    );

  assert.equal(
    assessment.ageMs,
    31_000,
  );
  assert.equal(
    assessment.confidenceBand,
    "high",
  );
  assert.equal(
    assessment.confidenceBasis,
    "projector",
  );
  assert.equal(
    assessment.freshness.status,
    "stale",
  );
  assert.equal(
    assessment.freshness.basis,
    "ttl",
  );
  assert.equal(
    assessment.provenanceStatus,
    "complete",
  );
  assert.equal(
    assessment.projectorId,
    "ollama-health-projector",
  );
  assert.equal(
    assessment.sourceSubsystem,
    "ollama-health",
  );
  pass(
    "evidence assessment reports age, confidence, freshness, and lineage without cognitive interpretation",
  );

  let registryNow =
    new Date("2026-08-24T21:00:00.000Z");

  const registry =
    new ChernobogWorldStateRegistry(
      () => registryNow,
    );

  registry.upsert({
    key: "service.alpha.health",
    value: "healthy",
    confidence: 0.9,
    observedAt:
      "2026-08-24T20:59:50.000Z",
  });

  registry.upsert({
    key: "service.beta.health",
    value: "unknown",
    confidence: 0.4,
    observedAt:
      "2026-08-24T20:59:50.000Z",
  });

  assert.deepEqual(
    registry
      .list({
        namespace: "service",
        minConfidence: 0.8,
      })
      .map((item) => item.key),
    ["service.alpha.health"],
  );
  pass(
    "world-state queries can filter on objective confidence thresholds",
  );

  assert.throws(() =>
    registry.list({
      minConfidence: 1.1,
    }),
  );
  pass(
    "invalid confidence query thresholds are rejected",
  );

  const engine =
    new ChernobogWorldStateProjectionEngine({
      worldState:
        new ChernobogWorldStateRegistry(
          () =>
            new Date(
              "2026-08-24T21:00:10.000Z",
            ),
        ),
    });

  engine.register({
    id: "health-evidence-projector",
    eventTypes: [
      "runtime.ollama.health_changed",
    ],
    project(input) {
      const payload =
        input.payload as {
          health: string;
        };

      return {
        key: "service.ollama.health",
        value: payload.health,
        confidence: 0.88,
        ttlMs: 45_000,
      };
    },
  });

  engine.process(makeEvent());

  const projected =
    engine.worldState.get(
      "service.ollama.health",
    );

  assert.ok(projected);
  assert.equal(
    projected.provenance?.projectorId,
    "health-evidence-projector",
  );
  assert.equal(
    projected.confidence,
    0.88,
  );
  assert.equal(
    projected.confidenceBasis,
    "projector",
  );
  assert.equal(
    projected.freshness.basis,
    "ttl",
  );
  assert.equal(
    projected.freshness.expiresAt,
    "2026-08-24T21:00:45.000Z",
  );
  pass(
    "projection engine automatically records projector identity, confidence origin, and TTL freshness",
  );

  registryNow =
    new Date("2026-08-24T22:00:00.000Z");

  assert.equal(
    registry
      .list({
        namespace: "service",
      })[0]?.freshness.basis,
    "none",
  );
  pass(
    "read-time freshness reevaluation preserves freshness basis metadata",
  );

  console.log(
    "==========================================================",
  );
  console.log(
    "PASS Phase 11G-C Provenance, Freshness & Confidence acceptance",
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
