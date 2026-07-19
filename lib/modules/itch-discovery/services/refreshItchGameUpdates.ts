import type Database from "better-sqlite3";

import { fetchItchRssSource } from "../acquisition/fetchRssSource";
import type { ItchRssFetchResult } from "../acquisition/types";
import { getItchDiscoveryDatabase } from "../database/client";
import { ItchRssError } from "../errors";
import {
  ItchGameRepository,
  ItchNotificationRepository,
  ItchUpdateRepository,
  ItchUpdateWatchRunRepository,
  ItchWatchRepository,
} from "../repositories";
import type {
  ItchGame,
  ItchGameWatch,
  ItchWatchRefreshItemResult,
  RefreshItchGameUpdatesOptions,
  RefreshItchGameUpdatesResult,
} from "../types";
import { buildItchDevlogFeedUrl, parseItchDevlogFeed } from "../updates/devlogFeed";
import { detectItchSnapshotChanges } from "../updates/detectSnapshotChanges";
import { buildItchUpdateNotification } from "../updates/notificationFactory";
import { bootstrapItchDiscovery } from "./bootstrapItchDiscovery";
import { enrichItchGames } from "./enrichItchGames";

export type RefreshItchGameUpdatesDependencies = {
  database?: Database.Database;
  fetchDevlog?: (watch: ItchGameWatch, game: ItchGame) => Promise<ItchRssFetchResult>;
  enrichWatchedGames?: (gameIds: string[], now: Date) => Promise<void>;
  sleep?: (milliseconds: number) => Promise<void>;
  clock?: () => Date;
};

export async function refreshItchGameUpdates(
  options: RefreshItchGameUpdatesOptions = {},
  dependencies: RefreshItchGameUpdatesDependencies = {},
): Promise<RefreshItchGameUpdatesResult> {
  const database = dependencies.database ?? getItchDiscoveryDatabase();
  bootstrapItchDiscovery(database);
  const games = new ItchGameRepository(database);
  const watches = new ItchWatchRepository(database);
  const updates = new ItchUpdateRepository(database);
  const notifications = new ItchNotificationRepository(database);
  const runs = new ItchUpdateWatchRunRepository(database);
  const clock = dependencies.clock ?? (() => new Date());
  const now = options.now ?? clock();
  const run = runs.start(options.trigger ?? "manual", now.toISOString());
  const sleep = dependencies.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const delay = clamp(options.requestDelayMs ?? 350, 0, 10_000);

  const automaticWatchesCreated = syncAutomaticWatches(database, watches);
  let selected = watches.listEnabled(options.limit ?? 100, options.gameIds);

  if ((options.enrichMetadata ?? true) && selected.length) {
    const ids = selected.map((watch) => watch.gameId);
    if (dependencies.enrichWatchedGames) {
      await dependencies.enrichWatchedGames(ids, now);
    } else {
      await enrichItchGames(
        {
          gameIds: ids,
          limit: ids.length,
          staleAfterHours: options.metadataStaleAfterHours ?? 24,
          includeFailed: false,
          requestDelayMs: delay,
          now,
        },
        { database, clock: () => now },
      );
    }
    selected = watches.listEnabled(options.limit ?? 100, options.gameIds);
  }

  const items: ItchWatchRefreshItemResult[] = [];
  const errors: Array<Record<string, unknown>> = [];

  for (const [index, watch] of selected.entries()) {
    const game = games.findById(watch.gameId);
    if (!game) continue;
    try {
      const item = await refreshOneWatch({
        game,
        watch,
        watches,
        updates,
        notifications,
        fetchDevlog: dependencies.fetchDevlog ?? defaultFetchDevlog,
        now,
      });
      items.push(item);
    } catch (error) {
      const serialized = serializeError(error);
      errors.push({ gameId: game.id, title: game.title, ...serialized });
      watches.updatePollState(game.id, {
        lastCheckedAt: now.toISOString(),
        lastError: serialized.message,
        lastErrorAt: now.toISOString(),
      });
      items.push({
        watchId: watch.id,
        gameId: game.id,
        title: game.title,
        status: "failed",
        historicalDevlogsStored: 0,
        newDevlogs: 0,
        snapshotsCompared: 0,
        changeEventsCreated: 0,
        notificationsCreated: 0,
        error: serialized,
      });
    }
    if (delay > 0 && index < selected.length - 1) await sleep(delay);
  }

  const watchesSucceeded = items.filter((item) => item.status !== "failed").length;
  const finished = runs.finish(run.id, {
    status: errors.length === 0 ? "completed" : watchesSucceeded > 0 ? "partial" : "failed",
    finishedAt: clock().toISOString(),
    watchesAttempted: selected.length,
    watchesSucceeded,
    devlogEntriesScanned: items.reduce((sum, item) => sum + item.historicalDevlogsStored + item.newDevlogs, 0),
    devlogEntriesAdded: items.reduce((sum, item) => sum + item.historicalDevlogsStored + item.newDevlogs, 0),
    snapshotsCompared: items.reduce((sum, item) => sum + item.snapshotsCompared, 0),
    changeEventsCreated: items.reduce((sum, item) => sum + item.changeEventsCreated, 0),
    notificationsCreated: items.reduce((sum, item) => sum + item.notificationsCreated, 0),
    errors,
  });

  return { run: finished, items, automaticWatchesCreated };
}

async function refreshOneWatch(input: {
  game: ItchGame;
  watch: ItchGameWatch;
  watches: ItchWatchRepository;
  updates: ItchUpdateRepository;
  notifications: ItchNotificationRepository;
  fetchDevlog: (watch: ItchGameWatch, game: ItchGame) => Promise<ItchRssFetchResult>;
  now: Date;
}): Promise<ItchWatchRefreshItemResult> {
  const { game, watch, watches, updates, notifications, now } = input;
  let historicalDevlogsStored = 0;
  let newDevlogs = 0;
  let changeEventsCreated = 0;
  let notificationsCreated = 0;
  let status: ItchWatchRefreshItemResult["status"] = "checked";
  const feedUrl = watch.devlogFeedUrl ?? buildItchDevlogFeedUrl(game.canonicalUrl);
  let etag = watch.devlogEtag;
  let lastModified = watch.devlogLastModified;
  let initializedAt = watch.devlogInitializedAt;

  if (watch.watchDevlogs) {
    try {
      const fetched = await input.fetchDevlog({ ...watch, devlogFeedUrl: feedUrl }, game);
      etag = fetched.etag ?? etag;
      lastModified = fetched.lastModified ?? lastModified;
      if (fetched.status === "not-modified") {
        status = "not-modified";
        initializedAt ??= now.toISOString();
      } else {
        const entries = parseItchDevlogFeed(fetched.body);
        const baseline = !initializedAt;
        for (const entry of entries) {
          const inserted = updates.insertDevlogEntryIfMissing({ gameId: game.id, ...entry, firstSeenAt: now.toISOString() });
          if (!inserted.created) continue;
          if (baseline) {
            historicalDevlogsStored += 1;
            continue;
          }
          newDevlogs += 1;
          const type = entry.postType === "major-update" ? "major-update" : "devlog";
          const created = updates.insertChangeEventIfMissing({
            gameId: game.id,
            type,
            confidence: "confirmed",
            summary: `${game.title} published ${entry.postType === "major-update" ? "a major update" : "a new devlog"}: ${entry.title}`,
            after: { title: entry.title, postType: entry.postType, publishedAt: entry.publishedAt },
            sourceUrl: entry.entryUrl,
            dedupeKey: `devlog:${game.id}:${entry.contentHash}`,
            detectedAt: now.toISOString(),
          });
          if (created.created) changeEventsCreated += 1;
          const payload = buildItchUpdateNotification(game, created.event);
          const notification = notifications.insertIfMissing({
            changeEventId: created.event.id,
            gameId: game.id,
            ...payload,
          });
          if (notification.created) notificationsCreated += 1;
        }
        if (baseline) {
          initializedAt = now.toISOString();
          status = "baseline";
        }
      }
    } catch (error) {
      if (error instanceof ItchRssError && error.statusCode === 404) {
        status = "no-devlog-feed";
      } else {
        throw error;
      }
    }
  }

  let snapshotsCompared = 0;
  const latest = updates.getLatestSnapshot(game.id);
  let lastSnapshotId = watch.lastSnapshotId;
  if (latest && !lastSnapshotId) {
    lastSnapshotId = latest.id;
    if (status === "checked") status = "baseline";
  } else if (latest && latest.id !== lastSnapshotId) {
    const before = lastSnapshotId ? updates.findSnapshotById(lastSnapshotId) : null;
    if (before) {
      snapshotsCompared = 1;
      for (const detected of detectItchSnapshotChanges({ game, watch, before, after: latest })) {
        const created = updates.insertChangeEventIfMissing({
          gameId: game.id,
          type: detected.type,
          confidence: detected.confidence,
          summary: detected.summary,
          before: detected.before,
          after: detected.after,
          sourceUrl: game.canonicalUrl,
          dedupeKey: detected.dedupeKey,
          detectedAt: now.toISOString(),
        });
        if (created.created) changeEventsCreated += 1;
        const payload = buildItchUpdateNotification(game, created.event);
        const notification = notifications.insertIfMissing({ changeEventId: created.event.id, gameId: game.id, ...payload });
        if (notification.created) notificationsCreated += 1;
      }
    }
    lastSnapshotId = latest.id;
  }

  watches.updatePollState(game.id, {
    lastCheckedAt: now.toISOString(),
    devlogFeedUrl: feedUrl,
    devlogEtag: etag ?? null,
    devlogLastModified: lastModified ?? null,
    devlogInitializedAt: initializedAt,
    lastSnapshotId: lastSnapshotId ?? null,
    lastSuccessAt: now.toISOString(),
    lastError: null,
    lastErrorAt: null,
  });

  return {
    watchId: watch.id,
    gameId: game.id,
    title: game.title,
    status,
    historicalDevlogsStored,
    newDevlogs,
    snapshotsCompared,
    changeEventsCreated,
    notificationsCreated,
  };
}

function syncAutomaticWatches(database: Database.Database, watches: ItchWatchRepository): number {
  const rows = database.prepare(
    `SELECT DISTINCT game_id, state FROM itch_recommendations
     WHERE state IN ('saved', 'played')`,
  ).all() as Array<{ game_id: string; state: "saved" | "played" }>;
  let created = 0;
  for (const row of rows) {
    if (watches.findByGameId(row.game_id)) continue;
    watches.upsert({
      gameId: row.game_id,
      watchReason: row.state,
      watchDevlogs: true,
      watchPrice: true,
      watchMetadata: false,
      watchPlatforms: true,
      watchSale: true,
      enabled: true,
    });
    created += 1;
  }
  return created;
}

async function defaultFetchDevlog(watch: ItchGameWatch, game: ItchGame): Promise<ItchRssFetchResult> {
  const source = {
    id: `devlog-${game.id}`,
    name: `${game.title} devlog`,
    sourceType: "rss" as const,
    sourceUrl: watch.devlogFeedUrl ?? buildItchDevlogFeedUrl(game.canonicalUrl),
    enabled: true,
    priority: 50,
    refreshIntervalHours: 24,
    etag: watch.devlogEtag,
    lastModified: watch.devlogLastModified,
    createdAt: watch.createdAt,
    updatedAt: watch.updatedAt,
  };
  return fetchItchRssSource(source);
}

function serializeError(error: unknown): { name: string; message: string; code?: string; statusCode?: number } {
  if (error instanceof ItchRssError) return { name: error.name, message: error.message, code: error.code, statusCode: error.statusCode };
  if (error instanceof Error) return { name: error.name, message: error.message };
  return { name: "UnknownError", message: String(error) };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.floor(value)));
}
