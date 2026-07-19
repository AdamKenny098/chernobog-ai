import type Database from "better-sqlite3";

import type { ItchFilterRule } from "../contract";
import { getItchDiscoveryDatabase } from "../database/client";
import { nowIso, parseJson, stringifyJson } from "../database/helpers";
import { ItchTagNormalizer } from "../domain/tagNormalization";
import {
  ItchCanonicalTagRepository,
  ItchGameRepository,
  ItchTagAliasRepository,
} from "../repositories";
import type { NormalizeExistingItchTagsResult } from "../types";
import { bootstrapItchDiscovery } from "./bootstrapItchDiscovery";

type GameTagRow = {
  game_id: string;
  tag: string;
  source: string;
  confidence: number;
};

type SnapshotTagRow = {
  id: string;
  tags_json: string;
};

type PreferenceWeightTagRow = {
  id: string;
  profile_id: string;
  feature_value: string;
  weight: number;
  origin: string;
  confidence: number;
  updated_at: string;
};

type FilterPresetTagRow = {
  id: string;
  rules_json: string;
};

export type NormalizeExistingItchTagsDependencies = {
  database?: Database.Database;
};

export function normalizeExistingItchTags(
  dependencies: NormalizeExistingItchTagsDependencies = {},
): NormalizeExistingItchTagsResult {
  const database = dependencies.database ?? getItchDiscoveryDatabase();
  bootstrapItchDiscovery(database);

  const aliases = new ItchTagAliasRepository(database);
  const canonicalTags = new ItchCanonicalTagRepository(database);
  const normalizer = new ItchTagNormalizer(aliases);
  const games = new ItchGameRepository(database);

  const rows = database
    .prepare(
      `SELECT game_id, tag, source, confidence
       FROM itch_game_tags
       ORDER BY game_id ASC, tag ASC`,
    )
    .all() as GameTagRow[];

  const grouped = new Map<string, GameTagRow[]>();
  for (const row of rows) {
    const current = grouped.get(row.game_id) ?? [];
    current.push(row);
    grouped.set(row.game_id, current);
  }

  const result: NormalizeExistingItchTagsResult = {
    gamesScanned: grouped.size,
    gamesChanged: 0,
    rawTagsObserved: rows.length,
    canonicalTagsBefore: rows.length,
    canonicalTagsAfter: 0,
    canonicalVocabularySize: 0,
    aliasHits: 0,
    generatedTags: 0,
    rejectedTags: 0,
    collisionsRemoved: 0,
    snapshotsChanged: 0,
    preferenceWeightsChanged: 0,
    filterPresetsChanged: 0,
  };

  const normalizeGames = database.transaction(() => {
    for (const [gameId, tagRows] of grouped) {
      const before = tagRows.map((row) => row.tag).sort();
      const batch = normalizer.normalizeMany(before);

      result.aliasHits += batch.aliasHits;
      result.generatedTags += batch.generatedTags;
      result.rejectedTags += batch.rejectedTags;
      result.collisionsRemoved += batch.collisionsRemoved;

      games.replaceTags(
        gameId,
        tagRows.map((row) => ({
          tag: row.tag,
          source: row.source,
          confidence: row.confidence,
        })),
      );

      const after = games.findById(gameId)?.tags ?? [];
      if (!sameStringArray(before, after)) {
        result.gamesChanged += 1;
      }
    }
  });
  normalizeGames();

  result.canonicalTagsAfter = countRows(database, "itch_game_tags");
  result.snapshotsChanged = normalizeSnapshotTags(database, normalizer);
  result.preferenceWeightsChanged = normalizePreferenceWeights(
    database,
    normalizer,
  );
  result.filterPresetsChanged = normalizeFilterPresets(database, normalizer);

  const canonicalRows = database
    .prepare("SELECT DISTINCT tag FROM itch_game_tags")
    .all() as Array<{ tag: string }>;
  for (const row of canonicalRows) {
    canonicalTags.ensureDiscovered(row.tag);
  }

  database
    .prepare(
      `DELETE FROM itch_canonical_tags
       WHERE source = 'discovered'
         AND tag NOT IN (SELECT tag FROM itch_game_tags)
         AND tag NOT IN (SELECT canonical_tag FROM itch_tag_aliases)
         AND tag NOT IN (
           SELECT canonical_tag FROM itch_game_raw_tags
           WHERE canonical_tag IS NOT NULL
         )`,
    )
    .run();

  result.canonicalVocabularySize = canonicalTags.count();

  return result;
}

function normalizeSnapshotTags(
  database: Database.Database,
  normalizer: ItchTagNormalizer,
): number {
  const rows = database
    .prepare("SELECT id, tags_json FROM itch_game_snapshots")
    .all() as SnapshotTagRow[];
  const update = database.prepare(
    "UPDATE itch_game_snapshots SET tags_json = ? WHERE id = ?",
  );
  let changed = 0;

  const write = database.transaction(() => {
    for (const row of rows) {
      const before = parseJson<string[]>(row.tags_json, []);
      const after = normalizer.normalizeMany(before).canonicalTags;
      if (sameStringArray([...before].sort(), after)) {
        continue;
      }

      update.run(stringifyJson(after), row.id);
      changed += 1;
    }
  });
  write();

  return changed;
}

function normalizePreferenceWeights(
  database: Database.Database,
  normalizer: ItchTagNormalizer,
): number {
  const rows = database
    .prepare(
      `SELECT id, profile_id, feature_value, weight, origin,
              confidence, updated_at
       FROM itch_preference_weights
       WHERE feature_type = 'tag'
       ORDER BY profile_id ASC, origin ASC, feature_value ASC`,
    )
    .all() as PreferenceWeightTagRow[];
  let changed = 0;

  const write = database.transaction(() => {
    for (const row of rows) {
      const normalized = normalizer.normalize(row.feature_value);
      const canonicalTag = normalized.canonicalTag;
      if (!canonicalTag || canonicalTag === row.feature_value) {
        continue;
      }

      const conflict = database
        .prepare(
          `SELECT id, profile_id, feature_value, weight, origin,
                  confidence, updated_at
           FROM itch_preference_weights
           WHERE profile_id = ? AND feature_type = 'tag'
             AND feature_value = ? AND origin = ? AND id <> ?`,
        )
        .get(
          row.profile_id,
          canonicalTag,
          row.origin,
          row.id,
        ) as PreferenceWeightTagRow | undefined;

      if (conflict) {
        const preferred =
          Math.abs(row.weight) > Math.abs(conflict.weight) ? row : conflict;
        database
          .prepare(
            `UPDATE itch_preference_weights
             SET weight = ?, confidence = ?, updated_at = ?
             WHERE id = ?`,
          )
          .run(
            preferred.weight,
            Math.max(row.confidence, conflict.confidence),
            nowIso(),
            conflict.id,
          );
        database
          .prepare("DELETE FROM itch_preference_weights WHERE id = ?")
          .run(row.id);
      } else {
        database
          .prepare(
            `UPDATE itch_preference_weights
             SET feature_value = ?, updated_at = ?
             WHERE id = ?`,
          )
          .run(canonicalTag, nowIso(), row.id);
      }

      changed += 1;
    }
  });
  write();

  return changed;
}

function normalizeFilterPresets(
  database: Database.Database,
  normalizer: ItchTagNormalizer,
): number {
  const rows = database
    .prepare("SELECT id, rules_json FROM itch_filter_presets")
    .all() as FilterPresetTagRow[];
  const update = database.prepare(
    `UPDATE itch_filter_presets
     SET rules_json = ?, updated_at = ?
     WHERE id = ?`,
  );
  let changed = 0;

  const write = database.transaction(() => {
    for (const row of rows) {
      const rules = parseJson<ItchFilterRule[]>(row.rules_json, []);
      let presetChanged = false;

      const normalizedRules = rules.map((rule): ItchFilterRule => {
        if (rule.field !== "tag") {
          return rule;
        }

        const values = normalizer.normalizeMany(rule.values).canonicalTags;
        if (!sameStringArray([...rule.values].sort(), values)) {
          presetChanged = true;
        }

        return {
          ...rule,
          values,
        };
      });

      if (!presetChanged) {
        continue;
      }

      update.run(stringifyJson(normalizedRules), nowIso(), row.id);
      changed += 1;
    }
  });
  write();

  return changed;
}

function countRows(database: Database.Database, table: string): number {
  const allowed = new Set(["itch_game_tags"]);
  if (!allowed.has(table)) {
    throw new Error(`Unsupported Stage D count table: ${table}`);
  }

  const row = database
    .prepare(`SELECT COUNT(*) AS count FROM ${table}`)
    .get() as { count: number };
  return row.count;
}

function sameStringArray(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}
