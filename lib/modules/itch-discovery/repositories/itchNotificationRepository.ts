import type Database from "better-sqlite3";

import type {
  ItchNotificationPriority,
  ItchNotificationState,
} from "../contract";
import type {
  CreateItchNotificationInput,
  ItchNotification,
} from "../types";
import { createItchId, nowIso } from "../database/helpers";

type NotificationRow = {
  id: string;
  change_event_id: string;
  game_id: string;
  notification_type: string;
  title: string;
  body: string;
  priority: ItchNotificationPriority;
  state: ItchNotificationState;
  created_at: string;
  read_at: string | null;
  dismissed_at: string | null;
};

export class ItchNotificationRepository {
  constructor(private readonly db: Database.Database) {}

  createIfMissing(input: CreateItchNotificationInput): ItchNotification {
    return this.insertIfMissing(input).notification;
  }

  insertIfMissing(
    input: CreateItchNotificationInput,
  ): { notification: ItchNotification; created: boolean } {
    const id = input.id ?? createItchId("itch_notification");
    const createdAt = nowIso();
    const result = this.db
      .prepare(
        `INSERT INTO itch_notifications (
          id, change_event_id, game_id, notification_type,
          title, body, priority, state, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'unread', ?)
        ON CONFLICT(change_event_id, notification_type) DO NOTHING`,
      )
      .run(
        id,
        input.changeEventId,
        input.gameId,
        input.notificationType,
        input.title,
        input.body,
        input.priority,
        createdAt,
      );

    const row = this.db
      .prepare(
        `SELECT * FROM itch_notifications
         WHERE change_event_id = ? AND notification_type = ?`,
      )
      .get(input.changeEventId, input.notificationType) as NotificationRow | undefined;
    if (!row) {
      throw new Error(`Failed to read notification for change ${input.changeEventId}`);
    }
    return { notification: this.mapRow(row), created: result.changes > 0 };
  }

  list(state?: ItchNotificationState, limit = 100): ItchNotification[] {
    const safeLimit = Math.min(500, Math.max(1, Math.floor(limit)));
    const rows = state
      ? (this.db.prepare(
          `SELECT * FROM itch_notifications WHERE state = ?
           ORDER BY CASE priority WHEN 'high' THEN 3 WHEN 'normal' THEN 2 ELSE 1 END DESC,
                    created_at DESC LIMIT ?`,
        ).all(state, safeLimit) as NotificationRow[])
      : (this.db.prepare(
          `SELECT * FROM itch_notifications
           ORDER BY created_at DESC LIMIT ?`,
        ).all(safeLimit) as NotificationRow[]);
    return rows.map((row) => this.mapRow(row));
  }

  listUnread(limit = 100): ItchNotification[] {
    return this.list("unread", limit);
  }

  listCreatedBetween(startIso: string, endIso: string): ItchNotification[] {
    const rows = this.db.prepare(
      `SELECT * FROM itch_notifications
       WHERE created_at >= ? AND created_at < ? AND state != 'dismissed'
       ORDER BY created_at ASC, id ASC`,
    ).all(startIso, endIso) as NotificationRow[];
    return rows.map((row) => this.mapRow(row));
  }

  markRead(id: string): ItchNotification | null {
    const timestamp = nowIso();
    this.db.prepare(
      `UPDATE itch_notifications
       SET state = 'read', read_at = COALESCE(read_at, ?)
       WHERE id = ?`,
    ).run(timestamp, id);
    return this.findById(id);
  }

  markOpened(id: string): ItchNotification | null {
    const timestamp = nowIso();
    this.db.prepare(
      `UPDATE itch_notifications
       SET state = 'opened', read_at = COALESCE(read_at, ?)
       WHERE id = ?`,
    ).run(timestamp, id);
    return this.findById(id);
  }

  dismiss(id: string): ItchNotification | null {
    const timestamp = nowIso();
    this.db.prepare(
      `UPDATE itch_notifications
       SET state = 'dismissed', dismissed_at = COALESCE(dismissed_at, ?)
       WHERE id = ?`,
    ).run(timestamp, id);
    return this.findById(id);
  }

  findById(id: string): ItchNotification | null {
    const row = this.db.prepare("SELECT * FROM itch_notifications WHERE id = ?").get(id) as NotificationRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  countUnread(): number {
    const row = this.db.prepare(
      "SELECT COUNT(*) AS count FROM itch_notifications WHERE state = 'unread'",
    ).get() as { count: number };
    return row.count;
  }

  private mapRow(row: NotificationRow): ItchNotification {
    return {
      id: row.id,
      changeEventId: row.change_event_id,
      gameId: row.game_id,
      notificationType: row.notification_type,
      title: row.title,
      body: row.body,
      priority: row.priority,
      state: row.state,
      createdAt: row.created_at,
      readAt: row.read_at ?? undefined,
      dismissedAt: row.dismissed_at ?? undefined,
    };
  }
}
