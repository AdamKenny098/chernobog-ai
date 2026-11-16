import type Database from "better-sqlite3";
import { ReminderStore } from "./store";
import { ReminderDeliveryOutbox } from "./deliveryOutbox";
import { AndroidReminderDeliveryService } from "./androidDelivery";

type ChangeKind = "snooze" | "reschedule";
export type ReminderAdjustmentInput = {
  actionId: string;
  reminderId: string;
  expectedDueAt: string;
  kind: ChangeKind;
  minutes?: number;
  dueAt?: string;
};

export type ReminderAdjustment = {
  actionId: string;
  reminderId: string;
  kind: ChangeKind;
  previousDueAt: string;
  dueAt: string;
  changedAt: string;
};

export type ReminderAdjustmentResult = {
  disposition: "applied" | "replayed";
  adjustment: ReminderAdjustment;
};

export class ReminderAdjustmentError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "ReminderAdjustmentError";
  }
}

const MAX_SNOOZE_MINUTES = 30 * 24 * 60;
const MAX_RESCHEDULE_MS = 365 * 24 * 60 * 60_000;
const INSTANT = /^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?(?:Z|[+-]\d\d:\d\d)$/u;
const REMINDER_ID = /^rem_[0-9a-f-]{36}$/u;
const ACTION_ID = /^[A-Za-z0-9][A-Za-z0-9:_./-]{0,119}$/u;

function reject(code: string, message: string): never {
  throw new ReminderAdjustmentError(code, message);
}

function instant(value: unknown, field: string): string {
  if (typeof value !== "string" || !INSTANT.test(value)) {
    return reject("invalid_input", `${field} must contain an ISO-8601 offset or Z.`);
  }
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return reject("invalid_input", `${field} is not a valid instant.`);
  return new Date(time).toISOString();
}

type ValidInput = {
  actionId: string;
  reminderId: string;
  expectedDueAt: string;
  kind: ChangeKind;
  minutes: number | null;
  dueAt: string | null;
};

/** Strict validation: the action is explicit, not inferred from a recommendation. */
export function validateReminderAdjustment(value: unknown): ValidInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return reject("invalid_input", "Expected an adjustment object.");
  }
  const input = value as Record<string, unknown>;
  const allowed = new Set(["actionId", "reminderId", "expectedDueAt", "kind", "minutes", "dueAt"]);
  if (Object.keys(input).some((key) => !allowed.has(key))) {
    return reject("invalid_input", "Unexpected adjustment field.");
  }
  if (typeof input.actionId !== "string" || !ACTION_ID.test(input.actionId)) {
    return reject("invalid_input", "A stable, nonsecret actionId is required.");
  }
  if (typeof input.reminderId !== "string" || !REMINDER_ID.test(input.reminderId)) {
    return reject("invalid_input", "Invalid reminder ID.");
  }
  const expectedDueAt = instant(input.expectedDueAt, "expectedDueAt");
  if (input.kind === "snooze") {
    if (!Number.isInteger(input.minutes) || typeof input.minutes !== "number" ||
        input.minutes < 1 || input.minutes > MAX_SNOOZE_MINUTES || input.dueAt !== undefined) {
      return reject("invalid_input", "Snooze requires 1-43200 whole minutes and no dueAt.");
    }
    return {
      actionId: input.actionId, reminderId: input.reminderId, expectedDueAt,
      kind: "snooze", minutes: input.minutes, dueAt: null,
    };
  }
  if (input.kind === "reschedule") {
    if (input.minutes !== undefined) {
      return reject("invalid_input", "Reschedule requires dueAt and no minutes.");
    }
    return {
      actionId: input.actionId, reminderId: input.reminderId, expectedDueAt,
      kind: "reschedule", minutes: null, dueAt: instant(input.dueAt, "dueAt"),
    };
  }
  return reject("invalid_input", "kind must be snooze or reschedule.");
}

type ReminderSql = { id: string; due_at: string; state: string };
type DeliverySql = { state: string; lease_expires_at: string };
type AdjustmentSql = {
  action_id: string;
  reminder_id: string;
  kind: ChangeKind;
  request_json: string;
  previous_due_at: string;
  due_at: string;
  changed_at: string;
};

function fromSql(row: AdjustmentSql): ReminderAdjustment {
  return {
    actionId: row.action_id, reminderId: row.reminder_id, kind: row.kind,
    previousDueAt: row.previous_due_at, dueAt: row.due_at, changedAt: row.changed_at,
  };
}

/** One owner-initiated edit per actionId, with an immutable SQLite audit. */
export class ReminderAdjustmentService {
  constructor(private readonly db: Database.Database) {
    // Ensure accepted source tables exist; do not introduce a second delivery queue.
    new ReminderStore(db);
    new ReminderDeliveryOutbox(db);
    new AndroidReminderDeliveryService(db);
    db.exec(`
      CREATE TABLE IF NOT EXISTS personal_assistance_reminder_adjustment_v1 (
        action_id TEXT PRIMARY KEY,
        reminder_id TEXT NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('snooze','reschedule')),
        request_json TEXT NOT NULL,
        previous_due_at TEXT NOT NULL,
        due_at TEXT NOT NULL,
        changed_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_pa_reminder_adjustment_history
      ON personal_assistance_reminder_adjustment_v1 (reminder_id, changed_at DESC, action_id DESC);
    `);
  }

  adjust(input: unknown, now = new Date()): ReminderAdjustmentResult {
    const request = validateReminderAdjustment(input);
    if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
      return reject("invalid_input", "Invalid adjustment timestamp.");
    }
    const fingerprint = JSON.stringify(request);
    return this.db.transaction((): ReminderAdjustmentResult => {
      const replay = this.db.prepare(`
        SELECT * FROM personal_assistance_reminder_adjustment_v1 WHERE action_id = ?
      `).get(request.actionId) as AdjustmentSql | undefined;
      if (replay) {
        if (replay.request_json !== fingerprint) {
          return reject("idempotency_conflict", "Action ID is already assigned to another request.");
        }
        return { disposition: "replayed", adjustment: fromSql(replay) };
      }

      const reminder = this.db.prepare(`
        SELECT id, due_at, state FROM personal_assistance_reminder_v1 WHERE id = ?
      `).get(request.reminderId) as ReminderSql | undefined;
      if (!reminder) return reject("not_found", "Reminder not found.");
      if (reminder.state !== "scheduled") return reject("cancelled", "Cancelled reminders cannot be adjusted.");
      if (reminder.due_at !== request.expectedDueAt) {
        return reject("stale_due_at", "Reminder was already changed; refresh it before adjusting.");
      }

      // Stable reminder-ID remote deduplication makes a second notification for
      // an already delivered reminder unsafe. Never silently re-arm it.
      const delivery = this.db.prepare(`
        SELECT state, lease_expires_at FROM personal_assistance_reminder_delivery_v1 WHERE reminder_id = ?
      `).get(reminder.id) as DeliverySql | undefined;
      if (delivery?.state === "delivered") {
        return reject("already_delivered", "Delivered reminders need a distinct follow-up reminder ID.");
      }
      if (delivery?.state === "reserved") {
        const leaseEnd = Date.parse(delivery.lease_expires_at);
        if (!Number.isFinite(leaseEnd)) return reject("corrupt_delivery", "Invalid delivery lease state.");
        if (leaseEnd > now.getTime()) {
          return reject("active_lease", "Reminder delivery is in progress; retry after the lease expires.");
        }
      } else if (delivery) {
        return reject("corrupt_delivery", "Invalid delivery state.");
      }

      const newMs = request.kind === "snooze"
        ? Math.max(now.getTime(), Date.parse(reminder.due_at)) + request.minutes! * 60_000
        : Date.parse(request.dueAt!);
      if (!Number.isFinite(newMs) || newMs <= now.getTime() ||
          newMs > now.getTime() + MAX_RESCHEDULE_MS) {
        return reject("invalid_due_at", "Target must be in the future, within 365 days.");
      }
      const next = new Date(newMs).toISOString();
      if (next === reminder.due_at) return reject("unchanged", "Reminder due time is already the target.");

      // Revoke an EXPIRED lease and its device binding atomically with the
      // edit. A late stale ACK must not suppress the rescheduled reminder.
      if (delivery?.state === "reserved") {
        this.db.prepare(`
          DELETE FROM personal_assistance_android_reminder_claim_v1 WHERE reminder_id = ?
        `).run(reminder.id);
        this.db.prepare(`
          DELETE FROM personal_assistance_reminder_delivery_v1
          WHERE reminder_id = ? AND state = 'reserved'
        `).run(reminder.id);
      }
      const changed = this.db.prepare(`
        UPDATE personal_assistance_reminder_v1 SET due_at = ?
        WHERE id = ? AND state = 'scheduled' AND due_at = ?
      `).run(next, reminder.id, request.expectedDueAt);
      if (changed.changes !== 1) return reject("stale_due_at", "Concurrent reminder change detected.");
      const changedAt = now.toISOString();
      this.db.prepare(`
        INSERT INTO personal_assistance_reminder_adjustment_v1
          (action_id, reminder_id, kind, request_json, previous_due_at, due_at, changed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(request.actionId, reminder.id, request.kind, fingerprint,
        reminder.due_at, next, changedAt);
      return {
        disposition: "applied",
        adjustment: {
          actionId: request.actionId, reminderId: reminder.id,
          kind: request.kind, previousDueAt: reminder.due_at,
          dueAt: next, changedAt,
        },
      };
    }).immediate();
  }

  history(reminderId: string, limit = 50): ReminderAdjustment[] {
    if (!REMINDER_ID.test(reminderId) || !Number.isInteger(limit) || limit < 1 || limit > 100) {
      return reject("invalid_input", "Invalid reminder ID or history limit.");
    }
    const rows = this.db.prepare(`
      SELECT * FROM personal_assistance_reminder_adjustment_v1
      WHERE reminder_id = ? ORDER BY changed_at DESC, action_id DESC LIMIT ?
    `).all(reminderId, limit) as AdjustmentSql[];
    return rows.map(fromSql);
  }
}

/** Lazy runtime import; in-memory verifier never touches owner data. */
export async function liveReminderAdjustmentService(): Promise<ReminderAdjustmentService> {
  const { personalAssistanceDb } = await import("../persistence");
  return new ReminderAdjustmentService(personalAssistanceDb);
}
