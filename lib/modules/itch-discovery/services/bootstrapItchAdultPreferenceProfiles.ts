import type Database from "better-sqlite3";

import type { ItchFilterRule, ItchFilterSort } from "../contract";
import { stringifyJson } from "../database/helpers";
import {
  ItchAdultPreferenceProfileRepository,
  ItchCanonicalTagRepository,
  ItchFilterPresetRepository,
  ItchPreferenceRepository,
} from "../repositories";
import {
  ADULT_FILTER_PRESET_SEEDS,
  ADULT_PREFERENCE_PROFILE_SEEDS,
} from "../seeds/adultPreferenceProfiles";

export type BootstrapItchAdultPreferenceProfilesResult = {
  profiles: number;
  rules: number;
  presets: number;
  compilations: number;
};

type CategoryRow = { id: string };
type TaxonomyEntryRow = { category_id: string };

function adultBaseRules(): ItchFilterRule[] {
  return [
    { field: "adultStatus", operator: "in", values: ["adult"] },
    { field: "availability", operator: "available" },
    { field: "classification", operator: "in", values: ["game"] },
  ];
}

function compileProfileRules(
  profileRules: Array<{ tag: string; state: string }>,
): ItchFilterRule[] {
  const required = profileRules
    .filter((rule) => rule.state === "require")
    .map((rule) => rule.tag);

  const excluded = profileRules
    .filter((rule) => rule.state === "exclude")
    .map((rule) => rule.tag);

  const rules: ItchFilterRule[] = adultBaseRules();

  if (required.length > 0) {
    rules.push({ field: "tag", operator: "includesAll", values: required });
  }

  if (excluded.length > 0) {
    rules.push({ field: "tag", operator: "excludesAny", values: excluded });
  }

  return rules;
}

function formatDisplayName(tag: string): string {
  return tag
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function categoryExists(
  database: Database.Database,
  categoryId: string | undefined,
): boolean {
  if (!categoryId) return false;

  const row = database
    .prepare("SELECT id FROM itch_taxonomy_categories WHERE id = ?")
    .get(categoryId) as CategoryRow | undefined;

  return Boolean(row);
}

function findTaxonomyCategoryForTag(
  database: Database.Database,
  tag: string,
): string | undefined {
  const row = database
    .prepare(
      `SELECT category_id
       FROM itch_taxonomy_entries
       WHERE tag = ?
       LIMIT 1`,
    )
    .get(tag) as TaxonomyEntryRow | undefined;

  return row?.category_id;
}

function resolveCategoryId(
  database: Database.Database,
  tag: string,
  requestedCategoryId: string | undefined,
): string | undefined {
  if (categoryExists(database, requestedCategoryId)) {
    return requestedCategoryId;
  }

  const inferredCategoryId = findTaxonomyCategoryForTag(database, tag);
  if (categoryExists(database, inferredCategoryId)) {
    return inferredCategoryId;
  }

  return undefined;
}

function ensureCanonicalTag(
  canonicalTags: ItchCanonicalTagRepository,
  tag: string,
): void {
  const existing = canonicalTags.findByTag(tag);
  if (existing) return;

  canonicalTags.upsert({
    tag,
    displayName: formatDisplayName(tag),
    category: "other",
    isFilterable: true,
    isRankable: true,
    source: "system",
  });
}

export function bootstrapItchAdultPreferenceProfiles(
  database: Database.Database,
): BootstrapItchAdultPreferenceProfilesResult {
  const adultProfiles = new ItchAdultPreferenceProfileRepository(database);
  const filters = new ItchFilterPresetRepository(database);
  const preferences = new ItchPreferenceRepository(database);
  const canonicalTags = new ItchCanonicalTagRepository(database);
  const defaultPreference = preferences.ensureDefaultProfile();
  let presets = 0;
  let compilations = 0;

  const write = database.transaction(() => {
    for (const seed of ADULT_PREFERENCE_PROFILE_SEEDS) {
      const profile = adultProfiles.upsertProfile({
        id: seed.id,
        name: seed.name,
        description: seed.description,
        isDefault: seed.isDefault,
        enabled: seed.enabled,
        metadataMode: seed.metadataMode,
        defaultSort: seed.defaultSort,
      });

      for (const rule of seed.rules) {
        ensureCanonicalTag(canonicalTags, rule.tag);

        adultProfiles.upsertRule({
          profileId: profile.id,
          taxonomyTag: rule.tag,
          categoryId: resolveCategoryId(database, rule.tag, rule.categoryId),
          state: rule.state,
          weight: rule.weight,
          source: "system",
          note: rule.note,
        });

        if (rule.state === "prefer" || rule.state === "exclude") {
          preferences.upsertWeight({
            profileId: defaultPreference.id,
            featureType: "tag",
            featureValue: rule.tag,
            weight: rule.weight ?? (rule.state === "prefer" ? 1 : -5),
            origin: "default",
            confidence: 0.9,
          });
        }
      }

      const compiledRules = compileProfileRules(seed.rules);
      const preset = filters.upsert({
        name: seed.name,
        description: seed.description,
        isDefault: seed.isDefault,
        isSystem: true,
        rules: compiledRules,
        sort: seed.defaultSort as ItchFilterSort[],
      });
      presets += 1;

      database
        .prepare(
          `INSERT INTO itch_adult_profile_compilations (
            id,
            adult_profile_id,
            filter_preset_id,
            preference_profile_id,
            compiled_rules_json,
            compiled_weights_json,
            compiled_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(adult_profile_id) DO UPDATE SET
            filter_preset_id = excluded.filter_preset_id,
            preference_profile_id = excluded.preference_profile_id,
            compiled_rules_json = excluded.compiled_rules_json,
            compiled_weights_json = excluded.compiled_weights_json,
            compiled_at = excluded.compiled_at`,
        )
        .run(
          `adult_profile_compilation_${profile.id}`,
          profile.id,
          preset.id,
          defaultPreference.id,
          stringifyJson(compiledRules),
          stringifyJson(
            seed.rules.filter(
              (rule) => rule.state === "prefer" || rule.state === "exclude",
            ),
          ),
          new Date().toISOString(),
        );

      compilations += 1;
    }

    for (const preset of ADULT_FILTER_PRESET_SEEDS) {
      filters.upsert({
        ...preset,
        isDefault: preset.isDefault ?? false,
        isSystem: true,
      });
      presets += 1;
    }
  });

  write();

  return {
    profiles: adultProfiles.countProfiles(),
    rules: adultProfiles.countRules(),
    presets,
    compilations,
  };
}
