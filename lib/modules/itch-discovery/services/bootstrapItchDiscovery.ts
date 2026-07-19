import type Database from "better-sqlite3";

import { getItchDiscoveryDatabase } from "../database/client";
import {
  ItchAdultSettingsRepository,
  ItchCanonicalTagRepository,
  ItchFilterPresetRepository,
  ItchPreferenceRepository,
  ItchSchedulerRepository,
  ItchTagAliasRepository,
} from "../repositories";
import { bootstrapItchAdultTaxonomy } from "./bootstrapItchAdultTaxonomy";
import { bootstrapItchAdultPreferenceProfiles } from "./bootstrapItchAdultPreferenceProfiles";
import {
  DEFAULT_CANONICAL_TAGS,
  DEFAULT_FILTER_PRESETS,
  DEFAULT_PREFERENCE_WEIGHTS,
  DEFAULT_TAG_ALIASES,
} from "../seeds/defaults";

export type BootstrapItchDiscoveryResult = {
  profileId: string;
  filterPresetCount: number;
  tagAliasCount: number;
  canonicalTagCount: number;
  preferenceWeightCount: number;
};

export function bootstrapItchDiscovery(
  database: Database.Database = getItchDiscoveryDatabase(),
): BootstrapItchDiscoveryResult {
  const adultSettings = new ItchAdultSettingsRepository(database);
  const preferences = new ItchPreferenceRepository(database);
  const filters = new ItchFilterPresetRepository(database);
  const canonicalTags = new ItchCanonicalTagRepository(database);
  const aliases = new ItchTagAliasRepository(database);
  const scheduler = new ItchSchedulerRepository(database);

  const profile = preferences.ensureDefaultProfile();
  adultSettings.ensureDefault();
  scheduler.ensureDefault();

  for (const weight of DEFAULT_PREFERENCE_WEIGHTS) {
    preferences.upsertWeight({
      profileId: profile.id,
      featureType: "tag",
      featureValue: weight.featureValue,
      weight: weight.weight,
      origin: "default",
      confidence: 1,
    });
  }

  for (const preset of DEFAULT_FILTER_PRESETS) {
    const hasAdultRule = preset.rules.some((rule) => rule.field === "adultStatus");
    filters.upsert({
      ...preset,
      rules: hasAdultRule
        ? [...preset.rules]
        : [
            { field: "adultStatus", operator: "in", values: ["adult"] },
            ...preset.rules,
          ],
    });
  }

  for (const definition of DEFAULT_CANONICAL_TAGS) {
    canonicalTags.upsert({
      tag: definition.tag,
      displayName: definition.displayName,
      category: definition.category,
      isFilterable: definition.isFilterable ?? true,
      isRankable: definition.isRankable ?? true,
      source: "system",
    });
  }

  for (const mapping of DEFAULT_TAG_ALIASES) {
    aliases.insertSystemIfMissing(mapping.canonicalTag, mapping.canonicalTag);
    for (const alias of mapping.aliases) {
      aliases.insertSystemIfMissing(mapping.canonicalTag, alias);
    }
  }

  bootstrapItchAdultTaxonomy(database);
  bootstrapItchAdultPreferenceProfiles(database);

  return {
    profileId: profile.id,
    filterPresetCount: filters.count(),
    tagAliasCount: aliases.count(),
    canonicalTagCount: canonicalTags.count(),
    preferenceWeightCount: preferences.listWeights(profile.id).length,
  };
}
