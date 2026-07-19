import type Database from "better-sqlite3";

import { fetchItchRssSource } from "../acquisition/fetchRssSource";
import { normalizeItchRssEntry } from "../acquisition/normalizeRssEntry";
import { parseItchRssSource } from "../acquisition/parseRssSource";
import type {
  FetchItchRssSource,
  ItchRssSourceRefreshResult,
  RefreshItchRssDiscoveryOptions,
  RefreshItchRssDiscoveryResult,
} from "../acquisition/types";
import { getItchDiscoveryDatabase } from "../database/client";
import { ItchRssError } from "../errors";
import {
  ItchDiscoveryRepository,
  ItchGameRepository,
  ItchRefreshRunRepository,
  ItchSourceRepository,
} from "../repositories";
import type { ItchRefreshRun, ItchSource } from "../types";
import { bootstrapItchDiscovery } from "./bootstrapItchDiscovery";
import { bootstrapItchRssSources } from "./bootstrapItchRssSources";

export type RefreshItchRssDiscoveryDependencies = {
  database?: Database.Database;
  fetchSource?: FetchItchRssSource;
  sleep?: (milliseconds: number) => Promise<void>;
};

export async function refreshItchRssDiscovery(
  options: RefreshItchRssDiscoveryOptions = {},
  dependencies: RefreshItchRssDiscoveryDependencies = {},
): Promise<RefreshItchRssDiscoveryResult> {
  const database = dependencies.database ?? getItchDiscoveryDatabase();
  const fetchSource = dependencies.fetchSource ?? ((source) => fetchItchRssSource(source));
  const trigger = options.trigger ?? "manual";
  const force = options.force ?? trigger === "manual";
  const now = options.now ?? new Date();
  const maxEntriesPerSource = clampInteger(options.maxEntriesPerSource ?? 100, 1, 500);
  const requestDelayMs = clampInteger(
    options.requestDelayMs ?? (dependencies.fetchSource ? 0 : 150),
    0,
    5_000,
  );
  const sleep = dependencies.sleep ?? defaultSleep;

  bootstrapItchDiscovery(database);
  bootstrapItchRssSources(database);

  const games = new ItchGameRepository(database);
  const discoveries = new ItchDiscoveryRepository(database);
  const sources = new ItchSourceRepository(database);
  const refreshRuns = new ItchRefreshRunRepository(database);
  const run = refreshRuns.start(trigger);

  const selectedSourceIds = options.sourceIds ? new Set(options.sourceIds) : null;
  const configuredSources = sources
    .listEnabled()
    .filter((source) => !selectedSourceIds || selectedSourceIds.has(source.id));

  const sourceResults: ItchRssSourceRefreshResult[] = [];
  const uniqueCanonicalUrls = new Set<string>();
  const errors: Array<Record<string, unknown>> = [];
  let sourcesAttempted = 0;
  let sourcesSucceeded = 0;
  let entriesScanned = 0;
  let newGamesAdded = 0;
  let gamesUpdated = 0;
  let gamesRejected = 0;

  for (const source of configuredSources) {
    if (!force && !isSourceDue(source, now)) {
      sourceResults.push(createSkippedResult(source));
      continue;
    }

    sourcesAttempted += 1;

    try {
      const fetchResult = await fetchSource(source);

      if (fetchResult.status === "not-modified") {
        sources.recordFetchSuccess(source.id, {
          etag: fetchResult.etag,
          lastModified: fetchResult.lastModified,
        });
        sourcesSucceeded += 1;
        sourceResults.push({
          sourceId: source.id,
          sourceName: source.name,
          sourceUrl: source.sourceUrl,
          status: "not-modified",
          entriesScanned: 0,
          acceptedEntries: 0,
          rejectedEntries: 0,
          newGamesAdded: 0,
          existingGamesTouched: 0,
          discoveriesCreated: 0,
        });
        continue;
      }

      const feed = parseItchRssSource(fetchResult.body);
      const sourceResult: ItchRssSourceRefreshResult = {
        sourceId: source.id,
        sourceName: source.name,
        sourceUrl: source.sourceUrl,
        status: "fetched",
        entriesScanned: 0,
        acceptedEntries: 0,
        rejectedEntries: 0,
        newGamesAdded: 0,
        existingGamesTouched: 0,
        discoveriesCreated: 0,
      };
      const canonicalUrlsInSource = new Set<string>();

      for (const [index, entry] of feed.entries.slice(0, maxEntriesPerSource).entries()) {
        entriesScanned += 1;
        sourceResult.entriesScanned += 1;

        const normalized = normalizeItchRssEntry(source, entry);
        if (!normalized || canonicalUrlsInSource.has(normalized.canonicalUrl)) {
          gamesRejected += 1;
          sourceResult.rejectedEntries += 1;
          continue;
        }

        canonicalUrlsInSource.add(normalized.canonicalUrl);
        uniqueCanonicalUrls.add(normalized.canonicalUrl);

        const upserted = games.upsertDiscovered({
          canonicalUrl: normalized.canonicalUrl,
          title: normalized.title,
          rawTitle: normalized.rawTitle,
          creatorName: normalized.creatorName,
          shortDescription: normalized.shortDescription,
          coverImageUrl: normalized.coverImageUrl,
          price: normalized.inferredPrice,
          platforms: normalized.inferredPlatforms,
          tags: normalized.categories,
          publishedAt: normalized.publishedAt,
          sourceUpdatedAt: normalized.sourceUpdatedAt,
          discoveredAt: fetchResult.fetchedAt,
        });

        if (upserted.created) {
          newGamesAdded += 1;
          sourceResult.newGamesAdded += 1;
        } else {
          sourceResult.existingGamesTouched += 1;
          if (upserted.changed) {
            gamesUpdated += 1;
          }
        }

        const discovery = discoveries.createIfMissingWithStatus({
          gameId: upserted.game.id,
          sourceId: source.id,
          discoveredAt: fetchResult.fetchedAt,
          sourcePosition: index + 1,
          sourceTitle: normalized.rawTitle,
          sourceGuid: normalized.sourceGuid,
          dedupeKey: normalized.dedupeKey,
        });

        if (discovery.created) {
          sourceResult.discoveriesCreated += 1;
        }

        sourceResult.acceptedEntries += 1;
      }

      sources.recordFetchSuccess(source.id, {
        etag: fetchResult.etag,
        lastModified: fetchResult.lastModified,
      });
      sourcesSucceeded += 1;
      sourceResults.push(sourceResult);
    } catch (error) {
      const serialized = serializeSourceError(source, error);
      sources.recordFetchFailure(source.id, serialized.message);
      errors.push(serialized);
      sourceResults.push({
        sourceId: source.id,
        sourceName: source.name,
        sourceUrl: source.sourceUrl,
        status: "failed",
        entriesScanned: 0,
        acceptedEntries: 0,
        rejectedEntries: 0,
        newGamesAdded: 0,
        existingGamesTouched: 0,
        discoveriesCreated: 0,
        error: {
          name: String(serialized.errorName),
          message: String(serialized.message),
          code: serialized.code ? String(serialized.code) : undefined,
          statusCode:
            typeof serialized.statusCode === "number"
              ? serialized.statusCode
              : undefined,
        },
      });
    }

    if (requestDelayMs > 0 && source !== configuredSources.at(-1)) {
      await sleep(requestDelayMs);
    }
  }

  const status = determineRunStatus(sourcesAttempted, sourcesSucceeded);
  const finishedRun = refreshRuns.finish(run.id, {
    status,
    sourcesAttempted,
    sourcesSucceeded,
    entriesScanned,
    uniqueGamesFound: uniqueCanonicalUrls.size,
    newGamesAdded,
    gamesUpdated,
    gamesEnriched: 0,
    gamesRejected,
    recommendationsCreated: 0,
    errors,
  });

  if (!finishedRun) {
    throw new Error(`Failed to finish itch.io RSS refresh run: ${run.id}`);
  }

  return {
    run: finishedRun,
    sources: sourceResults,
  };
}

function isSourceDue(source: ItchSource, now: Date): boolean {
  if (!source.lastSuccessAt) {
    return true;
  }

  const lastSuccess = Date.parse(source.lastSuccessAt);
  if (Number.isNaN(lastSuccess)) {
    return true;
  }

  const intervalMs = source.refreshIntervalHours * 60 * 60 * 1_000;
  return now.getTime() - lastSuccess >= intervalMs;
}

function createSkippedResult(source: ItchSource): ItchRssSourceRefreshResult {
  return {
    sourceId: source.id,
    sourceName: source.name,
    sourceUrl: source.sourceUrl,
    status: "skipped",
    entriesScanned: 0,
    acceptedEntries: 0,
    rejectedEntries: 0,
    newGamesAdded: 0,
    existingGamesTouched: 0,
    discoveriesCreated: 0,
  };
}

type SerializedSourceError = {
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  errorName: string;
  message: string;
  code?: string;
  statusCode?: number;
};

function serializeSourceError(
  source: ItchSource,
  error: unknown,
): SerializedSourceError {
  const base = {
    sourceId: source.id,
    sourceName: source.name,
    sourceUrl: source.sourceUrl,
  };

  if (error instanceof ItchRssError) {
    return {
      ...base,
      errorName: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
    };
  }

  if (error instanceof Error) {
    return {
      ...base,
      errorName: error.name,
      message: error.message,
    };
  }

  return {
    ...base,
    errorName: "UnknownError",
    message: String(error),
  };
}

function determineRunStatus(
  sourcesAttempted: number,
  sourcesSucceeded: number,
): "completed" | "partial" | "failed" {
  if (sourcesAttempted === 0 || sourcesSucceeded === sourcesAttempted) {
    return "completed";
  }

  return sourcesSucceeded > 0 ? "partial" : "failed";
}

function clampInteger(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, Math.floor(value)));
}

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
