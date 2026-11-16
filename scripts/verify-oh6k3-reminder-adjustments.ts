import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { ReminderStore } from "../packages/personal-assistance/src/reminders/store";
import { ReminderDeliveryOutbox } from "../packages/personal-assistance/src/reminders/deliveryOutbox";
import { AndroidReminderDeliveryService } from "../packages/personal-assistance/src/reminders/androidDelivery";
import {
  ReminderAdjustmentService,
  validateReminderAdjustment,
} from "../packages/personal-assistance/src/reminders/adjustments";

const NOW = new Date("2026-11-16T00:30:00.000Z");
const available = { state: "available" } as const;
const permitted = { proactiveAssistanceEnabled: true, interruptionPreference: "all" } as const;
const device = "owner_device_123456";
const db = new Database(":memory:");
try {
  const store = new ReminderStore(db);
  const edits = new ReminderAdjustmentService(db);
  const reminder = store.create({
    key: "k3:snooze", title: "Private test title: never echo",
    dueAt: "2026-11-15T23:00:00Z", priority: "normal",
  }, NOW).reminder;
  const input = {
    actionId: "k3-action-one", reminderId: reminder.id,
    expectedDueAt: reminder.dueAt, kind: "snooze", minutes: 30,
  } as const;
  const snapshot = JSON.stringify(input);
  const first = edits.adjust(input, NOW);
  assert.equal(first.disposition, "applied");
  assert.equal(first.adjustment.dueAt, "2026-11-16T01:00:00.000Z");
  assert.equal(first.adjustment.reminderId, reminder.id);
  assert.equal(store.list()[0].id, reminder.id);
  assert.equal(store.list()[0].key, reminder.key);
  assert.equal(store.list()[0].title, reminder.title);
  assert.equal(JSON.stringify(input), snapshot);
  assert.deepEqual(edits.adjust(input, new Date(NOW.getTime() + 120000)), {
    disposition: "replayed", adjustment: first.adjustment,
  });
  assert.equal(edits.history(reminder.id).length, 1);
  console.log("PASS owner snooze preserves identity, fields and a single auditable action");

  const stale = { actionId: "k3-stale", reminderId: reminder.id,
    expectedDueAt: reminder.dueAt, kind: "snooze", minutes: 5 } as const;
  assert.throws(() => edits.adjust(stale, NOW), { code: "stale_due_at" });
  assert.throws(() => edits.adjust({ ...input, minutes: 31 }, NOW),
    { code: "idempotency_conflict" });
  assert.equal(edits.history(reminder.id).length, 1);
  console.log("PASS stale-owner revision conflict and idempotent replay protection");

  const later = edits.adjust({
    actionId: "k3-action-two", reminderId: reminder.id,
    expectedDueAt: first.adjustment.dueAt, kind: "reschedule",
    dueAt: "2026-11-16T04:00:00+01:00",
  }, NOW);
  assert.equal(later.adjustment.dueAt, "2026-11-16T03:00:00.000Z");
  assert.equal(edits.history(reminder.id).length, 2);
  assert.equal(store.list()[0].id, reminder.id);
  console.log("PASS timezone-aware absolute reschedule and immutable chronological audit");

  const bad = { actionId: "k3-bad", reminderId: reminder.id,
    expectedDueAt: later.adjustment.dueAt, kind: "reschedule",
    dueAt: "2026-11-16T09:00:00" };
  assert.throws(() => validateReminderAdjustment(bad), { code: "invalid_input" });
  assert.throws(() => validateReminderAdjustment({ ...input, minutes: 0 }),
    { code: "invalid_input" });
  assert.throws(() => validateReminderAdjustment({ ...input, dueAt: "2026-11-16T02:00:00Z" }),
    { code: "invalid_input" });
  assert.throws(() => edits.adjust({ ...bad, dueAt: "2020-01-01T00:00:00Z" }, NOW),
    { code: "invalid_due_at" });
  assert.throws(() => edits.history(reminder.id, 101), { code: "invalid_input" });
  assert.throws(() => edits.adjust({ ...input, actionId: "not-an-id", reminderId: "bad" }, NOW),
    { code: "invalid_input" });
  console.log("PASS strict input, bounded horizons, offset requirements and history limits");

  const cancelled = store.create({ key: "k3-cancel", title: "Cancelled",
    dueAt: "2026-11-16T01:00:00Z" }, NOW).reminder;
  store.cancel(cancelled.id, NOW);
  assert.throws(() => edits.adjust({ actionId: "k3-cancel-adjust", reminderId: cancelled.id,
    expectedDueAt: cancelled.dueAt, kind: "snooze", minutes: 5 }, NOW),
  { code: "cancelled" });
  assert.throws(() => edits.adjust({ actionId: "k3-missing",
    reminderId: "rem_00000000-0000-0000-0000-000000000000",
    expectedDueAt: cancelled.dueAt, kind: "snooze", minutes: 5 }, NOW),
  { code: "not_found" });
  console.log("PASS cancelled and nonexistent reminders cannot be modified");

  // Separate DB isolates the active lease/Android authority scenario.
  const second = new Database(":memory:");
  try {
    const reminders = new ReminderStore(second);
    const editor = new ReminderAdjustmentService(second);
    const android = new AndroidReminderDeliveryService(second);
    const outbox = new ReminderDeliveryOutbox(second);
    const pending = reminders.create({ key: "k3-pending", title: "Pending",
      dueAt: "2026-11-16T00:00:00Z", priority: "important" }, NOW).reminder;
    const claim = android.claim(device, available, permitted, NOW);
    assert.equal(claim?.reminderId, pending.id);
    const adjustInput = { actionId: "k3-pending-adjust", reminderId: pending.id,
      expectedDueAt: pending.dueAt, kind: "snooze", minutes: 20 } as const;
    assert.throws(() => editor.adjust(adjustInput, NOW), { code: "active_lease" });
    assert.equal(outbox.list().find((r) => r.reminderId === pending.id)?.state, "reserved");
    assert.equal(android.authorize(device, pending.id, claim!.reservationId,
      available, permitted, NOW), true);
    const pastLease = new Date(NOW.getTime() + 180_000);
    const moved = editor.adjust(adjustInput, pastLease);
    assert.equal(moved.disposition, "applied");
    assert.equal(moved.adjustment.dueAt, "2026-11-16T00:53:00.000Z");
    assert.equal(android.authorize(device, pending.id, claim!.reservationId,
      available, permitted, pastLease), false);
    assert.throws(() => android.acknowledge(device, pending.id, claim!.reservationId,
      `android:${pending.id}`, pastLease));
    assert.equal(outbox.list().length, 0);
    assert.equal(android.claim(device, available, permitted, pastLease), null);
    console.log("PASS live lease blocks adjustment; expired lease invalidates claim and stale ACK");

    const delivered = reminders.create({ key: "k3-delivered", title: "Delivered",
      dueAt: "2026-11-16T00:01:00Z", priority: "important" }, NOW).reminder;
    const activeClaim = android.claim(device, available, permitted, pastLease);
    assert.equal(activeClaim?.reminderId, delivered.id);
    android.acknowledge(device, delivered.id, activeClaim!.reservationId,
      `android:${delivered.id}`, pastLease);
    assert.throws(() => editor.adjust({
      actionId: "k3-delivered-adjust", reminderId: delivered.id,
      expectedDueAt: delivered.dueAt, kind: "reschedule",
      dueAt: "2026-11-16T07:00:00Z",
    }, pastLease), { code: "already_delivered" });
    assert.equal(reminders.list().find((r) => r.id === delivered.id)?.dueAt, delivered.dueAt);
    assert.equal(outbox.list().find((r) => r.reminderId === delivered.id)?.state, "delivered");
    console.log("PASS delivered reminders cannot silently re-arm stable-ID Android transport");
  } finally {
    second.close();
  }

  const route = readFileSync(path.join(process.cwd(),
    "app/api/personal-assistance/reminders/adjust/route.ts"), "utf8");
  assert.match(route, /export async function POST\(/u);
  assert.match(route, /export async function GET\(/u);
  assert.match(route, /cross_origin_rejected/u);
  assert.match(route, /Cache-Control.*no-store/u);
  assert.doesNotMatch(route, /enableProactive|setPersonalAttention|dispatchOne\(/u);
  assert.doesNotMatch(JSON.stringify(edits.history(reminder.id)), /Private test title/u);
  assert.equal(edits.history(reminder.id)[0].kind, "reschedule");
  console.log("PASS guarded explicit-action API and read-only, privacy-minimized audit");
} finally {
  db.close();
}
console.log("OH-6K3 REMINDER SNOOZE/RESCHEDULE: PASS");
