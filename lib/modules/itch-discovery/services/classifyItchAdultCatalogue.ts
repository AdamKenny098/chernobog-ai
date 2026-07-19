import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";

import { getItchDiscoveryDatabase } from "../database/client";
import { classifyItchAdultGame } from "../domain/adultClassification";
import { ItchAdultSettingsRepository, ItchGameRepository } from "../repositories";
import type { ClassifyItchAdultCatalogueResult, ItchAdultClassificationRun } from "../types";

export function classifyItchAdultCatalogue(
  database: Database.Database = getItchDiscoveryDatabase(),
): ClassifyItchAdultCatalogueResult {
  const startedAt = new Date().toISOString();
  const settings = new ItchAdultSettingsRepository(database).ensureDefault();
  const games = new ItchGameRepository(database);
  const all = games.listAll();
  const counts = { adult: 0, nonAdult: 0, unknown: 0, blocked: 0 };
  let changed = 0;

  const transaction = database.transaction(() => {
    for (const game of all) {
      const result = classifyItchAdultGame(game, settings);
      if (
        game.adultStatus !== result.status ||
        game.adultConfidence !== result.confidence ||
        JSON.stringify(game.adultReasons ?? []) !== JSON.stringify(result.reasons) ||
        JSON.stringify(game.adultContentTags ?? []) !== JSON.stringify(result.contentTags)
      ) changed += 1;
      games.updateAdultClassification({
        gameId: game.id,
        status: result.status,
        confidence: result.confidence,
        reasons: result.reasons,
        contentTags: result.contentTags,
        isNsfw: result.status === "adult" ? true : undefined,
      });
      if (result.status === "adult") counts.adult += 1;
      else if (result.status === "non-adult") counts.nonAdult += 1;
      else if (result.status === "blocked") counts.blocked += 1;
      else counts.unknown += 1;
    }
  });
  transaction();

  const finishedAt = new Date().toISOString();
  const run: ItchAdultClassificationRun = {
    id: `itch_adult_run_${randomUUID()}`,
    startedAt, finishedAt, gamesScanned: all.length,
    adult: counts.adult, nonAdult: counts.nonAdult, unknown: counts.unknown, blocked: counts.blocked,
  };
  database.prepare(
    `INSERT INTO itch_adult_classification_runs (
      id, started_at, finished_at, games_scanned, adult_count, non_adult_count, unknown_count, blocked_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(run.id, run.startedAt, run.finishedAt, run.gamesScanned, run.adult, run.nonAdult, run.unknown, run.blocked);
  return { run, changed };
}
