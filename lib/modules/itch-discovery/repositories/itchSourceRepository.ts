import type Database from "better-sqlite3";

import type { ItchSourceType } from "../contract";
import type { ItchSource, UpsertItchSourceInput } from "../types";
import {
  createItchId,
  fromSqliteBoolean,
  nowIso,
  toSqliteBoolean,
} from "../database/helpers";

type ItchSourceRow = {
  id: string;
  name: string;
  source_type: ItchSourceType;
  source_url: string;
  enabled: number;
  priority: number;
  refresh_interval_hours: number;
  etag: string | null;
  last_modified: string | null;
  last_attempt_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export class ItchSourceRepository {
  constructor(private readonly db: Database.Database) {}

  upsert(input: UpsertItchSourceInput): ItchSource {
    const timestamp = nowIso();
    const id = input.id ?? createItchId("itch_source");

    this.db
      .prepare(
        `INSERT INTO itch_sources (
          id, name, source_type, source_url, enabled, priority,
          refresh_interval_hours, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(source_url) DO UPDATE SET
          name = excluded.name,
          source_type = excluded.source_type,
          enabled = excluded.enabled,
          priority = excluded.priority,
          refresh_interval_hours = excluded.refresh_interval_hours,
          updated_at = excluded.updated_at`,
      )
      .run(
        id,
        input.name,
        input.sourceType,
        input.sourceUrl,
        toSqliteBoolean(input.enabled),
        input.priority,
        input.refreshIntervalHours,
        timestamp,
        timestamp,
      );

    const source = this.findByUrl(input.sourceUrl);
    if (!source) {
      throw new Error(`Failed to read source after upsert: ${input.sourceUrl}`);
    }

    return source;
  }

  findById(id: string): ItchSource | null {
    const row = this.db
      .prepare("SELECT * FROM itch_sources WHERE id = ?")
      .get(id) as ItchSourceRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  findByUrl(sourceUrl: string): ItchSource | null {
    const row = this.db
      .prepare("SELECT * FROM itch_sources WHERE source_url = ?")
      .get(sourceUrl) as ItchSourceRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  listEnabled(): ItchSource[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM itch_sources
         WHERE enabled = 1
         ORDER BY priority DESC, name ASC`,
      )
      .all() as ItchSourceRow[];

    return rows.map((row) => this.mapRow(row));
  }

  recordFetchSuccess(
    id: string,
    cache: { etag?: string; lastModified?: string } = {},
  ): void {
    const timestamp = nowIso();
    this.db
      .prepare(
        `UPDATE itch_sources
         SET etag = COALESCE(?, etag),
             last_modified = COALESCE(?, last_modified),
             last_attempt_at = ?,
             last_success_at = ?,
             last_error = NULL,
             updated_at = ?
         WHERE id = ?`,
      )
      .run(
        cache.etag ?? null,
        cache.lastModified ?? null,
        timestamp,
        timestamp,
        timestamp,
        id,
      );
  }

  recordFetchFailure(id: string, message: string): void {
    const timestamp = nowIso();
    this.db
      .prepare(
        `UPDATE itch_sources
         SET last_attempt_at = ?, last_error = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(timestamp, message, timestamp, id);
  }

  count(): number {
    const row = this.db
      .prepare("SELECT COUNT(*) AS count FROM itch_sources")
      .get() as { count: number };

    return row.count;
  }

  private mapRow(row: ItchSourceRow): ItchSource {
    return {
      id: row.id,
      name: row.name,
      sourceType: row.source_type,
      sourceUrl: row.source_url,
      enabled: fromSqliteBoolean(row.enabled),
      priority: row.priority,
      refreshIntervalHours: row.refresh_interval_hours,
      etag: row.etag ?? undefined,
      lastModified: row.last_modified ?? undefined,
      lastAttemptAt: row.last_attempt_at ?? undefined,
      lastSuccessAt: row.last_success_at ?? undefined,
      lastError: row.last_error ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
