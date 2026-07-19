import type Database from "better-sqlite3";

import type { ItchTagCategory, ItchTaxonomyCategoryId } from "../contract";
import { getItchDiscoveryDatabase } from "../database/client";
import { createItchId, nowIso } from "../database/helpers";
import {
  ItchAdultTaxonomyRepository,
  ItchGameRepository,
} from "../repositories";
import type {
  ItchTaxonomyEntry,
  ReclassifyItchAdultTaxonomyResult,
} from "../types";
import { bootstrapItchAdultTaxonomy } from "./bootstrapItchAdultTaxonomy";
import { bootstrapItchDiscovery } from "./bootstrapItchDiscovery";
import { normalizeExistingItchTags } from "./normalizeExistingItchTags";

export function reclassifyItchAdultTaxonomy(
  database: Database.Database = getItchDiscoveryDatabase(),
  options: { normalizeTags?: boolean } = {},
): ReclassifyItchAdultTaxonomyResult {
  bootstrapItchDiscovery(database);
  const startedAt = nowIso();
  const bootstrap = bootstrapItchAdultTaxonomy(database);
  if (options.normalizeTags !== false) {
    normalizeExistingItchTags({ database });
  }

  const taxonomy = new ItchAdultTaxonomyRepository(database);
  const games = new ItchGameRepository(database);
  const entries = taxonomy.listEntries({ enabledOnly: true });
  const entryByTag = new Map(entries.map((entry) => [entry.tag, entry]));

  let impliedTagsAdded = 0;
  const allGames = games.listAll();
  const applyImplied = database.transaction(() => {
    for (const game of allGames) {
      const expanded = expandImpliedTags(game.tags, entryByTag);
      const missing = expanded.filter((tag) => !game.tags.includes(tag));
      if (missing.length === 0) continue;
      games.mergeTags(
        game.id,
        missing.map((tag) => ({
          tag,
          source: "taxonomy-implied",
          confidence: 0.85,
        })),
      );
      impliedTagsAdded += missing.length;
    }
  });
  applyImplied();

  const usageRows = database.prepare(
    `SELECT c.tag, c.category,
            COUNT(DISTINCT gt.game_id) AS game_count,
            MIN(g.first_discovered_at) AS first_seen_at,
            MAX(g.last_discovered_at) AS last_seen_at
     FROM itch_canonical_tags c
     LEFT JOIN itch_game_tags gt ON gt.tag = c.tag
     LEFT JOIN itch_games g ON g.id = gt.game_id
     GROUP BY c.tag, c.category
     ORDER BY c.tag ASC`,
  ).all() as Array<{
    tag: string;
    category: ItchTagCategory;
    game_count: number;
    first_seen_at: string | null;
    last_seen_at: string | null;
  }>;

  const occurrenceRows = database.prepare(
    `SELECT canonical_tag, COUNT(*) AS occurrence_count
     FROM itch_game_raw_tags
     WHERE canonical_tag IS NOT NULL
     GROUP BY canonical_tag`,
  ).all() as Array<{ canonical_tag: string; occurrence_count: number }>;
  const occurrences = new Map(
    occurrenceRows.map((row) => [row.canonical_tag, row.occurrence_count]),
  );

  let taxonomyMatches = 0;
  const refreshReviewQueue = database.transaction(() => {
    for (const row of usageRows) {
      if (entryByTag.has(row.tag)) {
        if (row.game_count > 0) taxonomyMatches += 1;
        taxonomy.deleteUncategorised(row.tag);
        continue;
      }
      if (row.game_count <= 0) continue;
      taxonomy.upsertUncategorised({
        canonicalTag: row.tag,
        occurrenceCount: occurrences.get(row.tag) ?? row.game_count,
        gameCount: row.game_count,
        firstSeenAt: row.first_seen_at ?? startedAt,
        lastSeenAt: row.last_seen_at ?? startedAt,
        suggestedCategoryId: suggestTaxonomyCategory(row.category),
      });
    }

    database.prepare(
      `DELETE FROM itch_uncategorized_tags
       WHERE canonical_tag NOT IN (SELECT DISTINCT tag FROM itch_game_tags)`,
    ).run();
  });
  refreshReviewQueue();

  const structuredRow = database.prepare(
    `SELECT COUNT(DISTINCT gt.game_id) AS count
     FROM itch_game_tags gt
     JOIN itch_taxonomy_entries te ON te.tag = gt.tag
     WHERE te.enabled = 1`,
  ).get() as { count: number };
  const tagsScannedRow = database.prepare(
    "SELECT COUNT(DISTINCT tag) AS count FROM itch_game_tags",
  ).get() as { count: number };
  const finishedAt = nowIso();
  const uncategorised = taxonomy.listUncategorised("pending");
  const run = {
    id: createItchId("itch_taxonomy_run"),
    startedAt,
    finishedAt,
    gamesScanned: allGames.length,
    gamesWithStructuredTags: structuredRow.count,
    tagsScanned: tagsScannedRow.count,
    taxonomyMatches,
    uncategorisedTags: uncategorised.length,
    impliedTagsAdded,
    aliasesSeeded: bootstrap.aliasesSeeded,
  };
  taxonomy.recordRun(run);

  return {
    run,
    categoryCount: taxonomy.countCategories(),
    taxonomyEntryCount: taxonomy.countEntries(),
    uncategorised,
  };
}

function expandImpliedTags(
  initialTags: string[],
  entryByTag: ReadonlyMap<string, ItchTaxonomyEntry>,
): string[] {
  const tags = new Set(initialTags);
  const queue = [...initialTags];
  while (queue.length > 0) {
    const tag = queue.shift()!;
    const entry = entryByTag.get(tag);
    if (!entry) continue;
    for (const impliedTag of entry.impliedTags) {
      if (tags.has(impliedTag)) continue;
      tags.add(impliedTag);
      queue.push(impliedTag);
    }
  }
  return [...tags].sort();
}

function suggestTaxonomyCategory(
  category: ItchTagCategory,
): ItchTaxonomyCategoryId {
  switch (category) {
    case "genre":
      return "game-format";
    case "theme":
      return "narrative";
    case "perspective":
      return "presentation";
    case "mechanic":
      return "gameplay";
    case "format":
      return "game-format";
    case "visual":
      return "presentation";
    case "setting":
      return "setting";
    case "content":
      return "adult-theme";
    case "technology":
      return "engine";
    default:
      return "uncategorised";
  }
}
