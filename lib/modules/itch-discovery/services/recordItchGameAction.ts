import type Database from "better-sqlite3";

import {
  ITCH_RECOMMENDATION_SCORE_VERSION,
  type ItchRecommendationState,
  type ItchSignalType,
  type RecommendationScoreBreakdown,
} from "../contract";
import { getItchDiscoveryDatabase } from "../database/client";
import { ItchDiscoveryNotFoundError } from "../errors";
import {
  ItchGameRepository,
  ItchPreferenceRepository,
  ItchRecommendationRepository,
} from "../repositories";
import type { RecordItchRecommendationActionResult } from "../types";
import { bootstrapItchDiscovery } from "./bootstrapItchDiscovery";
import { recordItchRecommendationAction } from "./recordItchRecommendationAction";

const EMPTY_SCORE_BREAKDOWN: RecommendationScoreBreakdown = {
  tagMatch: 0,
  textMatch: 0,
  platformMatch: 0,
  priceMatch: 0,
  sourceQuality: 0,
  recency: 0,
  novelty: 0,
  feedbackAdjustment: 0,
  penalties: 0,
  total: 0,
};

export type RecordItchGameActionInput = {
  gameId: string;
  profileId?: string;
  state: ItchRecommendationState;
  signalType?: ItchSignalType;
  signalValue?: number;
  metadata?: Record<string, unknown>;
  now?: Date;
};

export function recordItchGameAction(
  input: RecordItchGameActionInput,
  database: Database.Database = getItchDiscoveryDatabase(),
): RecordItchRecommendationActionResult {
  bootstrapItchDiscovery(database);

  const games = new ItchGameRepository(database);
  const game = games.findById(input.gameId);
  if (!game) {
    throw new ItchDiscoveryNotFoundError("Game Radar game", input.gameId);
  }

  const preferences = new ItchPreferenceRepository(database);
  const profile = input.profileId
    ? preferences.findProfileById(input.profileId)
    : preferences.findProfileByName("Default") ?? preferences.ensureDefaultProfile();
  if (!profile) {
    throw new ItchDiscoveryNotFoundError(
      "Game Radar preference profile",
      input.profileId ?? "Default",
    );
  }

  const recommendations = new ItchRecommendationRepository(database);
  let recommendation = recommendations.findByGameAndProfile(game.id, profile.id);

  if (!recommendation) {
    const now = input.now ?? new Date();
    recommendation = recommendations.upsert({
      gameId: game.id,
      profileId: profile.id,
      batchDate: now.toISOString().slice(0, 10),
      score: 0,
      scoreBreakdown: EMPTY_SCORE_BREAKDOWN,
      reason: "Added manually from the Game Radar catalogue.",
      state: "unseen",
      recommendedAt: now.toISOString(),
      scoreVersion: ITCH_RECOMMENDATION_SCORE_VERSION,
    });
  }

  return recordItchRecommendationAction(
    {
      recommendationId: recommendation.id,
      state: input.state,
      signalType: input.signalType,
      signalValue: input.signalValue,
      metadata: input.metadata,
    },
    database,
  );
}
