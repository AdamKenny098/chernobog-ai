import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  ResponsibilityLedger,
} from "../packages/personal-assistance/src/responsibilities/store";
import {
  assessResponsibilityLifecycle,
} from "../packages/personal-assistance/src/responsibilityIntelligence/lifecycle";
import type {
  Responsibility,
  ResponsibilityAuditEntry,
} from "../packages/personal-assistance/src/responsibilities/types";

const NOW = new Date("2026-11-08T12:00:00.000Z");
const SAMPLE_ID = "resp_12345678";

async function main() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "chernobog-oh6d2-"));
  try {
    const ledger = new ResponsibilityLedger(directory);
    const created = await ledger.create({
      title: "Reply about Thursday",
      summary: "Synthetic test case only.",
      source: { type: "notification", sourceId: "synthetic-first", application: "WhatsApp" },
      state: "waiting-user",
      priority: "important",
      requiresHuman: true,
      dueAt: "2026-11-07T12:00:00.000Z",
      mergeKey: "notification-thread:synthetic-conversation",
      actor: "oh6d2-test",
      reason: "Synthetic test case, never live data.",
    });
    const id = created.responsibility.id;
    const merged = await ledger.create({
      title: "Reply about Thursday",
      summary: "Synthetic follow-up.",
      source: { type: "notification", sourceId: "synthetic-second", application: "WhatsApp" },
      mergeKey: "notification-thread:synthetic-conversation",
      actor: "oh6d2-test",
    });
    assert.equal(merged.disposition, "merged");
    const replayed = await ledger.create({
      title: "Repeat first notification",
      summary: "The original event was replayed.",
      source: { type: "notification", sourceId: "synthetic-first" },
    });
    assert.equal(replayed.disposition, "source-replayed");

    const before = await ledger.get(id);
    assert.ok(before);
    const file = path.join(directory, "responsibilities.json");
    const journal = path.join(directory, "responsibility-events.jsonl");
    const beforeFile = await readFile(file, "utf8");
    const beforeJournal = await readFile(journal, "utf8");
    const snapshot = assessResponsibilityLifecycle(before, await ledger.history(id), NOW);
    assert.equal(snapshot.integrity.status, "consistent");
    assert.equal(snapshot.evidence.total, 2);
    assert.equal(snapshot.evidence.duplicateSources, 0);
    assert.equal(snapshot.audit.totalEvents, 3);
    assert.equal(snapshot.audit.evidenceMerges, 1);
    assert.equal(snapshot.audit.sourceReplays, 1);
    assert.equal(snapshot.followUp.communicationThread, true);
    assert.equal(snapshot.followUp.status, "awaiting-user");
    assert.equal(snapshot.followUp.overdue, true);
    assert.equal(snapshot.followUp.allowsAutomaticContact, false);
    assert.equal(await readFile(file, "utf8"), beforeFile);
    assert.equal(await readFile(journal, "utf8"), beforeJournal);
    assert.equal(JSON.stringify(snapshot).includes("synthetic-first"), false);
    assert.equal(JSON.stringify(snapshot).includes("oh6d2-test"), false);
    console.log("PASS evidence merge, replay, follow-up and read-only privacy");

    await ledger.transition(id, {
      state: "waiting-external", actor: "explicit-user", reason: "User replied.",
    });
    await ledger.transition(id, {
      state: "resolved", actor: "explicit-user", reason: "Thread closed.",
    });
    await ledger.transition(id, {
      state: "triaged", actor: "explicit-user", reason: "User reopened.",
    });
    const reopened = await ledger.get(id);
    assert.ok(reopened);
    const after = assessResponsibilityLifecycle(reopened, await ledger.history(id), NOW);
    assert.equal(after.integrity.status, "consistent");
    assert.equal(after.followUp.status, "unassigned");
    assert.equal(after.audit.reopened, 1);
    assert.equal(after.audit.stateChanges, 2);
    console.log("PASS legal lifecycle, closure, and explicit reopening");

    const corruptedEvidence: Responsibility = {
      ...reopened,
      id: SAMPLE_ID,
      revision: 1,
      state: "resolved",
      evidence: [reopened.evidence[0], reopened.evidence[0]],
    };
    const history: ResponsibilityAuditEntry[] = [{
      id: "evt-one", responsibilityId: SAMPLE_ID,
      event: "created", actor: "fixture", reason: "fixture",
      timestamp: NOW.toISOString(), toState: "waiting-user",
    }];
    const inconsistent = assessResponsibilityLifecycle(corruptedEvidence, history, NOW);
    assert.equal(inconsistent.integrity.status, "needs-review");
    assert.ok(inconsistent.integrity.findings.includes("duplicate-evidence-source"));
    assert.ok(inconsistent.integrity.findings.includes("last-recorded-state-mismatch"));
    assert.equal(inconsistent.followUp.status, "closed");
    assert.equal(inconsistent.followUp.overdue, false);
    assert.throws(() => assessResponsibilityLifecycle(corruptedEvidence, [], new Date("bad")));
    console.log("PASS audit and evidence discrepancies surfaced without mutation");

    console.log("OH-6D2 LIFECYCLE RECONCILIATION: PASS");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
