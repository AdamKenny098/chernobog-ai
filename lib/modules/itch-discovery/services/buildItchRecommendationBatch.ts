import type Database from "better-sqlite3";

import { ITCH_RECOMMENDATION_SCORE_VERSION } from "../contract";
import { ItchDiscoveryNotFoundError } from "../errors";
import { applyItchFeedbackLearning } from "./applyItchFeedbackLearning";
import { executeItchFilterPreset } from "./executeItchFilter";
import { buildItchFeedbackModel } from "../ranking/feedbackModel";
import { getRecommendationBatchDate } from "../ranking/batchDate";
import {
  DEFAULT_RECOMMENDATION_BATCH_SIZE,
  DEFAULT_RECOMMENDATION_TIMEZONE,
  MAX_RECOMMENDATION_BATCH_SIZE,
} from "../ranking/recommendationConfig";
import { scoreItchGame } from "../ranking/scoreItchGame";
import {
  ItchCanonicalTagRepository,
  ItchFilterPresetRepository,
  ItchGameRepository,
  ItchPreferenceRepository,
  ItchRecommendationBatchRepository,
  ItchRecommendationRepository,
} from "../repositories";
import type {
  BuildItchRecommendationBatchInput,
  BuildItchRecommendationBatchResult,
  ItchFilterPreset,
  ItchPreferenceProfile,
  ItchRankedGame,
} from "../types";

function resolveProfile(
  preferences: ItchPreferenceRepository,
  input: BuildItchRecommendationBatchInput,
): ItchPreferenceProfile {
  const profile = input.profileId
    ? preferences.findProfileById(input.profileId)
    : input.profileName
      ? preferences.findProfileByName(input.profileName)
      : preferences.findProfileByName("Default") ?? preferences.ensureDefaultProfile();

  if (!profile) {
    throw new ItchDiscoveryNotFoundError(
      "Game Radar preference profile",
      input.profileId ?? input.profileName ?? "Default",
    );
  }
  return profile;
}

function resolvePreset(
  presets: ItchFilterPresetRepository,
  input: BuildItchRecommendationBatchInput,
): ItchFilterPreset {
  const preset = input.presetId
    ? presets.findById(input.presetId)
    : input.presetName
      ? presets.findByName(input.presetName)
      : presets.findDefault();

  if (!preset) {
    throw new ItchDiscoveryNotFoundError(
      "Game Radar filter preset",
      input.presetId ?? input.presetName ?? "default",
    );
  }
  return preset;
}

function validateBatchSize(value: number | undefined): number {
  const batchSize = value ?? DEFAULT_RECOMMENDATION_BATCH_SIZE;
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > MAX_RECOMMENDATION_BATCH_SIZE) {
    throw new Error(
      `Recommendation batch size must be an integer from 1 to ${MAX_RECOMMENDATION_BATCH_SIZE}.`,
    );
  }
  return batchSize;
}

function stableRank(items: ItchRankedGame[]): ItchRankedGame[] {
  return [...items]
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.game.title.localeCompare(b.game.title) ||
        a.game.id.localeCompare(b.game.id),
    )
    .map((item, index) => ({ ...item, rankPosition: index + 1 }));
}

export function buildItchRecommendationBatch(
  db: Database.Database,
  input: BuildItchRecommendationBatchInput = {},
): BuildItchRecommendationBatchResult {
  const preferences = new ItchPreferenceRepository(db);
  const presets = new ItchFilterPresetRepository(db);
  const recommendations = new ItchRecommendationRepository(db);
  const batches = new ItchRecommendationBatchRepository(db);
  const games = new ItchGameRepository(db);
  const canonicalTags = new ItchCanonicalTagRepository(db);

  const profile = resolveProfile(preferences, input);
  const preset = resolvePreset(presets, input);
  const batchSize = validateBatchSize(input.batchSize);
  const timezone = input.timezone ?? DEFAULT_RECOMMENDATION_TIMEZONE;
  const now = input.now ?? new Date().toISOString();
  const batchDate = input.batchDate ?? getRecommendationBatchDate(now, timezone);

  const existingBatch = batches.findByProfileAndDate(profile.id, batchDate);
  if (existingBatch) {
    const selected = recommendations
      .listByBatch(profile.id, batchDate)
      .map((recommendation): ItchRankedGame | null => {
        const game = games.findById(recommendation.gameId);
        if (!game) return null;
        return {
          game,
          sources: [],
          score: recommendation.score,
          scoreBreakdown: recommendation.scoreBreakdown,
          reason: recommendation.reason,
          rankPosition: recommendation.rankPosition ?? 0,
          eligible: true,
          exclusionReasons: [],
          matchedFeatures: [],
          existingRecommendation: recommendation,
        };
      })
      .filter((item): item is ItchRankedGame => item !== null);

    return {
      batch: existingBatch,
      alreadyBuilt: true,
      profile,
      preset,
      totalCandidates: existingBatch.candidateCount,
      eligibleCandidates: existingBatch.eligibleCount,
      scoredCandidates: existingBatch.eligibleCount,
      selected,
      carriedUnseen: recommendations.listByState(profile.id, "unseen", 100_000).length,
      updatedExisting: 0,
      rejectedByMinimumScore: 0,
      excludedByRanking: 0,
    };
  }

  const feedbackLearning = applyItchFeedbackLearning(
    { profileId: profile.id, limit: 2_000, now },
    db,
  );

  const filtered = executeItchFilterPreset(db, {
    presetId: preset.id,
    profileId: profile.id,
    limit: 100_000,
    now,
  });
  const weights = preferences.listWeights(profile.id);
  const feedback = buildItchFeedbackModel(db);
  const tagVocabulary = canonicalTags.listAll();
  const existingRecommendations = recommendations.listForProfile(profile.id);
  const existingByGame = new Map(
    existingRecommendations.map((recommendation) => [recommendation.gameId, recommendation]),
  );

  const scored = filtered.items.map((item) =>
    scoreItchGame({
      item,
      profile,
      preferenceWeights: weights,
      feedback,
      canonicalTags: tagVocabulary,
      existingRecommendation: existingByGame.get(item.game.id),
      now,
    }),
  );
  const ranked = stableRank(scored.filter((item) => item.eligible));
  const excludedByRanking = scored.length - ranked.length;
  const existingUnseen = existingRecommendations.filter(
    (recommendation) => recommendation.state === "unseen",
  ).length;

  let updatedExisting = 0;

  const neverRecommended = ranked.filter((item) => !item.existingRecommendation);
  const aboveMinimum = neverRecommended.filter((item) => item.score >= profile.minimumScore);
  const rejectedByMinimumScore = neverRecommended.length - aboveMinimum.length;
  const selected = aboveMinimum.slice(0, batchSize);

  const commit = db.transaction(() => {
    const generatedAt = now;

    for (const item of ranked) {
      if (!item.existingRecommendation) continue;
      const updated = recommendations.updateScore({
        gameId: item.game.id,
        profileId: profile.id,
        score: item.score,
        scoreBreakdown: item.scoreBreakdown,
        reason: item.reason,
        rankPosition: item.rankPosition,
        scoreVersion: ITCH_RECOMMENDATION_SCORE_VERSION,
      });
      if (updated) updatedExisting += 1;
    }

    for (const item of selected) {
      recommendations.upsert({
        gameId: item.game.id,
        profileId: profile.id,
        batchDate,
        score: item.score,
        scoreBreakdown: item.scoreBreakdown,
        reason: item.reason,
        state: "unseen",
        recommendedAt: generatedAt,
        rankPosition: item.rankPosition,
        scoreVersion: ITCH_RECOMMENDATION_SCORE_VERSION,
      });
    }

    return batches.create({
      profileId: profile.id,
      presetId: preset.id,
      batchDate,
      timezone,
      scoreVersion: ITCH_RECOMMENDATION_SCORE_VERSION,
      candidateCount: filtered.totalCandidates,
      eligibleCount: ranked.length,
      selectedCount: selected.length,
      minimumScore: profile.minimumScore,
      batchSize,
      generatedAt,
      config: {
        presetName: preset.name,
        filterMatched: filtered.totalMatched,
        preferenceWeightCount: weights.length,
        feedbackSignalCount: feedback.signalCount,
        feedbackSignalsApplied: feedbackLearning.run.signalsApplied,
        feedbackWeightsChanged: feedbackLearning.run.weightsChanged,
      },
    });
  });

  const batch = commit();

  return {
    batch,
    alreadyBuilt: false,
    profile,
    preset,
    totalCandidates: filtered.totalCandidates,
    eligibleCandidates: ranked.length,
    scoredCandidates: scored.length,
    selected,
    carriedUnseen: existingUnseen,
    updatedExisting,
    rejectedByMinimumScore,
    excludedByRanking,
  };
}
