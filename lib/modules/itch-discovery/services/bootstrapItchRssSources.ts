import type Database from "better-sqlite3";

import { getItchDiscoveryDatabase } from "../database/client";
import { ItchSourceRepository } from "../repositories";
import { canonicalizeItchFeedUrl } from "../acquisition/canonicalizeItchUrl";
import {
  DEFAULT_ITCH_RSS_SOURCES,
  LEGACY_GENERAL_ITCH_RSS_SOURCES,
} from "../acquisition/sourceCatalog";
import type { ItchRssSourceDefinition } from "../acquisition/types";

export type BootstrapItchRssSourcesResult = {
  configured: number;
  enabled: number;
  sourceIds: string[];
};

export function bootstrapItchRssSources(
  database: Database.Database = getItchDiscoveryDatabase(),
  definitions: ItchRssSourceDefinition[] = DEFAULT_ITCH_RSS_SOURCES,
): BootstrapItchRssSourcesResult {
  const sources = new ItchSourceRepository(database);
  const sourceIds: string[] = [];

  if (definitions === DEFAULT_ITCH_RSS_SOURCES) {
    const disable = database.prepare(
      `UPDATE itch_sources
       SET enabled = 0, updated_at = ?
       WHERE source_url = ? AND name = ?`,
    );
    const timestamp = new Date().toISOString();
    for (const legacySource of LEGACY_GENERAL_ITCH_RSS_SOURCES) {
      disable.run(timestamp, legacySource.sourceUrl, legacySource.name);
    }
  }

  for (const definition of definitions) {
    const source = sources.upsert({
      ...definition,
      sourceUrl: canonicalizeItchFeedUrl(definition.sourceUrl),
    });
    sourceIds.push(source.id);
  }

  return {
    configured: sourceIds.length,
    enabled: definitions.filter((source) => source.enabled).length,
    sourceIds,
  };
}
