import type Database from "better-sqlite3";

import { nowIso } from "../database/helpers";
import {
  formatItchCanonicalTagDisplayName,
  normalizeItchTagLookupKey,
} from "../domain/tagNormalization";
import type {
  ItchCanonicalTag,
  UpsertItchCanonicalTagInput,
} from "../types";

const SOURCE_PRIORITY: Readonly<Record<ItchCanonicalTag["source"], number>> = {
  discovered: 1,
  system: 2,
  manual: 3,
};

type CanonicalTagRow = {
  tag: string;
  display_name: string;
  category: ItchCanonicalTag["category"];
  is_filterable: number;
  is_rankable: number;
  source: ItchCanonicalTag["source"];
  created_at: string;
  updated_at: string;
};

export class ItchCanonicalTagRepository {
  constructor(private readonly db: Database.Database) {}

  upsert(input: UpsertItchCanonicalTagInput): ItchCanonicalTag {
    const tag = normalizeItchTagLookupKey(input.tag);
    if (!tag) {
      throw new Error("Canonical tags cannot be empty.");
    }

    const existing = this.findByTag(tag);
    if (
      existing &&
      SOURCE_PRIORITY[existing.source] > SOURCE_PRIORITY[input.source]
    ) {
      return existing;
    }

    const timestamp = nowIso();
    const displayName =
      input.displayName?.trim() || formatItchCanonicalTagDisplayName(tag);

    this.db
      .prepare(
        `INSERT INTO itch_canonical_tags (
          tag, display_name, category, is_filterable, is_rankable,
          source, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(tag) DO UPDATE SET
          display_name = excluded.display_name,
          category = excluded.category,
          is_filterable = excluded.is_filterable,
          is_rankable = excluded.is_rankable,
          source = excluded.source,
          updated_at = excluded.updated_at`,
      )
      .run(
        tag,
        displayName,
        input.category,
        input.isFilterable ? 1 : 0,
        input.isRankable ? 1 : 0,
        input.source,
        existing?.createdAt ?? timestamp,
        timestamp,
      );

    const result = this.findByTag(tag);
    if (!result) {
      throw new Error(`Failed to read canonical tag after upsert: ${tag}`);
    }

    return result;
  }

  ensureDiscovered(tagValue: string): ItchCanonicalTag {
    const tag = normalizeItchTagLookupKey(tagValue);
    const existing = this.findByTag(tag);
    if (existing) {
      return existing;
    }

    return this.upsert({
      tag,
      displayName: formatItchCanonicalTagDisplayName(tag),
      category: "other",
      isFilterable: true,
      isRankable: true,
      source: "discovered",
    });
  }

  findByTag(tagValue: string): ItchCanonicalTag | null {
    const tag = normalizeItchTagLookupKey(tagValue);
    if (!tag) {
      return null;
    }

    const row = this.db
      .prepare("SELECT * FROM itch_canonical_tags WHERE tag = ?")
      .get(tag) as CanonicalTagRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  listAll(): ItchCanonicalTag[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM itch_canonical_tags
         ORDER BY category ASC, display_name ASC`,
      )
      .all() as CanonicalTagRow[];

    return rows.map((row) => this.mapRow(row));
  }

  count(): number {
    const row = this.db
      .prepare("SELECT COUNT(*) AS count FROM itch_canonical_tags")
      .get() as { count: number };

    return row.count;
  }

  private mapRow(row: CanonicalTagRow): ItchCanonicalTag {
    return {
      tag: row.tag,
      displayName: row.display_name,
      category: row.category,
      isFilterable: row.is_filterable === 1,
      isRankable: row.is_rankable === 1,
      source: row.source,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
