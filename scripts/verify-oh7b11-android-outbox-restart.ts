/**
 * OH-7B11: verify accepted Android reminder outbox survives an SQLite restart.
 * This is an isolated persistence test; no production credentials or phone calls.
 */
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { ReminderStore } from "../packages/personal-assistance/src/reminders/store";
import { AndroidReminderDeliveryService } from "../packages/personal-assistance/src/reminders/androidDelivery";

const fixture = mkdtempSync(path.join(tmpdir(), "chernobog-oh7b11-"));
const dbPath = path.join(fixture, "personal-assistance.sqlite");
const now = new Date("2026-11-22T12:00:00Z");
const deviceId = "oh7b11_device_001";
const otherDeviceId = "oh7b11_device_002";
const available = { state: "available" } as const;
const dnd = { state: "do-not-disturb" } as const;
const permitted = {
  proactiveAssistanceEnabled: true,
  interruptionPreference: "important",
} as const;
let db: Database.Database | undefined;

try {
  db = new Database(dbPath);
  const store = new ReminderStore(db);
  const android = new AndroidReminderDeliveryService(db);
  const reminder = store.create({
    key: "oh7b11-persisted-reminder",
    title: "Synthetic OH7B11 delivery test",
    dueAt: new Date(now.getTime() - 60_000).toISOString(),
    priority: "important",
  }, now).reminder;

  assert.equal(android.claim(deviceId, dnd, permitted, now), null);
  const claim = android.claim(deviceId, available, permitted, now);
  assert.ok(claim);
  assert.equal(claim.reminderId, reminder.id);
  assert.equal(android.authorize(otherDeviceId, claim.reminderId, claim.reservationId, available, permitted, now), false);
  console.log("PASS initial DND gate and authenticated-device reservation");

  db.close();
  db = undefined;
  db = new Database(dbPath);
  const restarted = new AndroidReminderDeliveryService(db);
  assert.equal(restarted.authorize(deviceId, claim.reminderId, claim.reservationId, dnd, permitted, now), false);
  assert.equal(restarted.authorize(otherDeviceId, claim.reminderId, claim.reservationId, available, permitted, now), false);
  assert.equal(restarted.authorize(deviceId, claim.reminderId, claim.reservationId, available, permitted, now), true);
  console.log("PASS reservation survived SQLite restart with fresh DND/device revalidation");

  const result = restarted.acknowledge(
    deviceId, claim.reminderId, claim.reservationId, `android:${reminder.id}`, now,
  );
  assert.equal(result.state, "delivered");
  db.close();
  db = undefined;

  db = new Database(dbPath);
  const afterAckRestart = new AndroidReminderDeliveryService(db);
  assert.equal(afterAckRestart.claim(deviceId, available, permitted, new Date(now.getTime() + 60_000)), null);
  console.log("PASS delivered receipt survives second restart and suppresses duplicates");

  console.log("OH-7B11 ANDROID OUTBOX RESTART ACCEPTANCE: PASS (isolated SQLite)");
} finally {
  db?.close();
  rmSync(fixture, { recursive: true, force: true });
}
