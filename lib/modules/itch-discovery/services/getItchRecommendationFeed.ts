import type Database from "better-sqlite3";

import { getItchDiscoveryDatabase } from "../database/client";
import { ItchFilterCandidateRepository } from "../filtering/itchFilterCandidateRepository";
import {
  ItchPreferenceRepository,
  ItchRecommendationRepository,
  ItchWatchRepository,
} from "../repositories";
import type { GetItchFeedInput, GetItchFeedResult } from "../types";
import { bootstrapItchDiscovery } from "./bootstrapItchDiscovery";

export function getItchRecommendationFeed(
  input: GetItchFeedInput = {},
  database: Database.Database = getItchDiscoveryDatabase(),
): GetItchFeedResult {
  bootstrapItchDiscovery(database);

  const preferences = new ItchPreferenceRepository(database);
  const profile = input.profileId
    ? preferences.findProfileById(input.profileId)
    : preferences.findProfileByName("Default") ?? preferences.ensureDefaultProfile();

  if (!profile) {
    throw new Error(`Game Radar profile was not found: ${input.profileId}`);
  }

  const state = input.state ?? "unseen";
  const limit = clampInteger(input.limit ?? 30, 1, 100);
  const offset = clampInteger(input.offset ?? 0, 0, 100_000);
  const recommendations = new ItchRecommendationRepository(database)
    .listByState(profile.id, state, 100_000);
  const candidates = new ItchFilterCandidateRepository(database).list({
    profileId: profile.id,
  });
  const candidateByGame = new Map(
    candidates.map((candidate) => [candidate.game.id, candidate]),
  );
  const watchedGameIds = new Set(
    new ItchWatchRepository(database)
      .listAll()
      .filter((watch) => watch.enabled)
      .map((watch) => watch.gameId),
  );

  const items = recommendations
    .slice(offset, offset + limit)
    .map((recommendation) => {
      const candidate = candidateByGame.get(recommendation.gameId);
      if (!candidate) return null;
      return {
        recommendation,
        game: candidate.game,
        sources: candidate.sources,
        watched: watchedGameIds.has(candidate.game.id),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return {
    profileId: profile.id,
    state,
    total: recommendations.length,
    limit,
    offset,
    items,
    cached: true,
    generatedAt: new Date().toISOString(),
  };
}

function clampInteger(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, Math.floor(value)));
}
