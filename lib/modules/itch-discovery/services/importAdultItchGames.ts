import type Database from "better-sqlite3";

import { canonicalizeItchProjectUrl, inferCreatorNameFromProjectUrl } from "../acquisition/canonicalizeItchUrl";
import { getItchDiscoveryDatabase } from "../database/client";
import { ItchGameRepository } from "../repositories";
import { classifyItchAdultCatalogue } from "./classifyItchAdultCatalogue";
import { enrichItchGames } from "./enrichItchGames";

export type ImportAdultItchGamesResult = {
  accepted: number;
  rejected: Array<{ value: string; reason: string }>;
  gameIds: string[];
  enrichment: Awaited<ReturnType<typeof enrichItchGames>>;
  classification: ReturnType<typeof classifyItchAdultCatalogue>;
};

export async function importAdultItchGames(
  values: string[],
  database: Database.Database = getItchDiscoveryDatabase(),
): Promise<ImportAdultItchGamesResult> {
  const games = new ItchGameRepository(database);
  const unique = [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  const rejected: ImportAdultItchGamesResult["rejected"] = [];
  const gameIds: string[] = [];

  for (const value of unique.slice(0, 500)) {
    const canonicalUrl = canonicalizeItchProjectUrl(value);
    if (!canonicalUrl) {
      rejected.push({ value, reason: "Not a valid public itch.io project URL." });
      continue;
    }
    const slug = new URL(canonicalUrl).pathname.split("/").filter(Boolean)[0] ?? "Imported itch.io game";
    const title = slug.split(/[-_]+/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
    const result = games.upsertDiscovered({
      canonicalUrl,
      title,
      creatorName: inferCreatorNameFromProjectUrl(canonicalUrl),
      tags: ["adult"],
    });
    games.updateAdultClassification({
      gameId: result.game.id,
      status: "adult",
      confidence: 0.9,
      reasons: ["manual-adult-url-import"],
      contentTags: ["adult"],
      isNsfw: true,
    });
    gameIds.push(result.game.id);
  }

  const enrichment = await enrichItchGames(
    { gameIds, limit: Math.max(1, Math.min(100, gameIds.length)), requestDelayMs: 400, includeFailed: true },
    { database },
  );
  const classification = classifyItchAdultCatalogue(database);
  return { accepted: gameIds.length, rejected, gameIds, enrichment, classification };
}
