import type Database from "better-sqlite3";

import { extractItchProjectMetadata, hashItchText } from "../acquisition/extractProjectMetadata";
import { fetchItchProjectPage } from "../acquisition/fetchProjectPage";
import type {
  EnrichItchGamesOptions,
  EnrichItchGamesResult,
  FetchItchProjectPage,
  ItchProjectEnrichmentItemResult,
} from "../acquisition/types";
import { getItchDiscoveryDatabase } from "../database/client";
import { resolveItchEnrichmentWarnings } from "../domain/metadataQuality";
import { ItchProjectPageError } from "../errors";
import {
  ItchGameRepository,
  ItchUpdateRepository,
} from "../repositories";
import type { ItchGame } from "../types";
import { bootstrapItchDiscovery } from "./bootstrapItchDiscovery";

export type EnrichItchGamesDependencies = {
  database?: Database.Database;
  fetchPage?: FetchItchProjectPage;
  sleep?: (milliseconds: number) => Promise<void>;
  clock?: () => Date;
};

export async function enrichItchGames(
  options: EnrichItchGamesOptions = {},
  dependencies: EnrichItchGamesDependencies = {},
): Promise<EnrichItchGamesResult> {
  const database = dependencies.database ?? getItchDiscoveryDatabase();
  const fetchPage =
    dependencies.fetchPage ?? ((url) => fetchItchProjectPage(url));
  const sleep = dependencies.sleep ?? defaultSleep;
  const clock = dependencies.clock ?? (() => new Date());
  const startedAt = (options.now ?? clock()).toISOString();
  const limit = clampInteger(options.limit ?? 40, 1, 100);
  const staleAfterHours = clampInteger(
    options.staleAfterHours ?? 7 * 24,
    1,
    24 * 365,
  );
  const requestDelayMs = clampInteger(options.requestDelayMs ?? 400, 0, 10_000);
  const staleBefore = new Date(
    (options.now ?? clock()).getTime() - staleAfterHours * 60 * 60 * 1_000,
  ).toISOString();

  bootstrapItchDiscovery(database);

  const games = new ItchGameRepository(database);
  const updates = new ItchUpdateRepository(database);
  const candidates = selectCandidates(games, options.gameIds, {
    limit,
    staleBefore,
    includeFailed: options.includeFailed ?? false,
  });
  const items: ItchProjectEnrichmentItemResult[] = [];

  for (const [index, candidate] of candidates.entries()) {
    items.push(
      await enrichSingleGame(candidate, games, updates, fetchPage),
    );

    if (requestDelayMs > 0 && index < candidates.length - 1) {
      await sleep(requestDelayMs);
    }
  }

  return {
    attempted: items.length,
    enriched: items.filter((item) => item.status === "enriched").length,
    partial: items.filter((item) => item.status === "partial").length,
    unchanged: items.filter((item) => item.status === "unchanged").length,
    unavailable: items.filter((item) => item.status === "unavailable").length,
    failed: items.filter((item) => item.status === "failed").length,
    snapshotsCreated: items.filter((item) => item.snapshotCreated).length,
    startedAt,
    finishedAt: clock().toISOString(),
    items,
  };
}

async function enrichSingleGame(
  candidate: ItchGame,
  games: ItchGameRepository,
  updates: ItchUpdateRepository,
  fetchPage: FetchItchProjectPage,
): Promise<ItchProjectEnrichmentItemResult> {
  try {
    const fetchResult = await fetchPage(candidate.canonicalUrl);

    if (fetchResult.status === "unavailable") {
      const unavailableGame = games.markUnavailable(
        candidate.id,
        fetchResult.fetchedAt,
      );
      const snapshotCreated = unavailableGame
        ? createSnapshotIfChanged(updates, unavailableGame)
        : false;

      return {
        gameId: candidate.id,
        canonicalUrl: candidate.canonicalUrl,
        title: candidate.title,
        status: "unavailable",
        snapshotCreated,
        warnings: [`project-returned-http-${fetchResult.statusCode}`],
      };
    }

    const metadata = extractItchProjectMetadata({
      sourceUrl: fetchResult.sourceUrl,
      finalUrl: fetchResult.finalUrl,
      fetchedAt: fetchResult.fetchedAt,
      html: fetchResult.body,
      fallbackTitle: candidate.rawTitle ?? candidate.title,
    });
    const applied = games.applyEnrichment(candidate.id, metadata);
    const snapshotCreated = createSnapshotIfChanged(updates, applied.game);

    return {
      gameId: applied.game.id,
      canonicalUrl: applied.game.canonicalUrl,
      title: applied.game.title,
      status:
        applied.game.metadataStatus === "partial"
          ? "partial"
          : applied.changed
            ? "enriched"
            : "unchanged",
      metadataHash: metadata.metadataHash,
      completenessScore: metadata.completenessScore,
      snapshotCreated,
      warnings: resolveItchEnrichmentWarnings(
        metadata.warnings,
        applied.game,
      ),
    };
  } catch (error) {
    games.markEnrichmentFailure(candidate.id);
    const serialized = serializeEnrichmentError(error);

    return {
      gameId: candidate.id,
      canonicalUrl: candidate.canonicalUrl,
      title: candidate.title,
      status: "failed",
      snapshotCreated: false,
      warnings: [],
      error: serialized,
    };
  }
}

function selectCandidates(
  games: ItchGameRepository,
  gameIds: string[] | undefined,
  options: {
    limit: number;
    staleBefore: string;
    includeFailed: boolean;
  },
): ItchGame[] {
  if (!gameIds?.length) {
    return games.listEnrichmentCandidates(options);
  }

  const selected: ItchGame[] = [];
  const seen = new Set<string>();

  for (const gameId of gameIds) {
    if (seen.has(gameId) || selected.length >= options.limit) {
      continue;
    }

    seen.add(gameId);
    const game = games.findById(gameId);
    if (game) {
      selected.push(game);
    }
  }

  return selected;
}

function createSnapshotIfChanged(
  updates: ItchUpdateRepository,
  game: ItchGame,
): boolean {
  const latest = updates.getLatestSnapshot(game.id);
  const metadataHash =
    game.metadataHash ?? `availability:${game.id}:${game.isAvailable ? "1" : "0"}`;

  if (
    latest &&
    latest.metadataHash === metadataHash &&
    latest.availability === game.isAvailable
  ) {
    return false;
  }

  updates.createSnapshot({
    gameId: game.id,
    metadataHash,
    priceText: game.price.displayText,
    isFree: game.price.isFree,
    isOnSale: game.price.isOnSale,
    saleText: game.price.saleText,
    platforms: game.platforms,
    tags: game.tags,
    title: game.title,
    shortDescriptionHash: hashItchText(game.shortDescription),
    availability: game.isAvailable,
    capturedAt: game.lastEnrichedAt ?? new Date().toISOString(),
  });

  return true;
}

function serializeEnrichmentError(error: unknown): {
  name: string;
  message: string;
  code?: string;
  statusCode?: number;
} {
  if (error instanceof ItchProjectPageError) {
    return {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
    };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return {
    name: "UnknownError",
    message: String(error),
  };
}

function clampInteger(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, Math.floor(value)));
}

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
