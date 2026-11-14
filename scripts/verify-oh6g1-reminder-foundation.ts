import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { ReminderStore } from "../packages/personal-assistance/src/reminders/store";
import {
  normalizeReminderInput,
  previewReminders,
  type ReminderCreateInput,
} from "../packages/personal-assistance/src/reminders/foundation";

const at = new Date("2026-11-13T09:00:00.000Z");
const oneMinuteAgo = "2026-11-13T08:59:00.000Z";
const future = "2026-11-13T10:00:00.000Z";
const base: ReminderCreateInput = {
  key: "manual:test-001", title: "Review scheduled reminder", dueAt: oneMinuteAgo,
  priority: "critical",
};

assert.equal(normalizeReminderInput({ ...base, dueAt: "2026-11-13T09:59:00+01:00" }).dueAt,
  "2026-11-13T08:59:00.000Z");
for (const bad of [
  { ...base, key: "bad key" },
  { ...base, title: " " },
  { ...base, dueAt: "2026-11-13T09:00:00" },
  { ...base, dueAt: "not-a-date" },
  { ...base, priority: "emergency" as "critical" },
]) {
  assert.throws(() => normalizeReminderInput(bad));
}
console.log("PASS explicit-offset dueAt normalization and bounded input validation");

// In-memory SQLite: never reads/writes owner's production data or runtime state.
const db = new Database(":memory:");
try {
  const ledger = new ReminderStore(db);
  const first = ledger.create(base, at);
  assert.equal(first.disposition, "created");
  const repeat = ledger.create(base, new Date("2026-11-13T09:01:00Z"));
  assert.equal(repeat.disposition, "replayed");
  assert.deepEqual(repeat.reminder, first.reminder);
  assert.equal(ledger.list().length, 1);
  assert.throws(() => ledger.create({ ...base, title: "Different payload" }, at), /different reminder/u);
  assert.equal(ledger.list().length, 1);
  // Repeat the same request from a separate store object bound to the same database.
  assert.equal(new ReminderStore(db).create(base, at).disposition, "replayed");
  assert.equal(ledger.list().length, 1);
  console.log("PASS transactional persistent idempotency, key conflict rejection and duplicate prevention");

  const later = ledger.create({
    key: "manual:future", title: "One hour later", dueAt: future, priority: "normal",
  }, at);
  const before = JSON.stringify(ledger.list());
  const policy = { proactiveAssistanceEnabled: false, interruptionPreference: "critical-only" as const };
  const disabled = previewReminders(ledger.list(), { state: "available" }, policy, at);
  assert.equal(disabled.totalMatching, 2);
  assert.equal(disabled.counts.overdue, 1);
  assert.equal(disabled.counts.upcoming, 1);
  assert.equal(disabled.counts.candidate, 0);
  assert.equal(disabled.counts.queueOnly, 2);
  assert.equal(disabled.items[0].dueState, "overdue");
  assert.equal(disabled.items[0].reasonCodes[0], "proactive-assistance-disabled");
  assert.equal(JSON.stringify(ledger.list()), before);
  assert.deepEqual(disabled, previewReminders(ledger.list(), { state: "available" }, policy, at));
  console.log("PASS deterministic, read-only due-time preview with default disabled-proactive posture");

  const enabled = { proactiveAssistanceEnabled: true, interruptionPreference: "critical-only" as const };
  const available = previewReminders(ledger.list(), { state: "available" }, enabled, at);
  assert.equal(available.counts.candidate, 1);
  assert.equal(available.items[0].decision, "candidate");
  for (const state of ["do-not-disturb", "busy", "away"] as const) {
    const blocked = previewReminders(ledger.list(), { state }, enabled, at);
    assert.equal(blocked.counts.candidate, 0);
    assert.equal(blocked.counts.deferred, 1);
    assert.equal(blocked.items[0].decision, "deferred");
  }
  const limited = previewReminders(ledger.list(), { state: "available" }, enabled, at, 1);
  assert.equal(limited.returned, 1);
  assert.equal(limited.totalMatching, 2);
  assert.equal(limited.completeCoverage, false);
  assert.equal(limited.counts.upcoming, 1);
  assert.equal(limited.boundaries.sendsMessages, false);
  assert.equal(limited.boundaries.reservesDeliveries, false);
  assert.equal(limited.boundaries.marksDelivered, false);
  assert.equal(limited.boundaries.overridesDoNotDisturb, false);
  console.log("PASS explicit DND absolute, thresholds, bounded coverage and no delivery authority");

  const cancelled = ledger.cancel(later.reminder.id, new Date("2026-11-13T09:02:00Z"));
  assert.equal(cancelled.state, "cancelled");
  const replayCancellation = ledger.cancel(later.reminder.id, new Date("2026-11-13T09:03:00Z"));
  assert.equal(replayCancellation.cancelledAt, cancelled.cancelledAt);
  const afterCancel = previewReminders(ledger.list(), { state: "available" }, enabled, at);
  assert.equal(afterCancel.totalMatching, 1);
  assert.equal(ledger.create({ key: "manual:future", title: "One hour later", dueAt: future,
    priority: "normal" }).reminder.state, "cancelled");
  console.log("PASS cancellation idempotency; cancelled keys cannot silently re-activate");
} finally {
  db.close();
}
console.log("OH-6G1 REMINDER SCHEDULING FOUNDATION: PASS");
