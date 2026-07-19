import type Database from "better-sqlite3";
import { canonicalizeItchProjectUrl } from "../acquisition/canonicalizeItchUrl";
import { getItchDiscoveryDatabase } from "../database/client";
import { ItchGameRepository, ItchWatchRepository } from "../repositories";
import type { ItchGame, ItchGameWatch } from "../types";
import { buildItchDevlogFeedUrl } from "../updates/devlogFeed";
import { bootstrapItchDiscovery } from "./bootstrapItchDiscovery";

export type WatchItchGameInput = {
  gameId?: string;
  canonicalUrl?: string;
  title?: string;
  watchMetadata?: boolean;
};

export function watchItchGame(
  input: WatchItchGameInput,
  database: Database.Database = getItchDiscoveryDatabase(),
): { game: ItchGame; watch: ItchGameWatch } {
  bootstrapItchDiscovery(database);
  const games = new ItchGameRepository(database);
  const watches = new ItchWatchRepository(database);
  const game = resolveGame(games, input);
  if (!game) throw new Error("No matching Game Radar project was found.");
  const existing = watches.findByGameId(game.id);
  const watch = watches.upsert({
    gameId: game.id,
    watchReason: "manual",
    watchDevlogs: existing?.watchDevlogs ?? true,
    watchPrice: existing?.watchPrice ?? true,
    watchMetadata: input.watchMetadata ?? existing?.watchMetadata ?? false,
    watchPlatforms: existing?.watchPlatforms ?? true,
    watchSale: existing?.watchSale ?? true,
    enabled: true,
    devlogFeedUrl: existing?.devlogFeedUrl ?? buildItchDevlogFeedUrl(game.canonicalUrl),
    lastCheckedAt: existing?.lastCheckedAt,
    devlogEtag: existing?.devlogEtag,
    devlogLastModified: existing?.devlogLastModified,
    devlogInitializedAt: existing?.devlogInitializedAt,
    lastSnapshotId: existing?.lastSnapshotId,
    lastSuccessAt: existing?.lastSuccessAt,
    lastError: existing?.lastError,
    lastErrorAt: existing?.lastErrorAt,
  });
  return { game, watch };
}

export function unwatchItchGame(
  input: WatchItchGameInput,
  database: Database.Database = getItchDiscoveryDatabase(),
): { game: ItchGame; watch: ItchGameWatch } {
  const games = new ItchGameRepository(database);
  const watches = new ItchWatchRepository(database);
  const game = resolveGame(games, input);
  if (!game) throw new Error("No matching Game Radar project was found.");
  const watch = watches.setEnabled(game.id, false);
  if (!watch) throw new Error(`${game.title} is not currently watched.`);
  return { game, watch };
}

function resolveGame(games: ItchGameRepository, input: WatchItchGameInput): ItchGame | null {
  if (input.gameId) return games.findById(input.gameId);
  if (input.canonicalUrl) {
    const canonical = canonicalizeItchProjectUrl(input.canonicalUrl);
    return canonical ? games.findByCanonicalUrl(canonical) : null;
  }
  if (input.title) {
    const query = input.title.trim().toLowerCase();
    const exact = games.listAll().filter((game) => game.title.toLowerCase() === query);
    if (exact.length === 1) return exact[0];
    const partial = games.listAll().filter((game) => game.title.toLowerCase().includes(query));
    if (partial.length === 1) return partial[0];
    if (partial.length > 1) throw new Error(`Multiple games matched "${input.title}". Use --game-id or --url.`);
  }
  return null;
}
