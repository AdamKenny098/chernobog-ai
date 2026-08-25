import assert from "node:assert/strict";
import {
  mkdtemp,
  rm,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  ChernobogWorldStateQueryService,
  ChernobogWorldStateRegistry,
  JsonWorldStateSnapshotStore,
  buildWorldStateSnapshot,
  parseWorldStateReadQuery,
  queryPersistedWorldState,
} from "../lib/chernobog/worldState";

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

async function main(): Promise<void> {
  console.log(
    "Chernobog Phase 11G-E - State Query Layer",
  );
  console.log(
    "===========================================",
  );

  const fixedNow =
    new Date(
      "2026-08-24T22:30:00.000Z",
    );

  const registry =
    new ChernobogWorldStateRegistry(
      () => fixedNow,
    );

  registry.upsert({
    key: "service.ollama.health",
    value: "healthy",
    observedAt:
      "2026-08-24T22:29:50.000Z",
    confidence: 0.95,
    expiresAt:
      "2026-08-24T22:31:00.000Z",
    freshnessBasis:
      "explicit-expiry",
    provenance: {
      eventId: "evt-e-001",
      eventType:
        "runtime.ollama.health_changed",
      eventOccurredAt:
        "2026-08-24T22:29:50.000Z",
      eventReceivedAt:
        "2026-08-24T22:29:51.000Z",
      projectorId:
        "ollama-health-projector",
      source: {
        subsystem: "ollama-health",
      },
    },
  });

  registry.upsert({
    key: "service.backup.health",
    value: "degraded",
    observedAt:
      "2026-08-24T22:00:00.000Z",
    confidence: 0.6,
    provenance: {
      eventId: "evt-e-002",
    },
  });

  registry.upsert({
    key: "project.chernobog.phase",
    value: "11G",
    observedAt:
      "2026-08-24T22:20:00.000Z",
    confidence: 1,
  });

  const query =
    new ChernobogWorldStateQueryService(
      registry,
      () => fixedNow,
    );

  const exact =
    query.read({
      key: "service.ollama.health",
    });

  assert.equal(exact.count, 1);
  assert.equal(
    exact.items[0]?.record.value,
    "healthy",
  );
  assert.equal(
    exact.items[0]?.assessment
      .provenanceStatus,
    "complete",
  );
  pass(
    "exact key queries return the fact with evidence assessment",
  );

  assert.throws(() =>
    query.read({
      key: "service.ollama.health",
      namespace: "service",
    }),
  );
  pass(
    "exact key lookup cannot be mixed with broad filters",
  );

  const filtered =
    query.read({
      namespace: "service",
      minConfidence: 0.8,
    });

  assert.deepEqual(
    filtered.items.map(
      (item) => item.record.key,
    ),
    ["service.ollama.health"],
  );
  pass(
    "read-only queries filter by namespace and confidence",
  );

  const prefix =
    query.read({
      keyPrefix: "service.",
    });

  assert.deepEqual(
    prefix.items.map(
      (item) => item.record.key,
    ),
    [
      "service.backup.health",
      "service.ollama.health",
    ],
  );
  pass(
    "read-only queries support deterministic key-prefix lookup",
  );

  const explanation =
    query.explain(
      "service.ollama.health",
    );

  assert.equal(
    explanation.found,
    true,
  );
  assert.ok(
    explanation.evidence.some(
      (line) =>
        line.includes(
          "ollama-health-projector",
        ),
    ),
  );
  assert.ok(
    explanation.evidence.some(
      (line) =>
        line.includes(
          "evt-e-001",
        ),
    ),
  );
  pass(
    "fact explanations expose evidence without adding cognitive judgment",
  );

  const missingExplanation =
    query.explain(
      "service.unknown.health",
    );

  assert.equal(
    missingExplanation.found,
    false,
  );
  pass(
    "missing facts are represented explicitly rather than invented",
  );

  const diagnostics =
    query.diagnostics();

  assert.equal(
    diagnostics.totalRecords,
    3,
  );
  assert.deepEqual(
    diagnostics.namespaces,
    [
      {
        namespace: "project",
        records: 1,
      },
      {
        namespace: "service",
        records: 2,
      },
    ],
  );
  pass(
    "query diagnostics summarize namespaces deterministically",
  );

  const parsed =
    parseWorldStateReadQuery(
      new URLSearchParams(
        "namespace=service&freshness=fresh,aging&minConfidence=0.8",
      ),
    );

  assert.equal(
    parsed.namespace,
    "service",
  );
  assert.deepEqual(
    parsed.freshness,
    ["fresh", "aging"],
  );
  assert.equal(
    parsed.minConfidence,
    0.8,
  );
  pass(
    "HTTP query parameters parse into the canonical read model",
  );

  assert.throws(() =>
    parseWorldStateReadQuery(
      new URLSearchParams(
        "freshness=banana",
      ),
    ),
  );

  assert.throws(() =>
    parseWorldStateReadQuery(
      new URLSearchParams(
        "minConfidence=2",
      ),
    ),
  );

  assert.throws(() =>
    parseWorldStateReadQuery(
      new URLSearchParams(
        "key=service.ollama.health&namespace=service",
      ),
    ),
  );
  pass(
    "invalid HTTP filters are rejected before state access",
  );

  const tempRoot =
    await mkdtemp(
      path.join(
        os.tmpdir(),
        "chernobog-11g-e-",
      ),
    );

  try {
    const store =
      new JsonWorldStateSnapshotStore({
        filePath:
          path.join(
            tempRoot,
            "current.json",
          ),
      });

    const missing =
      await queryPersistedWorldState({
        store,
        now: () => fixedNow,
      });

    assert.equal(
      missing.status,
      "missing",
    );
    pass(
      "snapshot-backed query explicitly reports missing persisted state",
    );

    await store.save(
      buildWorldStateSnapshot(
        registry.snapshot(),
        new Date(
          "2026-08-24T22:29:55.000Z",
        ),
      ),
    );

    const persisted =
      await queryPersistedWorldState({
        query: {
          namespace: "service",
          minConfidence: 0.8,
        },
        store,
        now: () => fixedNow,
      });

    assert.equal(
      persisted.status,
      "loaded",
    );

    if (
      persisted.status !== "loaded"
    ) {
      throw new Error(
        "Expected persisted World State.",
      );
    }

    assert.equal(
      persisted.result.source,
      "snapshot",
    );
    assert.equal(
      persisted.result.count,
      1,
    );
    assert.equal(
      persisted.result.items[0]
        ?.record.key,
      "service.ollama.health",
    );
    assert.equal(
      persisted.diagnostics
        .totalRecords,
      3,
    );
    pass(
      "persisted World State can be queried without mutating the snapshot",
    );

    const secondLoad =
      await store.load();

    assert.equal(
      secondLoad.status,
      "loaded",
    );

    if (
      secondLoad.status !== "loaded"
    ) {
      throw new Error(
        "Expected snapshot after read.",
      );
    }

    assert.equal(
      secondLoad.snapshot
        .recordCount,
      3,
    );
    pass(
      "query path is read-only and leaves persisted state unchanged",
    );
  } finally {
    await rm(
      tempRoot,
      {
        recursive: true,
        force: true,
      },
    );
  }

  console.log(
    "===========================================",
  );
  console.log(
    "PASS Phase 11G-E State Query Layer acceptance",
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
