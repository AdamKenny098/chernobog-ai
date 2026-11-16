import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import {
  assessReminderDeliveryGate,
  type ReminderDeliveryAttention,
  type ReminderDeliveryGate,
  type ReminderDeliveryPolicy,
} from "./deliveryGate";
import { ReminderStore } from "./store";
import type { ReminderRecord } from "./foundation";

export type ReminderDeliveryRow = {
  reminderId: string;
  reservationId: string;
  state: "reserved" | "delivered";
  attempts: number;
  reservedAt: string;
  leaseExpiresAt: string;
  deliveredAt: string | null;
  receipt: string | null;
};

type SqlRow = {
  reminder_id: string;
  reservation_id: string;
  state: string;
  attempts: number;
  reserved_at: string;
  lease_expires_at: string;
  delivered_at: string | null;
  receipt: string | null;
};

export type ReserveResult = {
  disposition: "reserved" | "already-reserved" | "already-delivered" | "not-eligible";
  gate: ReminderDeliveryGate;
  reservation: ReminderDeliveryRow | null;
};

const LEASE_MS = 2 * 60_000;

function rowToDelivery(row: SqlRow): ReminderDeliveryRow {
  if ((row.state !== "reserved" && row.state !== "delivered") ||
      !Number.isInteger(row.attempts) || row.attempts < 1 ||
      !Number.isFinite(Date.parse(row.reserved_at)) ||
      !Number.isFinite(Date.parse(row.lease_expires_at))) {
    throw new Error("Invalid persisted reminder delivery row.");
  }
  return {
    reminderId: row.reminder_id,
    reservationId: row.reservation_id,
    state: row.state,
    attempts: row.attempts,
    reservedAt: row.reserved_at,
    leaseExpiresAt: row.lease_expires_at,
    deliveredAt: row.delivered_at,
    receipt: row.receipt,
  };
}

/**
 * Durable delivery reservations, NOT a transport. No HTTP write API or
 * automated worker is introduced by OH-6G2. G3 must integrate the trusted
 * channel and retain end-to-end idempotency using the stable reminder ID.
 */
export class ReminderDeliveryOutbox {
  private readonly reminders: ReminderStore;

  constructor(private readonly db: Database.Database) {
    this.reminders = new ReminderStore(db);
    db.exec(`
      CREATE TABLE IF NOT EXISTS personal_assistance_reminder_delivery_v1 (
        reminder_id TEXT PRIMARY KEY,
        reservation_id TEXT NOT NULL UNIQUE,
        state TEXT NOT NULL CHECK (state IN ('reserved', 'delivered')),
        attempts INTEGER NOT NULL CHECK (attempts >= 1),
        reserved_at TEXT NOT NULL,
        lease_expires_at TEXT NOT NULL,
        delivered_at TEXT,
        receipt TEXT
      );
    `);
  }

  list(): ReminderDeliveryRow[] {
    const rows = this.db.prepare(`
      SELECT * FROM personal_assistance_reminder_delivery_v1
      ORDER BY reserved_at ASC, reminder_id ASC
    `).all() as SqlRow[];
    return rows.map(rowToDelivery);
  }

  private find(reminderId: string): ReminderDeliveryRow | null {
    const row = this.db.prepare(`
      SELECT * FROM personal_assistance_reminder_delivery_v1 WHERE reminder_id = ?
    `).get(reminderId) as SqlRow | undefined;
    return row ? rowToDelivery(row) : null;
  }

  private currentReminder(reminderId: string): ReminderRecord {
    const reminder = this.reminders.list().find((r) => r.id === reminderId);
    if (!reminder) throw new Error("Unknown reminder ID.");
    return reminder;
  }

  /** Atomic reservation. Repeat attempts cannot create parallel active claims. */
  reserve(
    reminderId: string,
    attention: ReminderDeliveryAttention,
    preferences: ReminderDeliveryPolicy,
    now = new Date(),
  ): ReserveResult {
    if (!/^rem_[0-9a-f-]{36}$/u.test(reminderId) || !Number.isFinite(now.getTime())) {
      throw new Error("Invalid delivery reservation request.");
    }
    return this.db.transaction(() => {
      const reminder = this.currentReminder(reminderId);
      const gate = assessReminderDeliveryGate(reminder, attention, preferences, now);
      if (gate.decision !== "eligible") {
        return { disposition: "not-eligible", gate, reservation: null } as const;
      }
      const existing = this.find(reminderId);
      if (existing?.state === "delivered") {
        return { disposition: "already-delivered", gate, reservation: existing } as const;
      }
      if (existing && Date.parse(existing.leaseExpiresAt) > now.getTime()) {
        return { disposition: "already-reserved", gate, reservation: existing } as const;
      }
      const reservation: ReminderDeliveryRow = {
        reminderId,
        reservationId: `reserve_${randomUUID()}`,
        state: "reserved",
        attempts: (existing?.attempts ?? 0) + 1,
        reservedAt: now.toISOString(),
        leaseExpiresAt: new Date(now.getTime() + LEASE_MS).toISOString(),
        deliveredAt: null,
        receipt: null,
      };
      this.db.prepare(`
        INSERT INTO personal_assistance_reminder_delivery_v1
          (reminder_id, reservation_id, state, attempts, reserved_at,
           lease_expires_at, delivered_at, receipt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(reminder_id) DO UPDATE SET
          reservation_id = excluded.reservation_id,
          state = excluded.state,
          attempts = excluded.attempts,
          reserved_at = excluded.reserved_at,
          lease_expires_at = excluded.lease_expires_at,
          delivered_at = excluded.delivered_at,
          receipt = excluded.receipt
      `).run(
        reservation.reminderId, reservation.reservationId,
        reservation.state, reservation.attempts, reservation.reservedAt,
        reservation.leaseExpiresAt, null, null,
      );
      return { disposition: "reserved", gate, reservation } as const;
    }).immediate();
  }

  /**
   * The future transport MUST call this with a freshly read attention/profile
   * immediately before sending. A reservation never bypasses DND.
   */
  revalidate(
    reminderId: string,
    reservationId: string,
    attention: ReminderDeliveryAttention,
    preferences: ReminderDeliveryPolicy,
    now = new Date(),
  ): ReminderDeliveryGate {
    if (!Number.isFinite(now.getTime())) throw new Error("Invalid revalidation time.");
    const reservation = this.find(reminderId);
    if (!reservation || reservation.reservationId !== reservationId ||
        reservation.state !== "reserved" ||
        Date.parse(reservation.leaseExpiresAt) <= now.getTime()) {
      return { reminderId, decision: "blocked", reasonCodes: ["reservation-invalid-or-expired"] };
    }
    const reminder = this.currentReminder(reminderId);
    return assessReminderDeliveryGate(reminder, attention, preferences, now);
  }

  /**
   * Record a genuine transport success. No G2 route or CLI can call this.
   * G3 must only call AFTER an idempotent transport confirms delivery.
   * Do not re-check DND on acknowledgement: send may have preceded DND change.
   */
  acknowledgeTransportSuccess(
    reminderId: string,
    reservationId: string,
    receipt: string,
    now = new Date(),
  ): ReminderDeliveryRow {
    if (!/^[A-Za-z0-9][A-Za-z0-9:_./-]{0,159}$/u.test(receipt) ||
        !Number.isFinite(now.getTime())) {
      throw new Error("A valid transport receipt is required.");
    }
    return this.db.transaction(() => {
      const current = this.find(reminderId);
      if (!current || current.reservationId !== reservationId) {
        throw new Error("Stale or unknown delivery reservation.");
      }
      if (current.state === "delivered") {
        if (current.receipt !== receipt) throw new Error("Conflicting transport receipt.");
        return current;
      }
      this.db.prepare(`
        UPDATE personal_assistance_reminder_delivery_v1
        SET state = 'delivered', delivered_at = ?, receipt = ?
        WHERE reminder_id = ? AND reservation_id = ? AND state = 'reserved'
      `).run(now.toISOString(), receipt, reminderId, reservationId);
      const updated = this.find(reminderId);
      if (!updated || updated.state !== "delivered") {
        throw new Error("Transport receipt persistence failed.");
      }
      return updated;
    }).immediate();
  }
}

export async function liveReminderDeliveryOutbox(): Promise<ReminderDeliveryOutbox> {
  const { personalAssistanceDb } = await import("../persistence");
  return new ReminderDeliveryOutbox(personalAssistanceDb);
}
