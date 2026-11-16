import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { ReminderStore } from "../packages/personal-assistance/src/reminders/store";
import { AndroidReminderDeliveryService } from "../packages/personal-assistance/src/reminders/androidDelivery";

const db = new Database(":memory:");
const store = new ReminderStore(db);
const android = new AndroidReminderDeliveryService(db);
const NOW = new Date("2026-11-14T03:00:00.000Z");
const device = "device_owner_123456";
const otherDevice = "device_other_123456";
const available = { state: "available" } as const;
const dnd = { state: "do-not-disturb" } as const;
const busy = { state: "busy" } as const;
const permitted = { proactiveAssistanceEnabled: true, interruptionPreference: "important" } as const;
const disabled = { proactiveAssistanceEnabled: false, interruptionPreference: "all" } as const;

const reminder = store.create({
  key: "oh6g3b-test-1", title: "Private synthetic test reminder",
  dueAt: "2026-11-14T02:50:00Z", priority: "important",
}, NOW).reminder;
assert.equal(android.claim(device, available, disabled, NOW), null);
assert.equal(android.claim(device, dnd, permitted, NOW), null);
assert.equal(android.claim(device, busy, permitted, NOW), null);
console.log("PASS disabled proactive, explicit DND and busy block Android claims");

const claim = android.claim(device, available, permitted, NOW);
assert.ok(claim);
assert.equal(claim?.reminderId, reminder.id);
assert.equal(android.claim(otherDevice, available, permitted, NOW), null);
assert.equal(android.authorize(otherDevice, claim!.reminderId, claim!.reservationId, available, permitted, NOW), false);
assert.equal(android.authorize(device, claim!.reminderId, claim!.reservationId, dnd, permitted, NOW), false);
assert.equal(android.authorize(device, claim!.reminderId, claim!.reservationId, available, disabled, NOW), false);
assert.equal(android.authorize(device, claim!.reminderId, claim!.reservationId, available, permitted, NOW), true);
console.log("PASS atomic single-device claim, fresh remote DND and credential-bound authorize");

assert.throws(() => android.acknowledge(otherDevice, claim!.reminderId, claim!.reservationId,
  `android:${reminder.id}`, NOW));
const ack = android.acknowledge(device, claim!.reminderId, claim!.reservationId,
  `android:${reminder.id}`, NOW);
assert.equal(ack.state, "delivered");
assert.equal(android.acknowledge(device, claim!.reminderId, claim!.reservationId,
  `android:${reminder.id}`, NOW).state, "delivered");
assert.equal(android.claim(device, available, permitted, new Date(NOW.getTime() + 180000)), null);
console.log("PASS valid phone-only receipt, idempotent acknowledgement, delivered suppression");

const cancelled = store.create({
  key: "oh6g3b-cancelled", title: "Cancelled test",
  dueAt: "2026-11-14T02:00:00Z", priority: "critical",
}, NOW).reminder;
store.cancel(cancelled.id, NOW);
assert.equal(android.claim(device, available, permitted, NOW), null);
const upcoming = store.create({
  key: "oh6g3b-upcoming", title: "Upcoming test",
  dueAt: "2026-11-14T08:00:00Z", priority: "critical",
}, NOW).reminder;
assert.equal(android.claim(device, available, permitted, NOW), null);
store.cancel(upcoming.id, NOW);
console.log("PASS cancelled and future reminders never enter Android delivery");

const another = store.create({
  key: "oh6g3b-after-cancel", title: "Cancellation race test",
  dueAt: "2026-11-14T02:00:00Z", priority: "critical",
}, NOW).reminder;
const outstanding = android.claim(device, available, permitted, NOW);
assert.equal(outstanding?.reminderId, another.id);
store.cancel(another.id, NOW);
assert.equal(android.authorize(device, outstanding!.reminderId, outstanding!.reservationId,
  available, permitted, NOW), false);
console.log("PASS cancellation after claim prevents notification authorization");

const retryDb = new Database(":memory:");
const retryStore = new ReminderStore(retryDb);
const retryService = new AndroidReminderDeliveryService(retryDb);
const retryReminder = retryStore.create({
  key: "oh6g3b-retry", title: "Retry test",
  dueAt: "2026-11-14T02:00:00Z", priority: "critical",
}, NOW).reminder;
const firstLease = retryService.claim(device, available, {
  proactiveAssistanceEnabled: true, interruptionPreference: "critical-only",
}, NOW);
assert.equal(firstLease?.reminderId, retryReminder.id);
assert.equal(retryService.claim(otherDevice, available, permitted, NOW), null);
const later = new Date(NOW.getTime() + 150000);
const replacement = retryService.claim(otherDevice, available, permitted, later);
assert.equal(replacement?.reminderId, retryReminder.id);
assert.notEqual(replacement?.reservationId, firstLease?.reservationId);
assert.equal(retryService.authorize(device, firstLease!.reminderId, firstLease!.reservationId,
  available, permitted, later), false);
assert.equal(retryService.authorize(otherDevice, replacement!.reminderId, replacement!.reservationId,
  available, permitted, later), true);
retryDb.close();
console.log("PASS lease expiry permits recovery and invalidates stale device claims");

const appDir = path.join(process.cwd(), "mobile/android-companion/app/src/main/java/ai/chernobog/companion");
const worker = readFileSync(path.join(appDir, "ReminderDeliveryWorker.kt"), "utf8");
const presenter = readFileSync(path.join(appDir, "ReminderNotificationPresenter.kt"), "utf8");
const client = readFileSync(path.join(appDir, "ReminderDeliveryClient.kt"), "utf8");
assert.match(worker, /client\.authorize\(/);
assert.match(worker, /ReminderNotificationPresenter\.canPresent\(applicationContext\)/);
assert.match(worker, /if \(!ReminderNotificationPresenter\.present\(/);
assert.ok(worker.indexOf("client.authorize(") < worker.indexOf("client.acknowledge("));
assert.match(presenter, /INTERRUPTION_FILTER_ALL/);
assert.match(presenter, /POST_NOTIFICATIONS/);
assert.match(presenter, /setOnlyAlertOnce\(true\)/);
assert.match(client, /EndpointPolicy\.apiUrl\(/);
assert.match(client, /Authorization/);
assert.match(client, /HttpsURLConnection/);
console.log("PASS Android HTTPS/auth, local DND, notification permission, stable tag and post-then-ack ordering");

db.close();
console.log("OH-6G3B ANDROID REMINDER DELIVERY FOUNDATION: PASS");
