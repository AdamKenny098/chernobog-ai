import type Database from "better-sqlite3";

import { nowIso, parseJson, stringifyJson } from "../database/helpers";
import { normalizeItchTagLookupKey } from "../domain/tagNormalization";
import type {
  ItchTaxonomyCategory,
  ItchTaxonomyEntry,
  ItchTaxonomyReclassificationRun,
  ItchTaxonomySnapshot,
  ItchUncategorisedTag,
  UpsertItchTaxonomyCategoryInput,
  UpsertItchTaxonomyEntryInput,
} from "../types";

export class ItchAdultTaxonomyRepository {
  constructor(private readonly db: Database.Database) {}

  upsertCategory(input: UpsertItchTaxonomyCategoryInput): ItchTaxonomyCategory {
    const existing = this.findCategory(input.id);
    const timestamp = nowIso();

    this.db.prepare(
      `INSERT INTO itch_taxonomy_categories (
        id, display_name, description, sort_order, visible_in_filters,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        display_name = excluded.display_name,
        description = excluded.description,
        sort_order = excluded.sort_order,
        visible_in_filters = excluded.visible_in_filters,
        updated_at = excluded.updated_at`,
    ).run(
      input.id,
      input.displayName.trim(),
      input.description.trim(),
      Math.trunc(input.sortOrder),
      input.visibleInFilters ? 1 : 0,
      existing?.createdAt ?? timestamp,
      timestamp,
    );

    const result = this.findCategory(input.id);
    if (!result) throw new Error(`Failed to upsert taxonomy category: ${input.id}`);
    return result;
  }

  findCategory(id: string): ItchTaxonomyCategory | null {
    const row = this.db.prepare(
      `SELECT id, display_name, description, sort_order,
              visible_in_filters, created_at, updated_at
       FROM itch_taxonomy_categories WHERE id = ?`,
    ).get(id) as TaxonomyCategoryRow | undefined;
    return row ? mapCategory(row) : null;
  }

  listCategories(): ItchTaxonomyCategory[] {
    const rows = this.db.prepare(
      `SELECT id, display_name, description, sort_order,
              visible_in_filters, created_at, updated_at
       FROM itch_taxonomy_categories
       ORDER BY sort_order ASC, display_name ASC`,
    ).all() as TaxonomyCategoryRow[];
    return rows.map(mapCategory);
  }

  upsertEntry(input: UpsertItchTaxonomyEntryInput): ItchTaxonomyEntry {
    const tag = normalizeItchTagLookupKey(input.tag);
    if (!tag) throw new Error("Taxonomy entries require a canonical tag.");
    if (!this.findCategory(input.categoryId)) {
      throw new Error(`Unknown taxonomy category: ${input.categoryId}`);
    }

    const existing = this.findEntry(tag);
    const timestamp = nowIso();
    const impliedTags = [...new Set(input.impliedTags.map(normalizeItchTagLookupKey).filter(Boolean))]
      .filter((value) => value !== tag)
      .sort();

    this.db.prepare(
      `INSERT INTO itch_taxonomy_entries (
        tag, category_id, adult_evidence, safety_role, description,
        visible_in_filters, enabled, implied_tags_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(tag) DO UPDATE SET
        category_id = excluded.category_id,
        adult_evidence = excluded.adult_evidence,
        safety_role = excluded.safety_role,
        description = excluded.description,
        visible_in_filters = excluded.visible_in_filters,
        enabled = excluded.enabled,
        implied_tags_json = excluded.implied_tags_json,
        updated_at = excluded.updated_at`,
    ).run(
      tag,
      input.categoryId,
      input.adultEvidence,
      input.safetyRole,
      input.description.trim(),
      input.visibleInFilters ? 1 : 0,
      input.enabled ? 1 : 0,
      stringifyJson(impliedTags),
      existing?.createdAt ?? timestamp,
      timestamp,
    );

    this.deleteUncategorised(tag);
    const result = this.findEntry(tag);
    if (!result) throw new Error(`Failed to upsert taxonomy entry: ${tag}`);
    return result;
  }

  findEntry(tagValue: string): ItchTaxonomyEntry | null {
    const tag = normalizeItchTagLookupKey(tagValue);
    if (!tag) return null;
    const row = this.db.prepare(
      `SELECT tag, category_id, adult_evidence, safety_role, description,
              visible_in_filters, enabled, implied_tags_json,
              created_at, updated_at
       FROM itch_taxonomy_entries WHERE tag = ?`,
    ).get(tag) as TaxonomyEntryRow | undefined;
    return row ? mapEntry(row) : null;
  }

  listEntries(options: {
    categoryId?: string;
    enabledOnly?: boolean;
    visibleOnly?: boolean;
  } = {}): ItchTaxonomyEntry[] {
    const clauses: string[] = [];
    const parameters: unknown[] = [];
    if (options.categoryId) {
      clauses.push("category_id = ?");
      parameters.push(options.categoryId);
    }
    if (options.enabledOnly) clauses.push("enabled = 1");
    if (options.visibleOnly) clauses.push("visible_in_filters = 1");

    const rows = this.db.prepare(
      `SELECT tag, category_id, adult_evidence, safety_role, description,
              visible_in_filters, enabled, implied_tags_json,
              created_at, updated_at
       FROM itch_taxonomy_entries
       ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
       ORDER BY category_id ASC, tag ASC`,
    ).all(...parameters) as TaxonomyEntryRow[];
    return rows.map(mapEntry);
  }

  upsertUncategorised(input: {
    canonicalTag: string;
    occurrenceCount: number;
    gameCount: number;
    firstSeenAt?: string;
    lastSeenAt?: string;
    suggestedCategoryId?: ItchUncategorisedTag["suggestedCategoryId"];
  }): ItchUncategorisedTag {
    const canonicalTag = normalizeItchTagLookupKey(input.canonicalTag);
    if (!canonicalTag) throw new Error("Uncategorised tags require a canonical tag.");
    const existing = this.findUncategorised(canonicalTag);
    const timestamp = nowIso();

    this.db.prepare(
      `INSERT INTO itch_uncategorized_tags (
        canonical_tag, occurrence_count, game_count, first_seen_at,
        last_seen_at, status, suggested_category_id, notes
      ) VALUES (?, ?, ?, ?, ?, 'pending', ?, NULL)
      ON CONFLICT(canonical_tag) DO UPDATE SET
        occurrence_count = excluded.occurrence_count,
        game_count = excluded.game_count,
        last_seen_at = excluded.last_seen_at,
        suggested_category_id = COALESCE(
          itch_uncategorized_tags.suggested_category_id,
          excluded.suggested_category_id
        )`,
    ).run(
      canonicalTag,
      Math.max(0, Math.trunc(input.occurrenceCount)),
      Math.max(0, Math.trunc(input.gameCount)),
      existing?.firstSeenAt ?? input.firstSeenAt ?? timestamp,
      input.lastSeenAt ?? timestamp,
      input.suggestedCategoryId ?? null,
    );

    const result = this.findUncategorised(canonicalTag);
    if (!result) throw new Error(`Failed to upsert uncategorised tag: ${canonicalTag}`);
    return result;
  }

  findUncategorised(tagValue: string): ItchUncategorisedTag | null {
    const tag = normalizeItchTagLookupKey(tagValue);
    if (!tag) return null;
    const row = this.db.prepare(
      `SELECT canonical_tag, occurrence_count, game_count, first_seen_at,
              last_seen_at, status, suggested_category_id, notes
       FROM itch_uncategorized_tags WHERE canonical_tag = ?`,
    ).get(tag) as UncategorisedTagRow | undefined;
    return row ? mapUncategorised(row) : null;
  }

  listUncategorised(status?: ItchUncategorisedTag["status"]): ItchUncategorisedTag[] {
    const rows = status
      ? this.db.prepare(
          `SELECT canonical_tag, occurrence_count, game_count, first_seen_at,
                  last_seen_at, status, suggested_category_id, notes
           FROM itch_uncategorized_tags WHERE status = ?
           ORDER BY game_count DESC, occurrence_count DESC, canonical_tag ASC`,
        ).all(status)
      : this.db.prepare(
          `SELECT canonical_tag, occurrence_count, game_count, first_seen_at,
                  last_seen_at, status, suggested_category_id, notes
           FROM itch_uncategorized_tags
           ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'mapped' THEN 1 ELSE 2 END,
                    game_count DESC, occurrence_count DESC, canonical_tag ASC`,
        ).all();
    return (rows as UncategorisedTagRow[]).map(mapUncategorised);
  }

  updateUncategorised(input: {
    canonicalTag: string;
    status: ItchUncategorisedTag["status"];
    suggestedCategoryId?: ItchUncategorisedTag["suggestedCategoryId"];
    notes?: string;
  }): ItchUncategorisedTag | null {
    const tag = normalizeItchTagLookupKey(input.canonicalTag);
    this.db.prepare(
      `UPDATE itch_uncategorized_tags
       SET status = ?, suggested_category_id = ?, notes = ?
       WHERE canonical_tag = ?`,
    ).run(
      input.status,
      input.suggestedCategoryId ?? null,
      input.notes?.trim() || null,
      tag,
    );
    return this.findUncategorised(tag);
  }

  deleteUncategorised(tagValue: string): void {
    const tag = normalizeItchTagLookupKey(tagValue);
    if (tag) this.db.prepare("DELETE FROM itch_uncategorized_tags WHERE canonical_tag = ?").run(tag);
  }

  recordRun(run: ItchTaxonomyReclassificationRun): void {
    this.db.prepare(
      `INSERT INTO itch_taxonomy_reclassification_runs (
        id, started_at, finished_at, games_scanned,
        games_with_structured_tags, tags_scanned, taxonomy_matches,
        uncategorised_tags, implied_tags_added, aliases_seeded
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      run.id,
      run.startedAt,
      run.finishedAt,
      run.gamesScanned,
      run.gamesWithStructuredTags,
      run.tagsScanned,
      run.taxonomyMatches,
      run.uncategorisedTags,
      run.impliedTagsAdded,
      run.aliasesSeeded,
    );
  }

  getSnapshot(): ItchTaxonomySnapshot {
    const categories = this.listCategories();
    const displayRows = this.db.prepare(
      `SELECT e.tag, e.category_id, e.adult_evidence, e.safety_role,
              e.description, e.visible_in_filters, e.enabled,
              e.implied_tags_json, e.created_at, e.updated_at,
              c.display_name
       FROM itch_taxonomy_entries e
       JOIN itch_canonical_tags c ON c.tag = e.tag
       ORDER BY e.category_id ASC, c.display_name ASC`,
    ).all() as Array<TaxonomyEntryRow & { display_name: string }>;

    const entriesByCategory = new Map<string, Array<ItchTaxonomyEntry & { displayName: string }>>();
    for (const row of displayRows) {
      const list = entriesByCategory.get(row.category_id) ?? [];
      list.push({ ...mapEntry(row), displayName: row.display_name });
      entriesByCategory.set(row.category_id, list);
    }
    const entries = displayRows.map(mapEntry);
    return {
      categories: categories.map((category) => ({
        ...category,
        entries: entriesByCategory.get(category.id) ?? [],
      })),
      uncategorised: this.listUncategorised(),
      counts: {
        categories: categories.length,
        entries: entries.length,
        uncategorised: this.countUncategorised(),
        filterableEntries: entries.filter((entry) => entry.enabled && entry.visibleInFilters).length,
        reviewEntries: entries.filter((entry) => entry.safetyRole === "review").length,
        blockedEntries: entries.filter((entry) => entry.safetyRole === "blocked").length,
      },
    };
  }

  countEntries(): number {
    return (this.db.prepare("SELECT COUNT(*) AS count FROM itch_taxonomy_entries").get() as { count: number }).count;
  }

  countCategories(): number {
    return (this.db.prepare("SELECT COUNT(*) AS count FROM itch_taxonomy_categories").get() as { count: number }).count;
  }

  countUncategorised(): number {
    return (this.db.prepare("SELECT COUNT(*) AS count FROM itch_uncategorized_tags").get() as { count: number }).count;
  }
}

type TaxonomyCategoryRow = {
  id: ItchTaxonomyCategory["id"];
  display_name: string;
  description: string;
  sort_order: number;
  visible_in_filters: number;
  created_at: string;
  updated_at: string;
};

type TaxonomyEntryRow = {
  tag: string;
  category_id: ItchTaxonomyEntry["categoryId"];
  adult_evidence: ItchTaxonomyEntry["adultEvidence"];
  safety_role: ItchTaxonomyEntry["safetyRole"];
  description: string;
  visible_in_filters: number;
  enabled: number;
  implied_tags_json: string;
  created_at: string;
  updated_at: string;
};

type UncategorisedTagRow = {
  canonical_tag: string;
  occurrence_count: number;
  game_count: number;
  first_seen_at: string;
  last_seen_at: string;
  status: ItchUncategorisedTag["status"];
  suggested_category_id: ItchUncategorisedTag["suggestedCategoryId"] | null;
  notes: string | null;
};

function mapCategory(row: TaxonomyCategoryRow): ItchTaxonomyCategory {
  return {
    id: row.id,
    displayName: row.display_name,
    description: row.description,
    sortOrder: row.sort_order,
    visibleInFilters: row.visible_in_filters === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEntry(row: TaxonomyEntryRow): ItchTaxonomyEntry {
  return {
    tag: row.tag,
    categoryId: row.category_id,
    adultEvidence: row.adult_evidence,
    safetyRole: row.safety_role,
    description: row.description,
    visibleInFilters: row.visible_in_filters === 1,
    enabled: row.enabled === 1,
    impliedTags: parseJson<string[]>(row.implied_tags_json, []),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapUncategorised(row: UncategorisedTagRow): ItchUncategorisedTag {
  return {
    canonicalTag: row.canonical_tag,
    occurrenceCount: row.occurrence_count,
    gameCount: row.game_count,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    status: row.status,
    suggestedCategoryId: row.suggested_category_id ?? undefined,
    notes: row.notes ?? undefined,
  };
}
