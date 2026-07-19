import type Database from "better-sqlite3";

import type {
  ItchPlatform,
  ItchWeightFeatureType,
} from "../contract";
import { getItchDiscoveryDatabase } from "../database/client";
import { ItchFilterCandidateRepository } from "../filtering/itchFilterCandidateRepository";
import {
  ItchFeedbackRepository,
  ItchPreferenceRepository,
} from "../repositories";
import type {
  ApplyItchFeedbackLearningInput,
  ApplyItchFeedbackLearningResult,
  ItchFeedbackCandidate,
  ItchPreferenceWeight,
  ItchUserSignal,
} from "../types";
import { bootstrapItchDiscovery } from "./bootstrapItchDiscovery";

const SIGNAL_STRENGTH: Record<ItchUserSignal["signalType"], number> = {
  shown: 0,
  opened: 0.15,
  saved: 0.7,
  hidden: -0.9,
  played: 0.45,
  more_like_this: 1.2,
  less_like_this: -1.2,
};

type FeatureDelta = {
  featureType: ItchWeightFeatureType;
  featureValue: string;
  delta: number;
};

export function applyItchFeedbackLearning(
  input: ApplyItchFeedbackLearningInput = {},
  database: Database.Database = getItchDiscoveryDatabase(),
): ApplyItchFeedbackLearningResult {
  bootstrapItchDiscovery(database);

  const preferences = new ItchPreferenceRepository(database);
  const profile = input.profileId
    ? preferences.findProfileById(input.profileId)
    : input.profileName
      ? preferences.findProfileByName(input.profileName)
      : preferences.findProfileByName("Default") ?? preferences.ensureDefaultProfile();
  if (!profile) {
    throw new Error(
      `Game Radar preference profile was not found: ${input.profileId ?? input.profileName ?? "Default"}`,
    );
  }

  const now = input.now ?? new Date().toISOString();
  const feedback = new ItchFeedbackRepository(database);
  const run = feedback.startRun(profile.id, now);
  const signals = feedback.listUnappliedSignals({
    signalIds: input.signalIds,
    limit: input.limit ?? 500,
  });
  const candidates = new ItchFilterCandidateRepository(database).list({
    profileId: profile.id,
  });
  const candidateByGame = new Map(
    candidates.map((candidate) => [candidate.game.id, candidate]),
  );

  const appliedSignalIds: string[] = [];
  const changedWeights = new Map<string, ItchPreferenceWeight>();
  const changedCandidates = new Map<string, ItchFeedbackCandidate>();
  const errors: Array<Record<string, unknown>> = [];
  let candidatesCreated = 0;

  const commitSignal = database.transaction((signal: ItchUserSignal) => {
    const candidate = candidateByGame.get(signal.gameId);
    if (!candidate) {
      return false;
    }

    const deltas = buildFeatureDeltas(signal, candidate.game, candidate.sources);
    const appliedDeltas = [] as Array<FeatureDelta & {
      gameId: string;
      signalId: string;
      signalType: ItchUserSignal["signalType"];
    }>;

    for (const delta of deltas) {
      const weight = preferences.adjustWeight({
        profileId: profile.id,
        featureType: delta.featureType,
        featureValue: delta.featureValue,
        origin: "feedback",
        delta: delta.delta,
        minimum: -8,
        maximum: 8,
        confidenceFloor: 0.35,
      });
      changedWeights.set(
        `${weight.featureType}:${weight.featureValue}`,
        weight,
      );

      const existingCandidate = feedback.findCandidate(
        profile.id,
        weight.featureType,
        weight.featureValue,
      );
      const reviewCandidate = feedback.upsertCandidate({
        profileId: profile.id,
        featureType: weight.featureType,
        featureValue: weight.featureValue,
        observedWeight: weight.weight,
        evidence: {
          signalId: signal.id,
          signalType: signal.signalType,
          gameId: signal.gameId,
          gameTitle: candidate.game.title,
          delta: delta.delta,
          observedAt: signal.createdAt,
        },
        now,
      });
      if (!existingCandidate) candidatesCreated += 1;
      changedCandidates.set(reviewCandidate.id, reviewCandidate);
      appliedDeltas.push({
        ...delta,
        gameId: signal.gameId,
        signalId: signal.id,
        signalType: signal.signalType,
      });
    }

    return feedback.markSignalApplied({
      signalId: signal.id,
      runId: run.id,
      profileId: profile.id,
      appliedAt: now,
      deltas: appliedDeltas,
    });
  });

  for (const signal of signals) {
    try {
      if (commitSignal(signal)) {
        appliedSignalIds.push(signal.id);
      }
    } catch (error) {
      errors.push({
        signalId: signal.id,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const finalStatus = errors.length === 0
    ? "completed"
    : appliedSignalIds.length > 0
      ? "partial"
      : "failed";
  const finished = feedback.finishRun(run.id, {
    status: finalStatus,
    signalsScanned: signals.length,
    signalsApplied: appliedSignalIds.length,
    weightsChanged: changedWeights.size,
    candidatesCreated,
    summary: {
      profileName: profile.profileName,
      candidateCount: changedCandidates.size,
      signalTypes: countSignalTypes(signals),
    },
    errors,
    finishedAt: now,
  });

  if (!finished) {
    throw new Error(`Feedback learning run could not be finalized: ${run.id}`);
  }

  return {
    run: finished,
    appliedSignalIds,
    changedWeights: [...changedWeights.values()],
    candidates: [...changedCandidates.values()].sort(
      (a, b) =>
        Math.abs(b.observedWeight) - Math.abs(a.observedWeight) ||
        b.confidence - a.confidence ||
        a.featureValue.localeCompare(b.featureValue),
    ),
  };
}

function buildFeatureDeltas(
  signal: ItchUserSignal,
  game: {
    tags: string[];
    creatorName?: string;
    platforms: Record<ItchPlatform, boolean>;
  },
  sources: Array<{ id: string }>,
): FeatureDelta[] {
  const base = SIGNAL_STRENGTH[signal.signalType];
  const multiplier = signal.signalValue === undefined
    ? 1
    : Math.max(0.25, Math.min(4, Math.abs(signal.signalValue)));
  const strength = base * multiplier;
  if (strength === 0) return [];

  const deltas: FeatureDelta[] = [];
  for (const tag of game.tags.slice(0, 12)) {
    deltas.push({ featureType: "tag", featureValue: tag, delta: strength * 0.55 });
  }
  if (game.creatorName) {
    deltas.push({
      featureType: "creator",
      featureValue: game.creatorName,
      delta: strength * 0.35,
    });
  }
  for (const [platform, enabled] of Object.entries(game.platforms) as Array<
    [ItchPlatform, boolean]
  >) {
    if (enabled) {
      deltas.push({
        featureType: "platform",
        featureValue: platform,
        delta: strength * 0.2,
      });
    }
  }
  for (const source of sources.slice(0, 5)) {
    deltas.push({
      featureType: "source",
      featureValue: source.id,
      delta: strength * 0.15,
    });
  }
  return deltas;
}

function countSignalTypes(
  signals: ItchUserSignal[],
): Record<string, number> {
  return signals.reduce<Record<string, number>>((counts, signal) => {
    counts[signal.signalType] = (counts[signal.signalType] ?? 0) + 1;
    return counts;
  }, {});
}
