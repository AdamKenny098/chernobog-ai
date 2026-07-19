import type Database from "better-sqlite3";

import type {
  EnrichItchGamesResult,
  RefreshItchRssDiscoveryResult,
} from "../acquisition/types";
import { getItchDiscoveryDatabase } from "../database/client";
import { ItchPipelineLockedError } from "../errors";
import { ItchOperationLockManager } from "../orchestration/itchOperationLock";
import {
  ItchGameRepository,
  ItchPipelineRunRepository,
} from "../repositories";
import type {
  BuildItchNotificationDigestResult,
  BuildItchRecommendationBatchResult,
  ItchPipelineError,
  ItchPipelinePhaseResult,
  NormalizeExistingItchTagsResult,
  RefreshItchGameUpdatesResult,
  RunItchDiscoveryPipelineInput,
  RunItchDiscoveryPipelineResult,
} from "../types";
import { getRecommendationBatchDate } from "../ranking/batchDate";
import { bootstrapItchDiscovery } from "./bootstrapItchDiscovery";
import { buildItchNotificationDigest } from "./buildItchNotificationDigest";
import { buildItchRecommendationBatch } from "./buildItchRecommendationBatch";
import { classifyItchAdultCatalogue } from "./classifyItchAdultCatalogue";
import { enrichItchGames } from "./enrichItchGames";
import { normalizeExistingItchTags } from "./normalizeExistingItchTags";
import { reclassifyItchAdultTaxonomy } from "./reclassifyItchAdultTaxonomy";
import { repairItchEmbeddedMetadata } from "./repairItchEmbeddedMetadata";
import { refreshItchGameUpdates } from "./refreshItchGameUpdates";
import { refreshItchRssDiscovery } from "./refreshItchRssDiscovery";

const PIPELINE_LOCK_NAME = "itch-discovery-full-refresh";

export type RunItchDiscoveryPipelineDependencies = {
  database?: Database.Database;
  clock?: () => Date;
  refreshDiscovery?: (
    input: RunItchDiscoveryPipelineInput,
    database: Database.Database,
  ) => Promise<RefreshItchRssDiscoveryResult>;
  enrich?: (
    input: RunItchDiscoveryPipelineInput,
    database: Database.Database,
  ) => Promise<EnrichItchGamesResult>;
  normalize?: (
    input: RunItchDiscoveryPipelineInput,
    database: Database.Database,
  ) => NormalizeExistingItchTagsResult;
  rank?: (
    input: RunItchDiscoveryPipelineInput,
    database: Database.Database,
  ) => BuildItchRecommendationBatchResult;
  refreshUpdates?: (
    input: RunItchDiscoveryPipelineInput,
    database: Database.Database,
  ) => Promise<RefreshItchGameUpdatesResult>;
  buildDigest?: (
    input: RunItchDiscoveryPipelineInput,
    database: Database.Database,
  ) => BuildItchNotificationDigestResult;
};

export async function runItchDiscoveryPipeline(
  input: RunItchDiscoveryPipelineInput = {},
  dependencies: RunItchDiscoveryPipelineDependencies = {},
): Promise<RunItchDiscoveryPipelineResult> {
  const database = dependencies.database ?? getItchDiscoveryDatabase();
  bootstrapItchDiscovery(database);

  const clock = dependencies.clock ?? (() => new Date());
  const now = input.now ?? clock();
  const trigger = input.trigger ?? "manual";
  const lockManager = new ItchOperationLockManager(database);
  const lock = lockManager.acquire(PIPELINE_LOCK_NAME, {
    now,
    ttlMs: 60 * 60_000,
  });

  if (!lock) {
    const active = lockManager.find(PIPELINE_LOCK_NAME);
    if (!active) {
      throw new Error("Game Radar pipeline lock could not be acquired.");
    }
    throw new ItchPipelineLockedError(active);
  }

  const runs = new ItchPipelineRunRepository(database);
  const games = new ItchGameRepository(database);
  let run = runs.start(trigger, now.toISOString());
  const phases: ItchPipelinePhaseResult[] = [];
  const errors: ItchPipelineError[] = [];
  const metrics: Record<string, unknown> = {};
  const embeddedMetadataRepair = repairItchEmbeddedMetadata(database);
  metrics.embeddedMetadataRepair = embeddedMetadataRepair;
  let usefulPhaseCompleted = false;
  let usedCachedCatalogue = false;

  const executePhase = async <T>(
    phase: ItchPipelinePhaseResult<T>["phase"],
    skipped: boolean,
    operation: () => Promise<T> | T,
    summarize: (value: T) => Record<string, unknown>,
    determineStatus?: (value: T) => "completed" | "partial" | "failed",
  ): Promise<T | undefined> => {
    const phaseStarted = clock().toISOString();
    if (skipped) {
      phases.push({
        phase,
        status: "skipped",
        startedAt: phaseStarted,
        finishedAt: clock().toISOString(),
      });
      return undefined;
    }

    run = runs.update(run.id, { currentPhase: phase });
    lockManager.refresh(PIPELINE_LOCK_NAME, lock.ownerId, 60 * 60_000, clock());

    try {
      const value = await operation();
      const status = determineStatus?.(value) ?? "completed";
      const summary = summarize(value);
      metrics[phase] = summary;
      phases.push({
        phase,
        status,
        startedAt: phaseStarted,
        finishedAt: clock().toISOString(),
        data: value,
      });
      if (status !== "failed") usefulPhaseCompleted = true;
      if (status !== "completed") {
        errors.push({
          phase,
          name: "PartialPhaseResult",
          message: `${phase} completed with ${status} status.`,
          recoverable: true,
        });
      }
      return value;
    } catch (error) {
      const serialized = serializePipelineError(phase, error);
      errors.push(serialized);
      phases.push({
        phase,
        status: "failed",
        startedAt: phaseStarted,
        finishedAt: clock().toISOString(),
        error: serialized,
      });
      return undefined;
    }
  };

  try {
    const discovery = await executePhase(
      "discovering",
      input.skipDiscovery === true,
      () =>
        dependencies.refreshDiscovery?.(input, database) ??
        refreshItchRssDiscovery(
          {
            trigger,
            force: input.forceDiscovery,
            now,
            maxEntriesPerSource: input.rssMaxEntriesPerSource,
            requestDelayMs: input.rssRequestDelayMs,
          },
          { database },
        ),
      (value) => ({
        status: value.run.status,
        sourcesAttempted: value.run.sourcesAttempted,
        sourcesSucceeded: value.run.sourcesSucceeded,
        entriesScanned: value.run.entriesScanned,
        newGamesAdded: value.run.newGamesAdded,
      }),
      (value) => value.run.status === "partial" ? "partial" : value.run.status === "failed" ? "failed" : "completed",
    );

    if (discovery) {
      run = runs.update(run.id, { rssRefreshRunId: discovery.run.id });
      if (discovery.run.status !== "completed" && games.count() > 0) {
        usedCachedCatalogue = true;
      }
    } else if (!input.skipDiscovery && games.count() > 0) {
      usedCachedCatalogue = true;
    }

    const enrichment = await executePhase(
      "enriching",
      input.skipEnrichment === true,
      () =>
        dependencies.enrich?.(input, database) ??
        enrichItchGames(
          {
            limit: input.enrichLimit ?? 40,
            staleAfterHours: input.enrichStaleAfterHours ?? 168,
            requestDelayMs: input.enrichRequestDelayMs ?? 400,
            now,
          },
          { database },
        ),
      (value) => ({
        attempted: value.attempted,
        enriched: value.enriched,
        partial: value.partial,
        unchanged: value.unchanged,
        failed: value.failed,
        snapshotsCreated: value.snapshotsCreated,
      }),
      (value) =>
        value.failed === 0
          ? "completed"
          : value.failed < value.attempted
            ? "partial"
            : "failed",
    );
    if (!enrichment && games.count() > 0) usedCachedCatalogue = true;

    await executePhase(
      "normalizing",
      input.skipNormalization === true,
      () => {
        const normalized =
          dependencies.normalize?.(input, database) ??
          normalizeExistingItchTags({ database });
        const taxonomy = reclassifyItchAdultTaxonomy(database, {
          normalizeTags: false,
        });
        const adultClassification = classifyItchAdultCatalogue(database);
        return { ...normalized, taxonomy, adultClassification };
      },
      (value) => ({
        gamesScanned: value.gamesScanned,
        gamesChanged: value.gamesChanged,
        canonicalVocabularySize: value.canonicalVocabularySize,
        taxonomyEntries: value.taxonomy.taxonomyEntryCount,
        uncategorisedTags: value.taxonomy.run.uncategorisedTags,
        impliedTagsAdded: value.taxonomy.run.impliedTagsAdded,
        adult: value.adultClassification.run.adult,
        blocked: value.adultClassification.run.blocked,
        adultClassificationChanged: value.adultClassification.changed,
      }),
    );

    const recommendation = await executePhase(
      "ranking",
      input.skipRanking === true,
      () =>
        dependencies.rank?.(input, database) ??
        buildItchRecommendationBatch(database, {
          profileId: input.profileId,
          profileName: input.profileName,
          presetId: input.presetId,
          presetName: input.presetName,
          batchSize: input.batchSize,
          batchDate: input.batchDate,
          timezone: input.timezone,
          now: now.toISOString(),
        }),
      (value) => ({
        alreadyBuilt: value.alreadyBuilt,
        candidates: value.totalCandidates,
        eligible: value.eligibleCandidates,
        selected: value.selected.length,
      }),
    );
    if (recommendation) {
      run = runs.update(run.id, {
        recommendationBatchId: recommendation.batch.id,
      });
    }

    const updates = await executePhase(
      "watching",
      input.skipUpdates === true,
      () =>
        dependencies.refreshUpdates?.(input, database) ??
        refreshItchGameUpdates(
          {
            trigger,
            limit: input.updateLimit ?? 100,
            requestDelayMs: input.updateRequestDelayMs ?? 400,
            enrichMetadata: false,
            now,
          },
          { database },
        ),
      (value) => ({
        status: value.run.status,
        watchesAttempted: value.run.watchesAttempted,
        watchesSucceeded: value.run.watchesSucceeded,
        notificationsCreated: value.run.notificationsCreated,
      }),
      (value) => value.run.status === "partial" ? "partial" : value.run.status === "failed" ? "failed" : "completed",
    );
    if (updates) {
      run = runs.update(run.id, { updateWatchRunId: updates.run.id });
    }

    const digest = await executePhase(
      "digesting",
      input.skipDigest === true,
      () =>
        dependencies.buildDigest?.(input, database) ??
        buildItchNotificationDigest(
          {
            digestDate:
              input.digestDate ??
              getRecommendationBatchDate(now.toISOString(), input.timezone ?? "Europe/Dublin"),
            timezone: input.timezone ?? "Europe/Dublin",
            now: now.toISOString(),
          },
          database,
        ),
      (value) => ({
        alreadyBuilt: value.alreadyBuilt,
        itemCount: value.digest.itemCount,
      }),
    );
    if (digest) {
      run = runs.update(run.id, { notificationDigestId: digest.digest.id });
    }

    const finalStatus = determinePipelineStatus(
      phases,
      usefulPhaseCompleted,
      games.count() > 0,
    );
    run = runs.finish(run.id, {
      status: finalStatus,
      metrics,
      errors,
      usedCachedCatalogue,
      finishedAt: clock().toISOString(),
    });

    return {
      run,
      lockAcquired: true,
      phases,
      cachedCatalogueAvailable: games.count() > 0,
    };
  } finally {
    lockManager.release(PIPELINE_LOCK_NAME, lock.ownerId);
  }
}

function determinePipelineStatus(
  phases: ItchPipelinePhaseResult[],
  usefulPhaseCompleted: boolean,
  catalogueAvailable: boolean,
): "completed" | "partial" | "failed" {
  const executed = phases.filter((phase) => phase.status !== "skipped");
  if (executed.length === 0) return "completed";
  if (executed.every((phase) => phase.status === "completed")) return "completed";
  if (!catalogueAvailable && executed.some((phase) => phase.status === "failed")) {
    return "failed";
  }
  return usefulPhaseCompleted ? "partial" : "failed";
}

function serializePipelineError(
  phase: ItchPipelinePhaseResult["phase"],
  error: unknown,
): ItchPipelineError {
  if (error instanceof Error) {
    const code = "code" in error && typeof error.code === "string"
      ? error.code
      : undefined;
    return {
      phase,
      name: error.name,
      message: error.message,
      code,
      recoverable: true,
    };
  }

  return {
    phase,
    name: "UnknownError",
    message: String(error),
    recoverable: true,
  };
}
