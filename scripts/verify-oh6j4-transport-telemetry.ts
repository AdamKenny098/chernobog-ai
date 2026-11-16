import assert from "node:assert/strict";
import { assessReminderIntegrationHealth } from "../packages/personal-assistance/src/reminders/integrationHealth";
import type { ReminderDeliveryRow } from "../packages/personal-assistance/src/reminders/deliveryOutbox";
import type { ReminderDeliveryAttention } from "../packages/personal-assistance/src/reminders/deliveryGate";
import type { ReminderRecord } from "../packages/personal-assistance/src/reminders/foundation";

const now = new Date("2026-11-15T20:00:00.000Z");
const attention = { state: "available" as const };
const optOut = {
  proactiveAssistanceEnabled: false,
  interruptionPreference: "critical-only" as const,
};
const optIn = { ...optOut, proactiveAssistanceEnabled: true };
const id = `rem_${"a".repeat(36)}`;
const reservationId = `reserve_${"b".repeat(36)}`;
const delivered: ReminderDeliveryRow = {
  reminderId: id,
  reservationId,
  state: "delivered",
  attempts: 1,
  reservedAt: "2026-11-15T19:00:00.000Z",
  leaseExpiresAt: "2026-11-15T19:02:00.000Z",
  deliveredAt: "2026-11-15T19:01:00.000Z",
  receipt: `android:${id}`,
};
const reminderList: ReminderRecord[] = [];
const snapshot = (outbox: ReminderDeliveryRow[], permission = optOut,
  evidence = { pairedAndroidDeviceCount: 1, androidReminderRoutesAvailable: true },
  state: ReminderDeliveryAttention = attention) => assessReminderIntegrationHealth(
  reminderList, outbox, state, permission, now, 25, evidence,
);
const initialOutbox: ReminderDeliveryRow[] = [delivered, { ...delivered, reminderId: `rem_${"c".repeat(36)}`,
  receipt: "other-transport:receipt" }];
const before = JSON.stringify(initialOutbox);
const report = snapshot(initialOutbox);
assert.equal(report.status, "android-delivery-observed");
assert.equal(report.transport.pairedAndroidDeviceCount, 1);
assert.equal(report.transport.androidReminderRoutesAvailable, true);
assert.equal(report.transport.acknowledgedAndroidDeliveries, 1);
assert.equal(report.transport.remotelyDispatched, true);
assert.equal(report.transport.androidReceiverInstalled, null);
assert.equal(report.transport.androidOnlineNowVerified, false);
assert.equal(report.transport.androidReceiverInstallationVerified, false);
assert.equal(report.transport.automaticDeliveryEnabled, false);
assert.equal(report.transport.deliveryPolicyPermitsAttempt, false);
assert.equal(JSON.stringify(initialOutbox), before);
console.log("PASS real Android receipt recognized, mock receipts excluded, privacy and opt-out respected");

const ready = snapshot([], optIn);
assert.equal(ready.status, "android-device-paired");
assert.equal(ready.transport.automaticDeliveryEnabled, true);
assert.equal(ready.transport.remotelyDispatched, false);
assert.equal(ready.transport.androidReceiverInstalled, null);
console.log("PASS paired device with opt-in is only server-eligible, not OS-installation-verified");

const dnd = snapshot([], optIn,
  { pairedAndroidDeviceCount: 1, androidReminderRoutesAvailable: true },
  { state: "do-not-disturb" as const });
assert.equal(dnd.transport.automaticDeliveryEnabled, false);
assert.equal(dnd.transport.deliveryPolicyPermitsAttempt, false);
console.log("PASS absolute DND still blocks delivery eligibility");

const offlineRoutes = snapshot([], optIn,
  { pairedAndroidDeviceCount: 1, androidReminderRoutesAvailable: false });
assert.equal(offlineRoutes.transport.automaticDeliveryEnabled, false);
assert.equal(offlineRoutes.transport.androidReminderRoutesAvailable, false);
console.log("PASS server route availability independently reported");

const none = snapshot([], optIn,
  { pairedAndroidDeviceCount: 0, androidReminderRoutesAvailable: true });
assert.equal(none.status, "awaiting-android-device");
assert.equal(none.transport.androidReceiverInstalled, false);
assert.equal(none.transport.automaticDeliveryEnabled, false);
assert.equal(none.transport.pairedAndroidDeviceCount, 0);
console.log("PASS unpaired devices and automatic delivery not invented");

const history = snapshot([delivered], optOut,
  { pairedAndroidDeviceCount: 0, androidReminderRoutesAvailable: true });
assert.equal(history.status, "android-history-only");
assert.equal(history.transport.acknowledgedAndroidDeliveries, 1);
console.log("PASS old receipts remain historical after device revocation");

const legacy = assessReminderIntegrationHealth([], [], attention, optOut, now, 25);
assert.equal(legacy.transport.androidReceiverInstalled, false);
assert.equal(legacy.transport.automaticDeliveryEnabled, false);
console.log("PASS original G3A call signature is backward compatible");

for (const pairedAndroidDeviceCount of [-1, 0.5, Number.NaN]) {
  assert.throws(() => snapshot([], optIn,
    { pairedAndroidDeviceCount, androidReminderRoutesAvailable: true }),
    /Invalid Android transport evidence/u);
}
assert.equal(report.boundaries.readOnly, true);
assert.equal(report.boundaries.sendsMessages, false);
assert.equal(report.boundaries.overridesDoNotDisturb, false);
assert.equal(report.boundaries.changesUserPreferences, false);
console.log("PASS strict evidence validation and all read-only boundaries");
console.log("OH-6J4 ANDROID TRANSPORT TELEMETRY: PASS");
