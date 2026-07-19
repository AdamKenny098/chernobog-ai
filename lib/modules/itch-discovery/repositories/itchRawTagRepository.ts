import type Database from "better-sqlite3";

import { nowIso } from "../database/helpers";
import type {
  ItchRawTagObservation,
  ObserveItchRawTagInput,
} from "../types";

type RawTagRow = {
  game_id: string;
  raw_tag: string;
  normalized_key: string | null;
  canonical_tag: string | null;
  source: string;
  confidence: number;
  resolution: ItchRawTagObservation["resolution"];
  first_seen_at: string;
  last_seen_at: string;
};

export class ItchRawTagRepository {
  constructor(private readonly db: Database.Database) {}

  observe(input: ObserveItchRawTagInput): ItchRawTagObservation {
    const rawTag = input.rawTag.trim();
    if (!rawTag) {
      throw new Error("Raw tag observations cannot be empty.");
    }

    const timestamp = input.observedAt ?? nowIso();

    this.db
      .prepare(
        `INSERT INTO itch_game_raw_tags (
          game_id, raw_tag, normalized_key, canonical_tag, source,
          confidence, resolution, first_seen_at, last_seen_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(game_id, raw_tag, source) DO UPDATE SET
          normalized_key = excluded.normalized_key,
          canonical_tag = excluded.canonical_tag,
          confidence = MAX(itch_game_raw_tags.confidence, excluded.confidence),
          resolution = excluded.resolution,
          last_seen_at = excluded.last_seen_at`,
      )
      .run(
        input.gameId,
        rawTag,
        input.normalizedKey || null,
        input.canonicalTag ?? null,
        input.source,
        input.confidence,
        input.resolution,
        timestamp,
        timestamp,
      );

    const row = this.db
      .prepare(
        `SELECT * FROM itch_game_raw_tags
         WHERE game_id = ? AND raw_tag = ? AND source = ?`,
      )
      .get(input.gameId, rawTag, input.source) as RawTagRow | undefined;

    if (!row) {
      throw new Error(`Failed to read raw tag observation: ${rawTag}`);
    }

    return this.mapRow(row);
  }

  listForGame(gameId: string): ItchRawTagObservation[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM itch_game_raw_tags
         WHERE game_id = ?
         ORDER BY raw_tag COLLATE NOCASE ASC, source ASC`,
      )
      .all(gameId) as RawTagRow[];

    return rows.map((row) => this.mapRow(row));
  }

  count(gameId?: string): number {
    const row = gameId
      ? (this.db
          .prepare(
            "SELECT COUNT(*) AS count FROM itch_game_raw_tags WHERE game_id = ?",
          )
          .get(gameId) as { count: number })
      : (this.db
          .prepare("SELECT COUNT(*) AS count FROM itch_game_raw_tags")
          .get() as { count: number });

    return row.count;
  }

  private mapRow(row: RawTagRow): ItchRawTagObservation {
    return {
      gameId: row.game_id,
      rawTag: row.raw_tag,
      normalizedKey: row.normalized_key ?? undefined,
      canonicalTag: row.canonical_tag ?? undefined,
      source: row.source,
      confidence: row.confidence,
      resolution: row.resolution,
      firstSeenAt: row.first_seen_at,
      lastSeenAt: row.last_seen_at,
    };
  }
}
