import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  ResponsibilityLedger,
} from "../packages/personal-assistance/src/responsibilities/store";
import {
  assessResponsibility,
  buildResponsibilityIntelligenceSnapshot,
} from "../packages/personal-assistance/src/responsibilityIntelligence/readModel";
import type { Responsibility } from "../packages/personal-assistance/src/responsibilities/types";

const NOW = new Date("2026-11-08T12:00:00.000Z");

function fixture(id: string, changes: Partial<Responsibility> = {}): Responsibility {
  return {
    id, title: `Responsibility ${id}`, summary: "Fixture only",
    source: { type: "manual", sourceId: id },
    state: "detected", priority: "normal", requiresHuman: false,
    createdAt: NOW.toISOString(), updatedAt: NOW.toISOString(),
    confidence: 1, relatedResponsibilityIds: [], evidence: [], revision: 1,
    ...changes,
  };
}

async function main() {
  const overdue = fixture("overdue", {
    state: "waiting-user", requiresHuman: true,
    dueAt: "2026-11-07T12:00:00.000Z",
  });
  const external = fixture("external", {
    state: "waiting-external", requiresHuman: true,
    dueAt: "2026-11-09T01:00:00.000Z",
  });
  const important = fixture("important", {
    priority: "important", confidence: 0.5,
  });
  const closed = fixture("closed", {
    state: "resolved", priority: "critical",
    dueAt: "2026-11-01T00:00:00.000Z",
  });
  const before = JSON.stringify([overdue, external, important, closed]);
  const sample = buildResponsibilityIntelligenceSnapshot(
    [overdue, external, important, closed], NOW,
  );

  assert.equal(sample.totalMatching, 3);
  assert.equal(sample.counts.open, 3);
  assert.equal(sample.counts.overdue, 1);
  assert.equal(sample.counts.dueSoon, 1);
  assert.equal(sample.counts.needsUserDecision, 1);
  assert.deepEqual(
    sample.responsibilities.map((item) => item.id),
    ["overdue", "external", "important"],
  );
  assert.equal(sample.responsibilities[0].reviewBucket, "overdue");
  assert.equal(sample.responsibilities[0].waitingOn, "user");
  assert.equal(sample.responsibilities[1].waitingOn, "external");
  assert.equal(sample.responsibilities[1].needsUserDecision, false);
  assert.ok(sample.responsibilities[2].reasonCodes.includes("limited-confidence"));
  assert.equal(JSON.stringify([overdue, external, important, closed]), before);
  console.log("PASS deterministic urgency, ownership, and no mutation");

  const withClosed = buildResponsibilityIntelligenceSnapshot(
    [overdue, external, important, closed], NOW, { includeClosed: true, limit: 2 },
  );
  assert.equal(withClosed.totalMatching, 4);
  assert.equal(withClosed.returned, 2);
  assert.equal(withClosed.counts.open, 3);
  assert.equal(withClosed.responsibilities.some((r) => r.id === "closed"), false);
  assert.equal(assessResponsibility(closed, NOW).reviewBucket, "closed");
  assert.equal(assessResponsibility(closed, NOW).overdue, false);
  assert.throws(
    () => buildResponsibilityIntelligenceSnapshot([], NOW, { limit: 0 }),
    /limit must be/,
  );
  assert.equal(withClosed.boundaries.sendsMessages, false);
  assert.equal(withClosed.boundaries.schedulesInterruptions, false);
  console.log("PASS closed-state, pagination, and trust boundaries");

  const directory = await mkdtemp(path.join(os.tmpdir(), "chernobog-oh6d1-"));
  try {
    const ledger = new ResponsibilityLedger(directory);
    const created = await ledger.create({
      title: "Review a sample appointment",
      summary: "Synthetic test responsibility",
      source: { type: "manual", sourceId: "oh6d1-test-only" },
      state: "waiting-user", requiresHuman: true,
      priority: "important", actor: "oh6d1-verifier",
    });
    const stored = await ledger.list({ includeClosed: true });
    const filePath = path.join(directory, "responsibilities.json");
    const beforeFile = await readFile(filePath, "utf8");
    const interpreted = buildResponsibilityIntelligenceSnapshot(stored, NOW);
    const afterFile = await readFile(filePath, "utf8");
    assert.equal(interpreted.responsibilities[0].id, created.responsibility.id);
    assert.equal(interpreted.responsibilities[0].reviewBucket, "high-priority");
    assert.equal(interpreted.responsibilities[0].needsUserDecision, true);
    assert.equal(beforeFile, afterFile);
    console.log("PASS isolated ledger integration; read model leaves storage unchanged");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
  console.log("OH-6D1 RESPONSIBILITY INTELLIGENCE: PASS");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
