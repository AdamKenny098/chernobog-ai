import type Database from "better-sqlite3";

import type { ItchWatchReason } from "../contract";
import type { ItchGameWatch, UpsertItchGameWatchInput } from "../types";
import {
  createItchId,
  fromSqliteBoolean,
  nowIso,
  toSqliteBoolean,
} from "../database/helpers";

type WatchRow = {
  id: string;
  game_id: string;
  watch_reason: ItchWatchReason;
  watch_devlogs: number;
  watch_price: number;
  watch_metadata: number;
  watch_platforms: number;
  watch_sale: number;
  enabled: number;
  last_checked_at: string | null;
  devlog_feed_url: string | null;
  devlog_etag: string | null;
  devlog_last_modified: string | null;
  devlog_initialized_at: string | null;
  last_snapshot_id: string | null;
  last_success_at: string | null;
  last_error: string | null;
  last_error_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ItchWatchPollStatePatch = {
  lastCheckedAt?: string;
  devlogFeedUrl?: string;
  devlogEtag?: string | null;
  devlogLastModified?: string | null;
  devlogInitializedAt?: string;
  lastSnapshotId?: string | null;
  lastSuccessAt?: string;
  lastError?: string | null;
  lastErrorAt?: string | null;
};

export class ItchWatchRepository {
  constructor(private readonly db: Database.Database) {}

  upsert(input: UpsertItchGameWatchInput): ItchGameWatch {
    const existing = this.findByGameId(input.gameId);
    const id = input.id ?? existing?.id ?? createItchId("itch_watch");
    const timestamp = nowIso();

    this.db
      .prepare(
        `INSERT INTO itch_game_watches (
          id, game_id, watch_reason, watch_devlogs, watch_price,
          watch_metadata, watch_platforms, watch_sale, enabled,
          last_checked_at, devlog_feed_url, devlog_etag,
          devlog_last_modified, devlog_initialized_at, last_snapshot_id,
          last_success_at, last_error, last_error_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(game_id) DO UPDATE SET
          watch_reason = excluded.watch_reason,
          watch_devlogs = excluded.watch_devlogs,
          watch_price = excluded.watch_price,
          watch_metadata = excluded.watch_metadata,
          watch_platforms = excluded.watch_platforms,
          watch_sale = excluded.watch_sale,
          enabled = excluded.enabled,
          last_checked_at = COALESCE(excluded.last_checked_at, itch_game_watches.last_checked_at),
          devlog_feed_url = COALESCE(excluded.devlog_feed_url, itch_game_watches.devlog_feed_url),
          devlog_etag = COALESCE(excluded.devlog_etag, itch_game_watches.devlog_etag),
          devlog_last_modified = COALESCE(excluded.devlog_last_modified, itch_game_watches.devlog_last_modified),
          devlog_initialized_at = COALESCE(excluded.devlog_initialized_at, itch_game_watches.devlog_initialized_at),
          last_snapshot_id = COALESCE(excluded.last_snapshot_id, itch_game_watches.last_snapshot_id),
          last_success_at = COALESCE(excluded.last_success_at, itch_game_watches.last_success_at),
          last_error = excluded.last_error,
          last_error_at = excluded.last_error_at,
          updated_at = excluded.updated_at`,
      )
      .run(
        id,
        input.gameId,
        input.watchReason,
        toSqliteBoolean(input.watchDevlogs),
        toSqliteBoolean(input.watchPrice),
        toSqliteBoolean(input.watchMetadata),
        toSqliteBoolean(input.watchPlatforms),
        toSqliteBoolean(input.watchSale),
        toSqliteBoolean(input.enabled),
        input.lastCheckedAt ?? null,
        input.devlogFeedUrl ?? null,
        input.devlogEtag ?? null,
        input.devlogLastModified ?? null,
        input.devlogInitializedAt ?? null,
        input.lastSnapshotId ?? null,
        input.lastSuccessAt ?? null,
        input.lastError ?? null,
        input.lastErrorAt ?? null,
        existing?.createdAt ?? timestamp,
        timestamp,
      );

    const watch = this.findByGameId(input.gameId);
    if (!watch) {
      throw new Error(`Failed to read watch for game ${input.gameId}`);
    }

    return watch;
  }

  findByGameId(gameId: string): ItchGameWatch | null {
    const row = this.db
      .prepare("SELECT * FROM itch_game_watches WHERE game_id = ?")
      .get(gameId) as WatchRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  findById(id: string): ItchGameWatch | null {
    const row = this.db
      .prepare("SELECT * FROM itch_game_watches WHERE id = ?")
      .get(id) as WatchRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  listEnabled(limit = 500, gameIds?: string[]): ItchGameWatch[] {
    const safeLimit = Math.min(500, Math.max(1, Math.floor(limit)));
    if (gameIds?.length) {
      const uniqueIds = [...new Set(gameIds)];
      const placeholders = uniqueIds.map(() => "?").join(", ");
      const rows = this.db
        .prepare(
          `SELECT * FROM itch_game_watches
           WHERE enabled = 1 AND game_id IN (${placeholders})
           ORDER BY COALESCE(last_checked_at, '') ASC
           LIMIT ?`,
        )
        .all(...uniqueIds, safeLimit) as WatchRow[];
      return rows.map((row) => this.mapRow(row));
    }

    const rows = this.db
      .prepare(
        `SELECT * FROM itch_game_watches
         WHERE enabled = 1
         ORDER BY COALESCE(last_checked_at, '') ASC
         LIMIT ?`,
      )
      .all(safeLimit) as WatchRow[];

    return rows.map((row) => this.mapRow(row));
  }

  listAll(): ItchGameWatch[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM itch_game_watches
         ORDER BY enabled DESC, updated_at DESC`,
      )
      .all() as WatchRow[];
    return rows.map((row) => this.mapRow(row));
  }

  updatePollState(gameId: string, patch: ItchWatchPollStatePatch): ItchGameWatch | null {
    const current = this.findByGameId(gameId);
    if (!current) {
      return null;
    }

    const values = {
      lastCheckedAt: patch.lastCheckedAt ?? current.lastCheckedAt ?? null,
      devlogFeedUrl: patch.devlogFeedUrl ?? current.devlogFeedUrl ?? null,
      devlogEtag:
        patch.devlogEtag === undefined ? current.devlogEtag ?? null : patch.devlogEtag,
      devlogLastModified:
        patch.devlogLastModified === undefined
          ? current.devlogLastModified ?? null
          : patch.devlogLastModified,
      devlogInitializedAt:
        patch.devlogInitializedAt ?? current.devlogInitializedAt ?? null,
      lastSnapshotId:
        patch.lastSnapshotId === undefined
          ? current.lastSnapshotId ?? null
          : patch.lastSnapshotId,
      lastSuccessAt: patch.lastSuccessAt ?? current.lastSuccessAt ?? null,
      lastError:
        patch.lastError === undefined ? current.lastError ?? null : patch.lastError,
      lastErrorAt:
        patch.lastErrorAt === undefined
          ? current.lastErrorAt ?? null
          : patch.lastErrorAt,
      updatedAt: nowIso(),
      gameId,
    };

    this.db
      .prepare(
        `UPDATE itch_game_watches SET
          last_checked_at = @lastCheckedAt,
          devlog_feed_url = @devlogFeedUrl,
          devlog_etag = @devlogEtag,
          devlog_last_modified = @devlogLastModified,
          devlog_initialized_at = @devlogInitializedAt,
          last_snapshot_id = @lastSnapshotId,
          last_success_at = @lastSuccessAt,
          last_error = @lastError,
          last_error_at = @lastErrorAt,
          updated_at = @updatedAt
         WHERE game_id = @gameId`,
      )
      .run(values);

    return this.findByGameId(gameId);
  }

  setEnabled(gameId: string, enabled: boolean): ItchGameWatch | null {
    this.db
      .prepare(
        `UPDATE itch_game_watches
         SET enabled = ?, updated_at = ?
         WHERE game_id = ?`,
      )
      .run(toSqliteBoolean(enabled), nowIso(), gameId);
    return this.findByGameId(gameId);
  }

  private mapRow(row: WatchRow): ItchGameWatch {
    return {
      id: row.id,
      gameId: row.game_id,
      watchReason: row.watch_reason,
      watchDevlogs: fromSqliteBoolean(row.watch_devlogs),
      watchPrice: fromSqliteBoolean(row.watch_price),
      watchMetadata: fromSqliteBoolean(row.watch_metadata),
      watchPlatforms: fromSqliteBoolean(row.watch_platforms),
      watchSale: fromSqliteBoolean(row.watch_sale),
      enabled: fromSqliteBoolean(row.enabled),
      lastCheckedAt: row.last_checked_at ?? undefined,
      devlogFeedUrl: row.devlog_feed_url ?? undefined,
      devlogEtag: row.devlog_etag ?? undefined,
      devlogLastModified: row.devlog_last_modified ?? undefined,
      devlogInitializedAt: row.devlog_initialized_at ?? undefined,
      lastSnapshotId: row.last_snapshot_id ?? undefined,
      lastSuccessAt: row.last_success_at ?? undefined,
      lastError: row.last_error ?? undefined,
      lastErrorAt: row.last_error_at ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
