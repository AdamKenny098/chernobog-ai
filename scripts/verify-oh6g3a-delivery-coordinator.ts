import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { ReminderStore } from "../packages/personal-assistance/src/reminders/store";
import { ReminderDeliveryOutbox } from "../packages/personal-assistance/src/reminders/deliveryOutbox";
import {
  ReminderDeliveryCoordinator,
  type ReminderTransport,
} from "../packages/personal-assistance/src/reminders/deliveryCoordinator";
import { assessReminderIntegrationHealth } from "../packages/personal-assistance/src/reminders/integrationHealth";
import type {
  ReminderDeliveryAttention,
  ReminderDeliveryPolicy,
} from "../packages/personal-assistance/src/reminders/deliveryGate";

/** All tests use a private in-memory SQLite database and an injectable mock. */
async function verify(): Promise<void> {
  const db = new Database(":memory:");
  try {
    const reminders = new ReminderStore(db);
    const outbox = new ReminderDeliveryOutbox(db);
    const coordinator = new ReminderDeliveryCoordinator(reminders, outbox);
    let now = new Date("2026-11-14T09:00:00Z");
    let attention: ReminderDeliveryAttention = { state: "available" };
    let preferences: ReminderDeliveryPolicy = {
      proactiveAssistanceEnabled: false,
      interruptionPreference: "critical-only",
    };
    let calls = 0;
    const displayedIds = new Set<string>();
    let failNext = false;
    const payloads: string[] = [];
    const transport: ReminderTransport = {
      idempotency: "stable-reminder-id",
      async send(notification) {
        calls++;
        payloads.push(notification.idempotencyKey);
        assert.equal(notification.idempotencyKey, notification.reminderId);
        if (failNext) {
          failNext = false;
          throw new Error("Simulated network outage");
        }
        displayedIds.add(notification.idempotencyKey);
        // Repeat sends with the same key still produce one display/receipt.
        return { receipt: `android-mock:${notification.idempotencyKey}` };
      },
    };
    const context = {
      readAttention: () => attention,
      readPreferences: () => preferences,
      now: () => now,
    };
    function create(key: string, priority: "normal" | "important" | "critical" = "critical", dueAt = "2026-11-14T08:00:00Z") {
      return reminders.create({ key, title: `Synthetic ${key}`, dueAt, priority }, now).reminder;
    }
    const critical = create("g3:critical");

    // The owner's current settings must never emit or even reserve anything.
    assert.equal((await coordinator.dispatchOne(critical.id, context, transport)).disposition,
      "not-eligible");
    assert.equal(calls, 0);
    assert.equal(outbox.list().length, 0);
    preferences = { proactiveAssistanceEnabled: true, interruptionPreference: "critical-only" };
    for (const state of ["do-not-disturb", "busy", "away"] as const) {
      attention = { state };
      assert.equal((await coordinator.dispatchOne(critical.id, context, transport)).disposition,
        "not-eligible");
      assert.equal(calls, 0);
    }
    attention = { state: "available" };
    const upcoming = create("g3:upcoming", "critical", "2026-11-14T12:00:00Z");
    assert.equal((await coordinator.dispatchOne(upcoming.id, context, transport)).disposition,
      "not-eligible");
    const below = create("g3:below-threshold", "normal");
    assert.equal((await coordinator.dispatchOne(below.id, context, transport)).disposition,
      "not-eligible");
    assert.equal(calls, 0);
    console.log("PASS proactive-disabled, absolute DND/busy/away, not-due and threshold never send");

    // Reservation was allowed but DND activated before the second authority read.
    let authorityReads = 0;
    const dndAfterReservation = {
      ...context,
      readAttention() {
        authorityReads++;
        return { state: authorityReads === 1 ? "available" : "do-not-disturb" } as ReminderDeliveryAttention;
      },
    };
    const stopped = await coordinator.dispatchOne(critical.id, dndAfterReservation, transport);
    assert.equal(stopped.disposition, "deferred-after-recheck");
    assert.equal(stopped.gate.reasonCodes[0], "attention-do-not-disturb");
    assert.equal(calls, 0);
    assert.equal(outbox.list()[0].state, "reserved");
    // Active reservation prevents another simultaneous attempt.
    assert.equal((await coordinator.dispatchOne(critical.id, context, transport)).disposition,
      "already-reserved");
    assert.equal(calls, 0);
    console.log("PASS fresh authority recheck stops a claimed reminder after DND changes");

    now = new Date("2026-11-14T09:03:00Z"); // G2 lease lasts two minutes.
    assert.equal((await coordinator.dispatchOne(critical.id, context, transport)).disposition,
      "delivered");
    assert.equal(calls, 1);
    assert.equal(displayedIds.size, 1);
    assert.equal(outbox.list().find((r) => r.reminderId === critical.id)?.state, "delivered");
    assert.equal((await coordinator.dispatchOne(critical.id, context, transport)).disposition,
      "already-delivered");
    assert.equal(calls, 1);
    console.log("PASS lease recovery, receipt acknowledgement and delivered-item suppression");

    // Network failure: lease persists without falsely recording success.
    const retry = create("g3:retry");
    failNext = true;
    assert.equal((await coordinator.dispatchOne(retry.id, context, transport)).disposition,
      "transport-failed");
    assert.equal(outbox.list().find((r) => r.reminderId === retry.id)?.state, "reserved");
    assert.equal((await coordinator.dispatchOne(retry.id, context, transport)).disposition,
      "already-reserved");
    now = new Date("2026-11-14T09:06:00Z");
    assert.equal((await coordinator.dispatchOne(retry.id, context, transport)).disposition,
      "delivered");
    assert.equal(outbox.list().find((r) => r.reminderId === retry.id)?.attempts, 2);
    assert.deepEqual(payloads.slice(-2), [retry.id, retry.id]);
    assert.equal(displayedIds.size, 2);
    console.log("PASS mock outage retries use stable reminder ID; no fake delivery receipts");

    const cancelled = create("g3:cancel");
    const cancelledContext = {
      ...context,
      readPreferences() {
        reminders.cancel(cancelled.id, now);
        return preferences;
      },
    };
    // The cancellation in the first read makes reservation impossible.
    assert.equal((await coordinator.dispatchOne(cancelled.id, cancelledContext, transport)).disposition,
      "not-eligible");
    const cancelledAfterReserve = create("g3:cancel-after-reserve");
    let reads = 0;
    const cancelAfterReservation = {
      ...context,
      readPreferences() {
        reads++;
        if (reads === 2) reminders.cancel(cancelledAfterReserve.id, now);
        return preferences;
      },
    };
    assert.equal((await coordinator.dispatchOne(cancelledAfterReserve.id, cancelAfterReservation, transport)).disposition,
      "deferred-after-recheck");
    assert.equal(displayedIds.size, 2);
    console.log("PASS cancellation before and after claim blocks mock transport");

    assert.rejects(async () => coordinator.dispatchOne(critical.id, context, {
      idempotency: "not-stable" as "stable-reminder-id", async send() { return { receipt: "bad" }; },
    }), /stable-idempotent/u);
    assert.equal(calls, 3);
    console.log("PASS transports without stable-ID deduplication are rejected");

    const snapshotBefore = JSON.stringify(outbox.list());
    const report = assessReminderIntegrationHealth(reminders.list(), outbox.list(), attention,
      preferences, now, 1);
    assert.equal(report.totalMatching, 4); // 2 delivered + upcoming + below threshold
    assert.equal(report.returned, 1);
    assert.equal(report.completeCoverage, false);
    assert.equal(report.transport.automaticDeliveryEnabled, false);
    assert.equal(report.transport.androidReceiverInstalled, false);
    assert.equal(report.boundaries.sendsMessages, false);
    assert.equal(report.boundaries.overridesDoNotDisturb, false);
    assert.equal(JSON.stringify(outbox.list()), snapshotBefore);
    assert.equal(report.unresolvedReservations, 0);
    assert.throws(() => assessReminderIntegrationHealth(reminders.list(), outbox.list(),
      attention, preferences, now, 0), /limit/u);
    console.log("PASS integration health remains read-only, bounded, private and transport-disabled");
  } finally {
    db.close();
  }
  console.log("OH-6G3A DELIVERY COORDINATOR: PASS");
}

verify().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
