import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import {
  normalizeReminderInput,
  type ReminderCreateInput,
  type ReminderPriority,
  type ReminderRecord,
  type ReminderState,
} from "./foundation";

type StoredReminder = {
  id: string;
  idempotency_key: string;
  title: string;
  due_at: string;
  priority: string;
  state: string;
  created_at: string;
  cancelled_at: string | null;
};

const PRIORITIES: readonly string[] = ["low", "normal", "important", "critical"];
const STATES: readonly string[] = ["scheduled", "cancelled"];

function fromRow(row: StoredReminder): ReminderRecord {
  if (!PRIORITIES.includes(row.priority) || !STATES.includes(row.state) ||
      !Number.isFinite(Date.parse(row.due_at))) {
    throw new Error("Persisted reminder state is invalid.");
  }
  return {
    id: row.id, key: row.idempotency_key, title: row.title, dueAt: row.due_at,
    priority: row.priority as ReminderPriority, state: row.state as ReminderState,
    createdAt: row.created_at, cancelledAt: row.cancelled_at,
  };
}

/**
 * Persist in the existing PA-owned SQLite database. The unique key and transaction
 * guarantee replay protection even when processes attempt the same insert.
 */
export class ReminderStore {
  constructor(private readonly db: Database.Database) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS personal_assistance_reminder_v1 (
        id TEXT PRIMARY KEY,
        idempotency_key TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        due_at TEXT NOT NULL,
        priority TEXT NOT NULL,
        state TEXT NOT NULL DEFAULT 'scheduled',
        created_at TEXT NOT NULL,
        cancelled_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_pa_reminder_v1_due
        ON personal_assistance_reminder_v1 (state, due_at, id);
    `);
  }

  list(): ReminderRecord[] {
    const rows = this.db.prepare(`
      SELECT id, idempotency_key, title, due_at, priority, state, created_at, cancelled_at
      FROM personal_assistance_reminder_v1 ORDER BY due_at ASC, id ASC
    `).all() as StoredReminder[];
    return rows.map(fromRow);
  }

  /** Same key + same payload => replay; same key + different payload => conflict. */
  create(input: ReminderCreateInput, now = new Date()): {
    reminder: ReminderRecord; disposition: "created" | "replayed";
  } {
    const normalized = normalizeReminderInput(input);
    if (!Number.isFinite(now.getTime())) throw new Error("Invalid creation time.");
    return this.db.transaction(() => {
      const current = this.db.prepare(`
        SELECT * FROM personal_assistance_reminder_v1 WHERE idempotency_key = ?
      `).get(normalized.key) as StoredReminder | undefined;
      if (current) {
        const existing = fromRow(current);
        if (existing.title !== normalized.title || existing.dueAt !== normalized.dueAt ||
            existing.priority !== normalized.priority) {
          throw new Error("Reminder key is already assigned to a different reminder.");
        }
        return { reminder: existing, disposition: "replayed" as const };
      }
      const reminder: ReminderRecord = {
        id: `rem_${randomUUID()}`,
        key: normalized.key,
        title: normalized.title,
        dueAt: normalized.dueAt,
        priority: normalized.priority,
        state: "scheduled",
        createdAt: now.toISOString(),
        cancelledAt: null,
      };
      this.db.prepare(`
        INSERT INTO personal_assistance_reminder_v1
        (id, idempotency_key, title, due_at, priority, state, created_at, cancelled_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(reminder.id, reminder.key, reminder.title, reminder.dueAt,
        reminder.priority, reminder.state, reminder.createdAt, reminder.cancelledAt);
      return { reminder, disposition: "created" as const };
    })();
  }

  cancel(id: string, now = new Date()): ReminderRecord {
    if (!/^rem_[0-9a-f-]{36}$/u.test(id) || !Number.isFinite(now.getTime())) {
      throw new Error("Invalid reminder ID or cancellation time.");
    }
    return this.db.transaction(() => {
      const current = this.db.prepare(`
        SELECT * FROM personal_assistance_reminder_v1 WHERE id = ?
      `).get(id) as StoredReminder | undefined;
      if (!current) throw new Error("Reminder not found.");
      if (current.state !== "cancelled") {
        this.db.prepare(`
          UPDATE personal_assistance_reminder_v1
          SET state = 'cancelled', cancelled_at = ? WHERE id = ? AND state = 'scheduled'
        `).run(now.toISOString(), id);
      }
      const updated = this.db.prepare(`
        SELECT * FROM personal_assistance_reminder_v1 WHERE id = ?
      `).get(id) as StoredReminder;
      return fromRow(updated);
    })();
  }
}

/** Lazy runtime connection: isolated verifier imports never touch owner's data. */
export async function liveReminderStore(): Promise<ReminderStore> {
  const { personalAssistanceDb } = await import("../persistence");
  return new ReminderStore(personalAssistanceDb);
}
