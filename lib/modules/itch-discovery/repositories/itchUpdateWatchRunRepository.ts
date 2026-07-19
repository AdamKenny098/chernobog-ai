import type Database from "better-sqlite3";
import type { ItchRefreshStatus, ItchRefreshTrigger } from "../contract";
import type { ItchUpdateWatchRun } from "../types";
import { createItchId, nowIso, parseJson, stringifyJson } from "../database/helpers";

type Row = {
  id: string; trigger: ItchRefreshTrigger; started_at: string; finished_at: string | null;
  status: ItchRefreshStatus; watches_attempted: number; watches_succeeded: number;
  devlog_entries_scanned: number; devlog_entries_added: number; snapshots_compared: number;
  change_events_created: number; notifications_created: number; errors_json: string;
};

export class ItchUpdateWatchRunRepository {
  constructor(private readonly db: Database.Database) {}
  start(trigger: ItchRefreshTrigger, startedAt = nowIso()): ItchUpdateWatchRun {
    const id = createItchId("itch_update_run");
    this.db.prepare(`INSERT INTO itch_update_watch_runs (id, trigger, started_at) VALUES (?, ?, ?)`)
      .run(id, trigger, startedAt);
    return this.findById(id)!;
  }
  finish(id: string, patch: Omit<Partial<ItchUpdateWatchRun>, "id" | "trigger" | "startedAt"> & { status: Exclude<ItchRefreshStatus, "running"> }): ItchUpdateWatchRun {
    const current = this.findById(id);
    if (!current) throw new Error(`Update watch run not found: ${id}`);
    this.db.prepare(`UPDATE itch_update_watch_runs SET finished_at=?, status=?, watches_attempted=?, watches_succeeded=?, devlog_entries_scanned=?, devlog_entries_added=?, snapshots_compared=?, change_events_created=?, notifications_created=?, errors_json=? WHERE id=?`)
      .run(patch.finishedAt ?? nowIso(), patch.status, patch.watchesAttempted ?? current.watchesAttempted,
        patch.watchesSucceeded ?? current.watchesSucceeded, patch.devlogEntriesScanned ?? current.devlogEntriesScanned,
        patch.devlogEntriesAdded ?? current.devlogEntriesAdded, patch.snapshotsCompared ?? current.snapshotsCompared,
        patch.changeEventsCreated ?? current.changeEventsCreated, patch.notificationsCreated ?? current.notificationsCreated,
        stringifyJson(patch.errors ?? current.errors), id);
    return this.findById(id)!;
  }
  findById(id: string): ItchUpdateWatchRun | null {
    const row = this.db.prepare(`SELECT * FROM itch_update_watch_runs WHERE id=?`).get(id) as Row | undefined;
    return row ? this.map(row) : null;
  }
  private map(row: Row): ItchUpdateWatchRun { return {
    id: row.id, trigger: row.trigger, startedAt: row.started_at, finishedAt: row.finished_at ?? undefined,
    status: row.status, watchesAttempted: row.watches_attempted, watchesSucceeded: row.watches_succeeded,
    devlogEntriesScanned: row.devlog_entries_scanned, devlogEntriesAdded: row.devlog_entries_added,
    snapshotsCompared: row.snapshots_compared, changeEventsCreated: row.change_events_created,
    notificationsCreated: row.notifications_created, errors: parseJson(row.errors_json, []),
  }; }
}
