import type Database from "better-sqlite3";

import type {
  ItchChangeConfidence,
  ItchChangeType,
  ItchDevlogPostType,
} from "../contract";
import type {
  CreateItchGameChangeEventInput,
  ItchDevlogEntry,
  ItchGameChangeEvent,
  ItchGameSnapshot,
} from "../types";
import {
  createItchId,
  fromSqliteBoolean,
  nowIso,
  parseJson,
  stringifyJson,
  toSqliteBoolean,
} from "../database/helpers";

type ChangeEventRow = {
  id: string;
  game_id: string;
  change_type: ItchChangeType;
  confidence: ItchChangeConfidence;
  summary: string;
  before_json: string | null;
  after_json: string | null;
  source_url: string | null;
  detected_at: string;
  dedupe_key: string;
};

type SnapshotRow = {
  id: string;
  game_id: string;
  captured_at: string;
  metadata_hash: string;
  price_text: string | null;
  is_free: number;
  is_on_sale: number;
  sale_text: string | null;
  platforms_json: string;
  tags_json: string;
  title: string;
  short_description_hash: string | null;
  availability: number;
};

type DevlogRow = {
  id: string;
  game_id: string;
  entry_guid: string;
  entry_url: string;
  title: string;
  summary: string | null;
  published_at: string | null;
  post_type: ItchDevlogPostType;
  content_hash: string;
  first_seen_at: string;
};

export class ItchUpdateRepository {
  constructor(private readonly db: Database.Database) {}

  createSnapshot(
    input: Omit<ItchGameSnapshot, "id" | "capturedAt"> & {
      id?: string;
      capturedAt?: string;
    },
  ): ItchGameSnapshot {
    const snapshot: ItchGameSnapshot = {
      ...input,
      id: input.id ?? createItchId("itch_snapshot"),
      capturedAt: input.capturedAt ?? nowIso(),
    };

    this.db
      .prepare(
        `INSERT INTO itch_game_snapshots (
          id, game_id, captured_at, metadata_hash, price_text,
          is_free, is_on_sale, sale_text, platforms_json, tags_json,
          title, short_description_hash, availability
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        snapshot.id,
        snapshot.gameId,
        snapshot.capturedAt,
        snapshot.metadataHash,
        snapshot.priceText ?? null,
        toSqliteBoolean(snapshot.isFree),
        toSqliteBoolean(snapshot.isOnSale),
        snapshot.saleText ?? null,
        stringifyJson(snapshot.platforms),
        stringifyJson(snapshot.tags),
        snapshot.title,
        snapshot.shortDescriptionHash ?? null,
        toSqliteBoolean(snapshot.availability),
      );

    return snapshot;
  }

  getLatestSnapshot(gameId: string): ItchGameSnapshot | null {
    return this.listLatestSnapshots(gameId, 1)[0] ?? null;
  }

  listLatestSnapshots(gameId: string, limit = 2): ItchGameSnapshot[] {
    const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));
    const rows = this.db
      .prepare(
        `SELECT * FROM itch_game_snapshots
         WHERE game_id = ?
         ORDER BY captured_at DESC, id DESC
         LIMIT ?`,
      )
      .all(gameId, safeLimit) as SnapshotRow[];
    return rows.map((row) => this.mapSnapshot(row));
  }

  findSnapshotById(id: string): ItchGameSnapshot | null {
    const row = this.db
      .prepare("SELECT * FROM itch_game_snapshots WHERE id = ?")
      .get(id) as SnapshotRow | undefined;
    return row ? this.mapSnapshot(row) : null;
  }

  createDevlogEntryIfMissing(
    input: Omit<ItchDevlogEntry, "id" | "firstSeenAt"> & {
      id?: string;
      firstSeenAt?: string;
    },
  ): ItchDevlogEntry {
    return this.insertDevlogEntryIfMissing(input).entry;
  }

  insertDevlogEntryIfMissing(
    input: Omit<ItchDevlogEntry, "id" | "firstSeenAt"> & {
      id?: string;
      firstSeenAt?: string;
    },
  ): { entry: ItchDevlogEntry; created: boolean } {
    const id = input.id ?? createItchId("itch_devlog");
    const firstSeenAt = input.firstSeenAt ?? nowIso();
    const result = this.db
      .prepare(
        `INSERT INTO itch_devlog_entries (
          id, game_id, entry_guid, entry_url, title, summary,
          published_at, post_type, content_hash, first_seen_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(game_id, entry_guid) DO NOTHING`,
      )
      .run(
        id,
        input.gameId,
        input.entryGuid,
        input.entryUrl,
        input.title,
        input.summary ?? null,
        input.publishedAt ?? null,
        input.postType,
        input.contentHash,
        firstSeenAt,
      );

    const row = this.db
      .prepare(
        `SELECT * FROM itch_devlog_entries
         WHERE game_id = ? AND entry_guid = ?`,
      )
      .get(input.gameId, input.entryGuid) as DevlogRow | undefined;

    if (!row) {
      throw new Error(`Failed to read devlog entry ${input.entryGuid}`);
    }

    return { entry: this.mapDevlog(row), created: result.changes > 0 };
  }

  listDevlogEntries(gameId: string, limit = 100): ItchDevlogEntry[] {
    const safeLimit = Math.min(500, Math.max(1, Math.floor(limit)));
    const rows = this.db
      .prepare(
        `SELECT * FROM itch_devlog_entries
         WHERE game_id = ?
         ORDER BY COALESCE(published_at, first_seen_at) DESC, id DESC
         LIMIT ?`,
      )
      .all(gameId, safeLimit) as DevlogRow[];
    return rows.map((row) => this.mapDevlog(row));
  }

  createChangeEventIfMissing(
    input: CreateItchGameChangeEventInput,
  ): ItchGameChangeEvent {
    return this.insertChangeEventIfMissing(input).event;
  }

  insertChangeEventIfMissing(
    input: CreateItchGameChangeEventInput,
  ): { event: ItchGameChangeEvent; created: boolean } {
    const id = input.id ?? createItchId("itch_change");
    const detectedAt = input.detectedAt ?? nowIso();
    const result = this.db
      .prepare(
        `INSERT INTO itch_change_events (
          id, game_id, change_type, confidence, summary,
          before_json, after_json, source_url, detected_at, dedupe_key
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(dedupe_key) DO NOTHING`,
      )
      .run(
        id,
        input.gameId,
        input.type,
        input.confidence,
        input.summary,
        input.before ? stringifyJson(input.before) : null,
        input.after ? stringifyJson(input.after) : null,
        input.sourceUrl ?? null,
        detectedAt,
        input.dedupeKey,
      );

    const row = this.db
      .prepare("SELECT * FROM itch_change_events WHERE dedupe_key = ?")
      .get(input.dedupeKey) as ChangeEventRow | undefined;

    if (!row) {
      throw new Error(`Failed to read change event ${input.dedupeKey}`);
    }

    return { event: this.mapChangeEvent(row), created: result.changes > 0 };
  }

  listChangeEvents(gameId?: string, limit = 100): ItchGameChangeEvent[] {
    const safeLimit = Math.min(500, Math.max(1, Math.floor(limit)));
    const rows = gameId
      ? (this.db
          .prepare(
            `SELECT * FROM itch_change_events
             WHERE game_id = ?
             ORDER BY detected_at DESC, id DESC
             LIMIT ?`,
          )
          .all(gameId, safeLimit) as ChangeEventRow[])
      : (this.db
          .prepare(
            `SELECT * FROM itch_change_events
             ORDER BY detected_at DESC, id DESC
             LIMIT ?`,
          )
          .all(safeLimit) as ChangeEventRow[]);
    return rows.map((row) => this.mapChangeEvent(row));
  }

  private mapSnapshot(row: SnapshotRow): ItchGameSnapshot {
    return {
      id: row.id,
      gameId: row.game_id,
      capturedAt: row.captured_at,
      metadataHash: row.metadata_hash,
      priceText: row.price_text ?? undefined,
      isFree: fromSqliteBoolean(row.is_free),
      isOnSale: fromSqliteBoolean(row.is_on_sale),
      saleText: row.sale_text ?? undefined,
      platforms: parseJson(row.platforms_json, {
        windows: false,
        linux: false,
        macos: false,
        browser: false,
      }),
      tags: parseJson<string[]>(row.tags_json, []),
      title: row.title,
      shortDescriptionHash: row.short_description_hash ?? undefined,
      availability: fromSqliteBoolean(row.availability),
    };
  }

  private mapDevlog(row: DevlogRow): ItchDevlogEntry {
    return {
      id: row.id,
      gameId: row.game_id,
      entryGuid: row.entry_guid,
      entryUrl: row.entry_url,
      title: row.title,
      summary: row.summary ?? undefined,
      publishedAt: row.published_at ?? undefined,
      postType: row.post_type,
      contentHash: row.content_hash,
      firstSeenAt: row.first_seen_at,
    };
  }

  private mapChangeEvent(row: ChangeEventRow): ItchGameChangeEvent {
    return {
      id: row.id,
      gameId: row.game_id,
      type: row.change_type,
      confidence: row.confidence,
      summary: row.summary,
      before: parseJson<Record<string, unknown> | undefined>(
        row.before_json,
        undefined,
      ),
      after: parseJson<Record<string, unknown> | undefined>(
        row.after_json,
        undefined,
      ),
      sourceUrl: row.source_url ?? undefined,
      detectedAt: row.detected_at,
      dedupeKey: row.dedupe_key,
    };
  }
}
