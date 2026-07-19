import type Database from "better-sqlite3";

import { getItchDiscoveryDatabase } from "../database/client";
import {
  ItchAdultTaxonomyRepository,
  ItchCanonicalTagRepository,
  ItchTagAliasRepository,
} from "../repositories";
import {
  ADULT_TAXONOMY_CATEGORIES,
  ADULT_TAXONOMY_ENTRIES,
} from "../seeds/adultTaxonomy";

export type BootstrapItchAdultTaxonomyResult = {
  categoryCount: number;
  entryCount: number;
  aliasCount: number;
  aliasesSeeded: number;
};

export function bootstrapItchAdultTaxonomy(
  database: Database.Database = getItchDiscoveryDatabase(),
): BootstrapItchAdultTaxonomyResult {
  const taxonomy = new ItchAdultTaxonomyRepository(database);
  const canonicalTags = new ItchCanonicalTagRepository(database);
  const aliases = new ItchTagAliasRepository(database);
  const aliasesBefore = aliases.count();
  const existingCategories = new Set(
    taxonomy.listCategories().map((category) => category.id),
  );
  const existingEntries = new Set(
    taxonomy.listEntries().map((entry) => entry.tag),
  );
  const seedAlreadyComplete =
    ADULT_TAXONOMY_CATEGORIES.every((category) =>
      existingCategories.has(category.id),
    ) &&
    ADULT_TAXONOMY_ENTRIES.every((entry) => existingEntries.has(entry.tag));

  if (seedAlreadyComplete) {
    return {
      categoryCount: taxonomy.countCategories(),
      entryCount: taxonomy.countEntries(),
      aliasCount: aliasesBefore,
      aliasesSeeded: 0,
    };
  }

  const seed = database.transaction(() => {
    for (const category of ADULT_TAXONOMY_CATEGORIES) {
      taxonomy.upsertCategory(category);
    }

    for (const definition of ADULT_TAXONOMY_ENTRIES) {
      canonicalTags.upsert({
        tag: definition.tag,
        displayName: definition.displayName,
        category: definition.legacyCategory,
        isFilterable: definition.visibleInFilters ?? true,
        isRankable: definition.isRankable ?? true,
        source: "system",
      });
    }

    for (const definition of ADULT_TAXONOMY_ENTRIES) {
      aliases.insertSystemIfMissing(definition.tag, definition.tag);
      for (const alias of definition.aliases) {
        aliases.insertSystemIfMissing(definition.tag, alias);
      }
    }

    for (const definition of ADULT_TAXONOMY_ENTRIES) {
      taxonomy.upsertEntry({
        tag: definition.tag,
        categoryId: definition.categoryId,
        adultEvidence: definition.adultEvidence,
        safetyRole: definition.safetyRole,
        description: definition.description,
        visibleInFilters: definition.visibleInFilters ?? true,
        enabled: definition.enabled ?? true,
        impliedTags: [...(definition.impliedTags ?? [])],
      });
    }
  });

  seed();
  const aliasCount = aliases.count();
  return {
    categoryCount: taxonomy.countCategories(),
    entryCount: taxonomy.countEntries(),
    aliasCount,
    aliasesSeeded: Math.max(0, aliasCount - aliasesBefore),
  };
}
