import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  ResponsibilityLedger,
} from "../packages/personal-assistance/src/responsibilities/store";
import {
  assessResponsibility,
  buildResponsibilityIntelligenceSnapshot,
} from "../packages/personal-assistance/src/responsibilityIntelligence/readModel";
import {
  assessResponsibilityLifecycle,
} from "../packages/personal-assistance/src/responsibilityIntelligence/lifecycle";
import {
  buildResponsibilityIntegrationHealth,
} from "../packages/personal-assistance/src/responsibilityIntelligence/integrationHealth";
import type {
  Responsibility,
} from "../packages/personal-assistance/src/responsibilities/types";

const NOW = new Date("2026-11-08T12:00:00.000Z");

async function main(): Promise<void> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "chernobog-oh6d3-"));
  try {
    const ledger = new ResponsibilityLedger(directory);
    const created = await ledger.create({
      title: "Synthetic reply",
      summary: "No live message or user data.",
      source: { type: "notification", sourceId: "oh6d3-source-1", application: "WhatsApp" },
      state: "waiting-user",
      priority: "important",
      requiresHuman: true,
      dueAt: "2026-11-07T12:00:00.000Z",
      mergeKey: "notification-thread:oh6d3-fixture",
      actor: "oh6d3-fixture",
    });
    const id = created.responsibility.id;
    const merged = await ledger.create({
      title: "Synthetic second message",
      summary: "Separate source for the same thread.",
      source: { type: "notification", sourceId: "oh6d3-source-2", application: "WhatsApp" },
      mergeKey: "notification-thread:oh6d3-fixture",
      actor: "oh6d3-fixture",
    });
    assert.equal(merged.disposition, "merged");
    assert.equal(merged.responsibility.id, id);
    const replay = await ledger.create({
      title: "Synthetic source replay",
      summary: "Must not create a second task.",
      source: { type: "notification", sourceId: "oh6d3-source-1" },
    });
    assert.equal(replay.disposition, "source-replayed");
    assert.equal(replay.responsibility.id, id);
    assert.equal((await ledger.list({ includeClosed: true })).length, 1);
    const initially = await ledger.get(id);
    assert.ok(initially);
    assert.equal(assessResponsibility(initially, NOW).reviewBucket, "overdue");
    const initiallyLifecycle = assessResponsibilityLifecycle(
      initially, await ledger.history(id), NOW,
    );
    assert.equal(initiallyLifecycle.integrity.status, "consistent");
    assert.equal(initiallyLifecycle.audit.evidenceMerges, 1);
    assert.equal(initiallyLifecycle.audit.sourceReplays, 1);
    assert.equal(initiallyLifecycle.followUp.allowsAutomaticContact, false);
    console.log("PASS source replay, evidence merging, and non-actionable overdue review");

    await ledger.transition(id, {
      state: "waiting-external", actor: "explicit-user", reason: "Synthetic reply recorded.",
    });
    const external = await ledger.get(id);
    assert.ok(external);
    assert.equal(
      assessResponsibilityLifecycle(external, await ledger.history(id), NOW).followUp.status,
      "awaiting-external",
    );
    assert.equal(assessResponsibility(external, NOW).needsUserDecision, false);
    await ledger.transition(id, {
      state: "waiting-user", actor: "explicit-user", reason: "Synthetic inbound reply.",
    });
    await ledger.transition(id, {
      state: "resolved", actor: "explicit-user", reason: "Synthetic resolution.",
    });
    await assert.rejects(() => ledger.transition(id, {
      state: "waiting-user", actor: "test", reason: "Forbidden direct reopening.",
    }), /Invalid responsibility transition/u);
    await ledger.transition(id, {
      state: "triaged", actor: "explicit-user", reason: "Explicitly reopen synthetic case.",
    });
    await ledger.transition(id, {
      state: "resolved", actor: "explicit-user", reason: "Synthetic close after review.",
    });
    const closed = await ledger.get(id);
    assert.ok(closed);
    const closedLifecycle = assessResponsibilityLifecycle(closed, await ledger.history(id), NOW);
    assert.equal(closedLifecycle.integrity.status, "consistent");
    assert.equal(closedLifecycle.audit.reopened, 1);
    assert.equal(assessResponsibility(closed, NOW).overdue, false);
    console.log("PASS reply/external, forbidden transition, explicit reopen, final closure");

    await ledger.create({
      title: "Synthetic roster review",
      summary: "Work roster test record only.",
      source: { type: "work-schedule", sourceId: "oh6d3-roster" },
      state: "waiting-user", requiresHuman: true,
      priority: "important", dueAt: "2026-11-08T14:00:00.000Z",
    });
    await ledger.create({
      title: "Synthetic calendar appointment",
      summary: "Calendar test record only.",
      source: { type: "calendar", sourceId: "oh6d3-calendar" },
      state: "scheduled", dueAt: "2026-11-12T14:00:00.000Z",
    });

    const filePath = path.join(directory, "responsibilities.json");
    const auditPath = path.join(directory, "responsibility-events.jsonl");
    const beforeFile = await readFile(filePath, "utf8");
    const beforeAudit = await readFile(auditPath, "utf8");
    const all = await ledger.list({ includeClosed: true });
    const entries = await Promise.all(all.map(async (responsibility) => ({
      responsibility,
      history: await ledger.history(responsibility.id),
    })));
    const snapshot = buildResponsibilityIntelligenceSnapshot(all, NOW);
    assert.equal(snapshot.counts.open, 2);
    assert.equal(snapshot.counts.dueSoon, 1);
    assert.equal(snapshot.counts.needsUserDecision, 1);
    const health = buildResponsibilityIntegrationHealth(entries, NOW);
    assert.equal(health.status, "consistent");
    assert.equal(health.counts.open, 2);
    assert.equal(health.counts.closed, 1);
    assert.equal(health.counts.dueSoon, 1);
    assert.equal(health.counts.needsUserDecision, 1);
    assert.equal(health.counts.communicationThreads, 1);
    assert.equal(health.counts.inconsistent, 0);
    assert.equal(health.counts.scheduled, 1);
    assert.equal(health.coverage.truncated, false);
    assert.equal(health.boundaries.sendsMessages, false);
    assert.equal(health.boundaries.modifiesLedger, false);
    assert.equal(health.boundaries.aggregatesOnly, true);
    assert.equal(await readFile(filePath, "utf8"), beforeFile);
    assert.equal(await readFile(auditPath, "utf8"), beforeAudit);
    const serialized = JSON.stringify(health);
    for (const sensitive of [
      "oh6d3-source-1", "oh6d3-source-2", "oh6d3-fixture", "Synthetic reply", "Synthetic roster review",
    ]) {
      assert.equal(serialized.includes(sensitive), false, `Leaked ${sensitive}`);
    }
    console.log("PASS D1 + D2 + PA-3A integration, aggregate privacy, and no read-side mutation");

    const partial = buildResponsibilityIntegrationHealth(entries.slice(0, 1), NOW, all.length);
    assert.equal(partial.status, "partial");
    assert.equal(partial.coverage.truncated, true);
    assert.equal(partial.counts.open + partial.counts.closed, 1);
    assert.throws(() => buildResponsibilityIntegrationHealth(entries, NOW, 0), /totalAvailable/u);
    const corrupted: Responsibility = JSON.parse(JSON.stringify(closed)) as Responsibility;
    corrupted.evidence.push({ ...corrupted.evidence[0] });
    const healthWithError = buildResponsibilityIntegrationHealth(
      [{ responsibility: corrupted, history: await ledger.history(id) }], NOW,
    );
    assert.equal(healthWithError.status, "needs-review");
    assert.equal(healthWithError.counts.inconsistent, 1);
    assert.equal(healthWithError.findings["duplicate-evidence-source"], 1);
    console.log("PASS bounded coverage and synthetic corruption detection");

    console.log("OH-6D3 RESPONSIBILITY INTEGRATION: PASS");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
