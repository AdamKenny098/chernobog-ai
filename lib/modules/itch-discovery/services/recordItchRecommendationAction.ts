import type Database from "better-sqlite3";

import type { ItchSignalType } from "../contract";
import { getItchDiscoveryDatabase } from "../database/client";
import { ItchDiscoveryNotFoundError } from "../errors";
import {
  ItchRecommendationRepository,
  ItchSignalRepository,
  ItchWatchRepository,
} from "../repositories";
import type {
  RecordItchRecommendationActionInput,
  RecordItchRecommendationActionResult,
} from "../types";
import { buildItchDevlogFeedUrl } from "../updates/devlogFeed";
import { ItchGameRepository } from "../repositories/itchGameRepository";
import { applyItchFeedbackLearning } from "./applyItchFeedbackLearning";
import { bootstrapItchDiscovery } from "./bootstrapItchDiscovery";

const DEFAULT_SIGNAL_BY_STATE: Partial<Record<
  RecordItchRecommendationActionInput["state"],
  ItchSignalType
>> = {
  seen: "shown",
  opened: "opened",
  saved: "saved",
  hidden: "hidden",
  played: "played",
};

export function recordItchRecommendationAction(
  input: RecordItchRecommendationActionInput,
  database: Database.Database = getItchDiscoveryDatabase(),
): RecordItchRecommendationActionResult {
  bootstrapItchDiscovery(database);

  const recommendations = new ItchRecommendationRepository(database);
  const current = recommendations.findById(input.recommendationId);
  if (!current) {
    throw new ItchDiscoveryNotFoundError(
      "Game Radar recommendation",
      input.recommendationId,
    );
  }

  const recommendation = recommendations.updateState(current.id, input.state);
  if (!recommendation) {
    throw new Error(`Failed to update recommendation: ${current.id}`);
  }

  const signalType = input.signalType ?? DEFAULT_SIGNAL_BY_STATE[input.state];
  const signalResult = signalType
    ? new ItchSignalRepository(database).createDeduplicated({
        gameId: current.gameId,
        signalType,
        signalValue: input.signalValue,
        metadata: {
          ...(input.metadata ?? {}),
          profileId: current.profileId,
          source: "recommendation-action",
        },
        dedupeWindowMinutes: 10,
      })
    : undefined;
  const signal = signalResult?.signal;
  const learning = signalResult?.created && signal
    ? applyItchFeedbackLearning(
        { profileId: current.profileId, signalIds: [signal.id] },
        database,
      )
    : undefined;

  let watch;
  if (input.state === "hidden") {
    const watches = new ItchWatchRepository(database);
    const existing = watches.findByGameId(current.gameId);
    if (existing && existing.watchReason !== "manual") {
      watch = watches.setEnabled(current.gameId, false) ?? undefined;
    }
  }

  if (input.state === "saved" || input.state === "played") {
    const games = new ItchGameRepository(database);
    const game = games.findById(current.gameId);
    if (game) {
      const watches = new ItchWatchRepository(database);
      const existing = watches.findByGameId(game.id);
      watch = watches.upsert({
        gameId: game.id,
        watchReason: input.state,
        watchDevlogs: existing?.watchDevlogs ?? true,
        watchPrice: existing?.watchPrice ?? true,
        watchMetadata: existing?.watchMetadata ?? false,
        watchPlatforms: existing?.watchPlatforms ?? true,
        watchSale: existing?.watchSale ?? true,
        enabled: true,
        devlogFeedUrl:
          existing?.devlogFeedUrl ?? buildItchDevlogFeedUrl(game.canonicalUrl),
        lastCheckedAt: existing?.lastCheckedAt,
        devlogEtag: existing?.devlogEtag,
        devlogLastModified: existing?.devlogLastModified,
        devlogInitializedAt: existing?.devlogInitializedAt,
        lastSnapshotId: existing?.lastSnapshotId,
        lastSuccessAt: existing?.lastSuccessAt,
        lastError: existing?.lastError,
        lastErrorAt: existing?.lastErrorAt,
      });
    }
  }

  return {
    recommendation,
    signal,
    signalCreated: signalResult?.created,
    learning,
    watch,
  };
}
