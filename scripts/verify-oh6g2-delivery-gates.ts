import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { ReminderStore } from "../packages/personal-assistance/src/reminders/store";
import { assessReminderDeliveryGate } from "../packages/personal-assistance/src/reminders/deliveryGate";
import { ReminderDeliveryOutbox } from "../packages/personal-assistance/src/reminders/deliveryOutbox";
import { assessReminderDeliveryHealth } from "../packages/personal-assistance/src/reminders/deliveryHealth";

// Isolated in-memory test: never imports the live PA persistence singleton.
const db = new Database(":memory:");
const at = new Date("2026-11-13T09:00:00Z");
const later = new Date("2026-11-13T09:01:00Z");
const afterLease = new Date("2026-11-13T09:04:00Z");
const disabled = { proactiveAssistanceEnabled: false, interruptionPreference: "critical-only" as const };
const enabled = { proactiveAssistanceEnabled: true, interruptionPreference: "critical-only" as const };
const available = { state: "available" as const };
const dnd = { state: "do-not-disturb" as const };

try {
  const reminders = new ReminderStore(db);
  const outbox = new ReminderDeliveryOutbox(db);
  const critical = reminders.create({
    key: "test:critical", title: "Critical due", dueAt: "2026-11-13T08:00:00Z",
    priority: "critical",
  }, at).reminder;
  const normal = reminders.create({
    key: "test:normal", title: "Normal due", dueAt: "2026-11-13T08:01:00Z",
    priority: "normal",
  }, at).reminder;
  const upcoming = reminders.create({
    key: "test:future", title: "Later", dueAt: "2026-11-13T11:00:00Z",
    priority: "critical",
  }, at).reminder;

  assert.equal(assessReminderDeliveryGate(critical, available, disabled, at).decision, "blocked");
  assert.equal(assessReminderDeliveryGate(upcoming, available, enabled, at).decision, "not-due");
  assert.equal(assessReminderDeliveryGate(normal, available, enabled, at).decision, "blocked");
  assert.equal(assessReminderDeliveryGate(critical, available, enabled, at).decision, "eligible");
  for (const state of ["do-not-disturb", "busy", "away"] as const) {
    const denied = assessReminderDeliveryGate(critical, { state }, enabled, at);
    assert.equal(denied.decision, "deferred");
    assert.notEqual(denied.decision, "eligible");
  }
  assert.equal(assessReminderDeliveryGate(critical, dnd, enabled, at).reasonCodes[0],
    "attention-do-not-disturb");
  assert.throws(() => assessReminderDeliveryGate(critical, available,
    { proactiveAssistanceEnabled: true, interruptionPreference: "invalid" as "all" }, at));
  console.log("PASS absolute DND/busy/away deferral, disabled proactive, due time and priority threshold");

  // No privilege to bypass policy at reservation time.
  assert.equal(outbox.reserve(critical.id, dnd, enabled, at).disposition, "not-eligible");
  assert.equal(outbox.reserve(critical.id, available, disabled, at).disposition, "not-eligible");
  assert.equal(outbox.reserve(upcoming.id, available, enabled, at).disposition, "not-eligible");
  assert.equal(outbox.list().length, 0);
  const first = outbox.reserve(critical.id, available, enabled, at);
  assert.equal(first.disposition, "reserved");
  assert.ok(first.reservation);
  const firstId = first.reservation.reservationId;
  const repeated = outbox.reserve(critical.id, available, enabled, later);
  assert.equal(repeated.disposition, "already-reserved");
  assert.equal(repeated.reservation?.reservationId, firstId);
  assert.equal(outbox.list().length, 1);
  assert.equal(outbox.revalidate(critical.id, firstId, dnd, enabled, later).decision, "deferred");
  assert.equal(outbox.revalidate(critical.id, firstId, available, disabled, later).decision, "blocked");
  assert.equal(outbox.revalidate(critical.id, firstId, available, enabled, later).decision, "eligible");
  console.log("PASS atomic one-active-lease reservation; policy rechecked before any future transport");

  // Expiry permits retry with a new reservation token; stale token is rejected.
  const second = outbox.reserve(critical.id, available, enabled, afterLease);
  assert.equal(second.disposition, "reserved");
  assert.equal(second.reservation?.attempts, 2);
  assert.notEqual(second.reservation?.reservationId, firstId);
  assert.equal(outbox.revalidate(critical.id, firstId, available, enabled, afterLease).decision, "blocked");
  assert.throws(() => outbox.acknowledgeTransportSuccess(critical.id, firstId,
    "test-receipt-old", afterLease), /Stale/u);
  const delivered = outbox.acknowledgeTransportSuccess(
    critical.id, second.reservation!.reservationId, "synthetic-receipt-1", afterLease,
  );
  assert.equal(delivered.state, "delivered");
  assert.equal(outbox.acknowledgeTransportSuccess(critical.id,
    second.reservation!.reservationId, "synthetic-receipt-1", afterLease).state, "delivered");
  assert.throws(() => outbox.acknowledgeTransportSuccess(critical.id,
    second.reservation!.reservationId, "different-receipt", afterLease), /Conflicting/u);
  assert.equal(outbox.reserve(critical.id, available, enabled, afterLease).disposition,
    "already-delivered");
  assert.equal(outbox.list().length, 1);
  console.log("PASS expired lease retry, stale token rejection, receipt replay and delivered suppression");

  // Cancellation must invalidate a reservation prior to send.
  const normalAtAll = { proactiveAssistanceEnabled: true, interruptionPreference: "all" as const };
  const normalReservation = outbox.reserve(normal.id, available, normalAtAll, at);
  assert.equal(normalReservation.disposition, "reserved");
  reminders.cancel(normal.id, later);
  assert.equal(outbox.revalidate(normal.id,
    normalReservation.reservation!.reservationId, available, normalAtAll, later).decision, "blocked");
  assert.equal(outbox.reserve(normal.id, available, normalAtAll, later).disposition, "not-eligible");
  console.log("PASS cancelled reminder cannot be re-reserved or cleared for transport");

  // GET read model cannot reserve, send or mutate; totals are untruncated.
  const before = JSON.stringify(outbox.list());
  const report = assessReminderDeliveryHealth(reminders.list(), outbox.list(), available, disabled, at, 1);
  assert.equal(report.totalMatching, 2); // cancelled normal excluded
  assert.equal(report.returned, 1);
  assert.equal(report.completeCoverage, false);
  assert.equal(report.gateCounts.blocked, 1);
  assert.equal(report.gateCounts["not-due"], 1);
  assert.equal(report.outboxCounts.delivered, 1);
  assert.equal(report.boundaries.readOnly, true);
  assert.equal(report.boundaries.sendsMessages, false);
  assert.equal(report.boundaries.reservesDeliveries, false);
  assert.equal(report.boundaries.overridesDoNotDisturb, false);
  assert.equal(report.boundaries.exposesReminderTitles, false);
  assert.equal(JSON.stringify(outbox.list()), before);
  assert.equal(JSON.stringify(report), JSON.stringify(assessReminderDeliveryHealth(
    reminders.list(), outbox.list(), available, disabled, at, 1,
  )));
  assert.throws(() => assessReminderDeliveryHealth(reminders.list(), outbox.list(), available,
    enabled, at, 0));
  console.log("PASS read-only bounded health, complete counts and private metadata boundaries");
} finally {
  db.close();
}
console.log("OH-6G2 DELIVERY GATES & OUTBOX: PASS");
