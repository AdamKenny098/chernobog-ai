import type Database from "better-sqlite3";

import { getItchDiscoveryDatabase } from "../database/client";
import { ItchOperationLockManager } from "../orchestration/itchOperationLock";
import {
  ItchNotificationRepository,
  ItchPipelineRunRepository,
  ItchRefreshRunRepository,
  ItchSourceRepository,
  ItchSchedulerRepository,
  ItchWatchRepository,
} from "../repositories";
import type { ItchDiscoveryStatus } from "../types";
import { bootstrapItchDiscovery } from "./bootstrapItchDiscovery";

const FULL_REFRESH_LOCK = "itch-discovery-full-refresh";

export function getItchDiscoveryStatus(
  database: Database.Database = getItchDiscoveryDatabase(),
  now = new Date(),
): ItchDiscoveryStatus {
  bootstrapItchDiscovery(database);

  const pipelineRuns = new ItchPipelineRunRepository(database);
  const refreshRuns = new ItchRefreshRunRepository(database);
  const notifications = new ItchNotificationRepository(database);
  const watches = new ItchWatchRepository(database);
  const sources = new ItchSourceRepository(database);
  const scheduler = new ItchSchedulerRepository(database).ensureDefault();
  const lock = new ItchOperationLockManager(database).find(FULL_REFRESH_LOCK);
  const latestPipelineRun = pipelineRuns.getLatest() ?? undefined;
  const latestRssRefresh = refreshRuns.getLatest() ?? undefined;

  const catalogueGames = count(database, "SELECT COUNT(*) AS count FROM itch_games");
  const enrichedGames = count(
    database,
    "SELECT COUNT(*) AS count FROM itch_games WHERE metadata_status IN ('partial', 'enriched')",
  );
  const unseenRecommendations = count(
    database,
    "SELECT COUNT(*) AS count FROM itch_recommendations WHERE state = 'unseen'",
  );
  const savedRecommendations = count(
    database,
    "SELECT COUNT(*) AS count FROM itch_recommendations WHERE state = 'saved'",
  );

  const freshnessReference = latestPipelineRun?.finishedAt ?? latestRssRefresh?.finishedAt;
  const staleAfterMs = 36 * 60 * 60 * 1_000;
  let stale = catalogueGames === 0;
  let staleReason = catalogueGames === 0 ? "The local catalogue is empty." : undefined;

  if (!stale && freshnessReference) {
    const timestamp = Date.parse(freshnessReference);
    if (!Number.isNaN(timestamp) && now.getTime() - timestamp > staleAfterMs) {
      stale = true;
      staleReason = "The most recent successful backend refresh is older than 36 hours.";
    }
  } else if (!stale && !freshnessReference) {
    stale = true;
    staleReason = "No completed backend refresh has been recorded yet.";
  }

  const latestFailed = latestPipelineRun?.status === "failed";

  return {
    healthy: !latestFailed && catalogueGames > 0,
    databaseReady: true,
    catalogueGames,
    enrichedGames,
    unseenRecommendations,
    savedRecommendations,
    watchedGames: watches.listAll().filter((watch) => watch.enabled).length,
    unreadNotifications: notifications.countUnread(),
    enabledSources: sources.listEnabled().length,
    latestPipelineRun,
    latestRssRefresh,
    activeLock: lock ?? undefined,
    stale,
    staleReason,
    scheduler,
    generatedAt: now.toISOString(),
  };
}

function count(database: Database.Database, sql: string): number {
  return (database.prepare(sql).get() as { count: number }).count;
}
