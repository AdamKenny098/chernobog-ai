import type Database from "better-sqlite3";

import type { CreateItchDiscoveryInput, ItchDiscovery } from "../types";
import { createItchId } from "../database/helpers";

type ItchDiscoveryRow = {
  id: string;
  game_id: string;
  source_id: string;
  discovered_at: string;
  source_position: number | null;
  source_title: string | null;
  source_guid: string | null;
  dedupe_key: string;
};

export class ItchDiscoveryRepository {
  constructor(private readonly db: Database.Database) {}

  createIfMissing(input: CreateItchDiscoveryInput): ItchDiscovery {
    return this.createIfMissingWithStatus(input).discovery;
  }

  createIfMissingWithStatus(input: CreateItchDiscoveryInput): {
    discovery: ItchDiscovery;
    created: boolean;
  } {
    const id = input.id ?? createItchId("itch_discovery");

    const result = this.db
      .prepare(
        `INSERT INTO itch_discoveries (
          id, game_id, source_id, discovered_at, source_position,
          source_title, source_guid, dedupe_key
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(dedupe_key) DO NOTHING`,
      )
      .run(
        id,
        input.gameId,
        input.sourceId,
        input.discoveredAt,
        input.sourcePosition ?? null,
        input.sourceTitle ?? null,
        input.sourceGuid ?? null,
        input.dedupeKey,
      );

    const row = this.db
      .prepare("SELECT * FROM itch_discoveries WHERE dedupe_key = ?")
      .get(input.dedupeKey) as ItchDiscoveryRow | undefined;

    if (!row) {
      throw new Error(`Failed to read discovery: ${input.dedupeKey}`);
    }

    return {
      discovery: this.mapRow(row),
      created: result.changes > 0,
    };
  }

  count(): number {
    const row = this.db
      .prepare("SELECT COUNT(*) AS count FROM itch_discoveries")
      .get() as { count: number };

    return row.count;
  }

  private mapRow(row: ItchDiscoveryRow): ItchDiscovery {
    return {
      id: row.id,
      gameId: row.game_id,
      sourceId: row.source_id,
      discoveredAt: row.discovered_at,
      sourcePosition: row.source_position ?? undefined,
      sourceTitle: row.source_title ?? undefined,
      sourceGuid: row.source_guid ?? undefined,
      dedupeKey: row.dedupe_key,
    };
  }
}
