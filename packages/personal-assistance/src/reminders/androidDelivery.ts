import type Database from "better-sqlite3";
import { ReminderStore } from "./store";
import { ReminderDeliveryOutbox } from "./deliveryOutbox";
import type { ReminderDeliveryAttention, ReminderDeliveryPolicy } from "./deliveryGate";

export type AndroidReminderClaim = {
  reminderId: string;
  reservationId: string;
  dueAt: string;
  title: string;
  priority: "low" | "normal" | "important" | "critical";
  leaseExpiresAt: string;
};

type Ownership = {
  reminder_id: string;
  reservation_id: string;
  device_id: string;
};

/**
 * Paired Android device pull channel. All authorities are supplied fresh by the
 * authenticated route; this class never modifies the owner's attention/profile.
 * Reserves the EXISTING OH-6G2 outbox, not a second delivery queue.
 */
export class AndroidReminderDeliveryService {
  private readonly reminders: ReminderStore;
  private readonly outbox: ReminderDeliveryOutbox;

  constructor(private readonly db: Database.Database) {
    this.reminders = new ReminderStore(db);
    this.outbox = new ReminderDeliveryOutbox(db);
    db.exec(`
      CREATE TABLE IF NOT EXISTS personal_assistance_android_reminder_claim_v1 (
        reminder_id TEXT PRIMARY KEY,
        reservation_id TEXT NOT NULL UNIQUE,
        device_id TEXT NOT NULL,
        claimed_at TEXT NOT NULL
      );
    `);
  }

  claim(
    deviceId: string,
    attention: ReminderDeliveryAttention,
    preferences: ReminderDeliveryPolicy,
    now = new Date(),
  ): AndroidReminderClaim | null {
    this.assertDevice(deviceId);
    this.assertTime(now);
    // Fast fail before inspecting user content; G2 performs authoritative checks.
    if (attention.state !== "available" || !preferences.proactiveAssistanceEnabled) {
      return null;
    }
    // G2 reserve() owns the SQLite IMMEDIATE transaction. The following
    // synchronous ownership binding cannot interleave on this event loop;
    // a process crash between the two leaves a short, expiring lease.
    for (const reminder of this.reminders.list()) {
        if (reminder.state !== "scheduled" || Date.parse(reminder.dueAt) > now.getTime()) {
          continue;
        }
        const result = this.outbox.reserve(reminder.id, attention, preferences, now);
        if (result.disposition !== "reserved" || !result.reservation) continue;
        this.db.prepare(`
          INSERT INTO personal_assistance_android_reminder_claim_v1
            (reminder_id, reservation_id, device_id, claimed_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(reminder_id) DO UPDATE SET
            reservation_id=excluded.reservation_id,
            device_id=excluded.device_id,
            claimed_at=excluded.claimed_at
        `).run(reminder.id, result.reservation.reservationId, deviceId, now.toISOString());
        return {
          reminderId: reminder.id,
          reservationId: result.reservation.reservationId,
          dueAt: reminder.dueAt,
          title: reminder.title,
          priority: reminder.priority,
          leaseExpiresAt: result.reservation.leaseExpiresAt,
        };
    }
    return null;
  }

  authorize(
    deviceId: string,
    reminderId: string,
    reservationId: string,
    attention: ReminderDeliveryAttention,
    preferences: ReminderDeliveryPolicy,
    now = new Date(),
  ): boolean {
    this.assertDevice(deviceId);
    this.assertTime(now);
    if (!this.ownsClaim(deviceId, reminderId, reservationId)) return false;
    return this.outbox.revalidate(
      reminderId, reservationId, attention, preferences, now,
    ).decision === "eligible";
  }

  acknowledge(
    deviceId: string,
    reminderId: string,
    reservationId: string,
    receipt: string,
    now = new Date(),
  ): { reminderId: string; state: "delivered" } {
    this.assertDevice(deviceId);
    this.assertTime(now);
    if (!this.ownsClaim(deviceId, reminderId, reservationId)) {
      throw new Error("No device-bound reminder reservation exists.");
    }
    // Acknowledgement is AFTER the phone posted. Do not reject a genuine
    // receipt if DND was enabled after the notification was displayed.
    const result = this.outbox.acknowledgeTransportSuccess(
      reminderId, reservationId, receipt, now,
    );
    return { reminderId: result.reminderId, state: "delivered" };
  }

  private ownsClaim(deviceId: string, reminderId: string, reservationId: string): boolean {
    if (!/^rem_[0-9a-f-]{36}$/u.test(reminderId) ||
        !/^reserve_[0-9a-f-]{36}$/u.test(reservationId)) return false;
    const row = this.db.prepare(`
      SELECT reminder_id, reservation_id, device_id
      FROM personal_assistance_android_reminder_claim_v1 WHERE reminder_id = ?
    `).get(reminderId) as Ownership | undefined;
    return row?.device_id === deviceId && row.reservation_id === reservationId;
  }

  private assertDevice(deviceId: string): void {
    if (typeof deviceId !== "string" || !/^[A-Za-z0-9_-]{8,128}$/u.test(deviceId)) {
      throw new Error("Authenticated Android device ID is invalid.");
    }
  }
  private assertTime(now: Date): void {
    if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
      throw new Error("Invalid delivery timestamp.");
    }
  }
}

/** Lazy connection; isolated verifiers never touch the owner's live data. */
export async function liveAndroidReminderDeliveryService(): Promise<AndroidReminderDeliveryService> {
  const { personalAssistanceDb } = await import("../persistence");
  return new AndroidReminderDeliveryService(personalAssistanceDb);
}
