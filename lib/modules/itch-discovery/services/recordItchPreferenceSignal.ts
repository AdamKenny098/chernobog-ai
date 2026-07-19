import type Database from "better-sqlite3";

import { getItchDiscoveryDatabase } from "../database/client";
import { ItchDiscoveryNotFoundError } from "../errors";
import {
  ItchGameRepository,
  ItchPreferenceRepository,
  ItchRecommendationRepository,
  ItchSignalRepository,
} from "../repositories";
import type {
  RecordItchPreferenceSignalInput,
  RecordItchPreferenceSignalResult,
} from "../types";
import { applyItchFeedbackLearning } from "./applyItchFeedbackLearning";
import { bootstrapItchDiscovery } from "./bootstrapItchDiscovery";

export function recordItchPreferenceSignal(
  input: RecordItchPreferenceSignalInput,
  database: Database.Database = getItchDiscoveryDatabase(),
): RecordItchPreferenceSignalResult {
  bootstrapItchDiscovery(database);

  const recommendations = new ItchRecommendationRepository(database);
  const recommendation = input.recommendationId
    ? recommendations.findById(input.recommendationId)
    : undefined;
  const gameId = input.gameId ?? recommendation?.gameId;
  if (!gameId) {
    throw new TypeError("gameId or recommendationId is required.");
  }

  const game = new ItchGameRepository(database).findById(gameId);
  if (!game) {
    throw new ItchDiscoveryNotFoundError("Game Radar game", gameId);
  }

  const profile = input.profileId
    ? new ItchPreferenceRepository(database).findProfileById(input.profileId)
    : recommendation
      ? new ItchPreferenceRepository(database).findProfileById(
          recommendation.profileId,
        )
      : new ItchPreferenceRepository(database).findProfileByName("Default") ??
        new ItchPreferenceRepository(database).ensureDefaultProfile();
  if (!profile) {
    throw new ItchDiscoveryNotFoundError(
      "Game Radar preference profile",
      input.profileId ?? recommendation?.profileId ?? "Default",
    );
  }

  const created = new ItchSignalRepository(database).createDeduplicated({
    gameId: game.id,
    signalType: input.signalType,
    signalValue: input.signalValue,
    metadata: {
      ...(input.metadata ?? {}),
      profileId: profile.id,
      source: "stage-j-feedback",
    },
    dedupeWindowMinutes: 10,
  });

  const learning = created.created
    ? applyItchFeedbackLearning(
        { profileId: profile.id, signalIds: [created.signal.id] },
        database,
      )
    : undefined;

  return {
    game,
    recommendation: recommendation ?? undefined,
    signal: created.signal,
    signalCreated: created.created,
    learning,
  };
}
