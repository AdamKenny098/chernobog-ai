import type Database from "better-sqlite3";

import { getItchDiscoveryDatabase } from "../database/client";
import { ItchGameRepository } from "../repositories";
import { bootstrapItchDiscovery } from "./bootstrapItchDiscovery";

export type RepairItchEmbeddedMetadataResult = {
  scanned: number;
  changed: number;
  titlesCleaned: number;
  pricesRecovered: number;
  platformsRecovered: number;
  tagsAdded: number;
  coversQueuedForRefresh: number;
  unchanged: number;
};

export function repairItchEmbeddedMetadata(
  database: Database.Database = getItchDiscoveryDatabase(),
): RepairItchEmbeddedMetadataResult {
  bootstrapItchDiscovery(database);

  const games = new ItchGameRepository(database);
  const catalogue = games.listAll();
  const result: RepairItchEmbeddedMetadataResult = {
    scanned: catalogue.length,
    changed: 0,
    titlesCleaned: 0,
    pricesRecovered: 0,
    platformsRecovered: 0,
    tagsAdded: 0,
    coversQueuedForRefresh: 0,
    unchanged: 0,
  };

  for (const before of catalogue) {
    const repaired = games.repairEmbeddedMetadata(before.id);
    const after = repaired.game;

    if (!repaired.changed) {
      result.unchanged += 1;
      continue;
    }

    result.changed += 1;
    if (before.title !== after.title) {
      result.titlesCleaned += 1;
    }
    if (before.price.kind === "unknown" && after.price.kind !== "unknown") {
      result.pricesRecovered += 1;
    }
    if (
      Object.values(before.platforms).filter(Boolean).length <
      Object.values(after.platforms).filter(Boolean).length
    ) {
      result.platformsRecovered += 1;
    }
    result.tagsAdded += after.tags.filter((tag) => !before.tags.includes(tag)).length;
    if (repaired.markedForEnrichment) {
      result.coversQueuedForRefresh += 1;
    }
  }

  return result;
}
