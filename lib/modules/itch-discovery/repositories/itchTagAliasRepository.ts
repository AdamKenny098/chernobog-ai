import type Database from "better-sqlite3";

import { normalizeItchTagLookupKey } from "../domain/tagNormalization";
import type { ItchTagAlias } from "../types";

const SOURCE_PRIORITY: Readonly<Record<ItchTagAlias["source"], number>> = {
  system: 1,
  learned: 2,
  manual: 3,
};

export type ItchTagAliasResolution = {
  canonicalTag: string;
  aliasKey: string;
  matched: boolean;
  source?: ItchTagAlias["source"];
};

export class ItchTagAliasRepository {
  constructor(private readonly db: Database.Database) {}

  upsert(alias: ItchTagAlias): ItchTagAlias {
    const canonicalTag = normalizeItchTagLookupKey(alias.canonicalTag);
    const normalizedAlias = normalizeItchTagLookupKey(alias.alias);

    if (!canonicalTag || !normalizedAlias) {
      throw new Error("Tag aliases require non-empty canonical and alias values.");
    }

    const existing = this.findByAlias(normalizedAlias);
    if (
      existing &&
      SOURCE_PRIORITY[existing.source] > SOURCE_PRIORITY[alias.source]
    ) {
      return existing;
    }

    this.db
      .prepare(
        `INSERT INTO itch_tag_aliases (canonical_tag, alias, source)
         VALUES (?, ?, ?)
         ON CONFLICT(alias) DO UPDATE SET
           canonical_tag = excluded.canonical_tag,
           source = excluded.source`,
      )
      .run(canonicalTag, normalizedAlias, alias.source);

    return {
      canonicalTag,
      alias: normalizedAlias,
      source: alias.source,
    };
  }

  insertSystemIfMissing(canonicalTag: string, alias: string): void {
    const canonical = normalizeItchTagLookupKey(canonicalTag);
    const normalizedAlias = normalizeItchTagLookupKey(alias);

    if (!canonical || !normalizedAlias) {
      return;
    }

    const existing = this.findByAlias(normalizedAlias);
    if (existing) {
      return;
    }

    this.db
      .prepare(
        `INSERT INTO itch_tag_aliases (canonical_tag, alias, source)
         VALUES (?, ?, 'system')`,
      )
      .run(canonical, normalizedAlias);
  }

  resolve(value: string): string {
    return this.resolveDetailed(value).canonicalTag;
  }

  resolveDetailed(value: string): ItchTagAliasResolution {
    const normalizedKey = normalizeItchTagLookupKey(value);
    if (!normalizedKey) {
      return {
        canonicalTag: "",
        aliasKey: "",
        matched: false,
      };
    }

    const normalizedMatch = this.findByAlias(normalizedKey);
    if (normalizedMatch) {
      return {
        canonicalTag: normalizeItchTagLookupKey(normalizedMatch.canonicalTag),
        aliasKey: normalizedKey,
        matched: true,
        source: normalizedMatch.source,
      };
    }

    // Compatibility path for Stage A-C databases where aliases may have been
    // stored with spaces before Stage D introduced slug-normalized keys.
    const legacyKey = value.trim().toLocaleLowerCase("en-US");
    if (legacyKey && legacyKey !== normalizedKey) {
      const legacyMatch = this.findByAlias(legacyKey);
      if (legacyMatch) {
        return {
          canonicalTag: normalizeItchTagLookupKey(legacyMatch.canonicalTag),
          aliasKey: legacyKey,
          matched: true,
          source: legacyMatch.source,
        };
      }
    }

    return {
      canonicalTag: normalizedKey,
      aliasKey: normalizedKey,
      matched: false,
    };
  }

  findByAlias(aliasValue: string): ItchTagAlias | null {
    const row = this.db
      .prepare(
        `SELECT canonical_tag AS canonicalTag, alias, source
         FROM itch_tag_aliases
         WHERE alias = ?`,
      )
      .get(aliasValue) as ItchTagAlias | undefined;

    return row ?? null;
  }

  listForCanonical(canonicalTagValue: string): ItchTagAlias[] {
    const canonicalTag = normalizeItchTagLookupKey(canonicalTagValue);
    return this.db
      .prepare(
        `SELECT canonical_tag AS canonicalTag, alias, source
         FROM itch_tag_aliases
         WHERE canonical_tag = ?
         ORDER BY alias ASC`,
      )
      .all(canonicalTag) as ItchTagAlias[];
  }

  listAll(): ItchTagAlias[] {
    return this.db
      .prepare(
        `SELECT canonical_tag AS canonicalTag, alias, source
         FROM itch_tag_aliases
         ORDER BY canonical_tag ASC, alias ASC`,
      )
      .all() as ItchTagAlias[];
  }

  count(): number {
    const row = this.db
      .prepare("SELECT COUNT(*) AS count FROM itch_tag_aliases")
      .get() as { count: number };

    return row.count;
  }
}
