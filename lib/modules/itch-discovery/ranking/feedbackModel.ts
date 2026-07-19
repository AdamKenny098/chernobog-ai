import type Database from "better-sqlite3";

import type { ItchPlatform, ItchSignalType } from "../contract";
import type { ItchFilterCandidate, ItchGame } from "../types";
import { ItchFilterCandidateRepository } from "../filtering/itchFilterCandidateRepository";
import { ItchSignalRepository } from "../repositories/itchSignalRepository";
import { FEEDBACK_SIGNAL_WEIGHTS } from "./recommendationConfig";

export type ItchFeedbackModel = {
  tagWeights: Map<string, number>;
  creatorWeights: Map<string, number>;
  platformWeights: Map<ItchPlatform, number>;
  sourceWeights: Map<string, number>;
  directGameWeights: Map<string, number>;
  signalCount: number;
};

function addCapped(
  map: Map<string, number>,
  key: string,
  value: number,
  cap = 8,
): void {
  const next = Math.max(-cap, Math.min(cap, (map.get(key) ?? 0) + value));
  map.set(key, next);
}

function signalStrength(type: ItchSignalType, value?: number): number {
  const base = FEEDBACK_SIGNAL_WEIGHTS[type];
  const multiplier = value === undefined ? 1 : Math.max(0.25, Math.min(4, value));
  return base * multiplier;
}

function activePlatforms(game: ItchGame): ItchPlatform[] {
  return (Object.entries(game.platforms) as Array<[ItchPlatform, boolean]>)
    .filter(([, enabled]) => enabled)
    .map(([platform]) => platform);
}

export function buildItchFeedbackModel(db: Database.Database): ItchFeedbackModel {
  const candidates = new ItchFilterCandidateRepository(db).list();
  const candidateByGame = new Map<string, ItchFilterCandidate>(
    candidates.map((candidate) => [candidate.game.id, candidate]),
  );
  const signals = new ItchSignalRepository(db).listUnappliedForFeedback();

  const model: ItchFeedbackModel = {
    tagWeights: new Map(),
    creatorWeights: new Map(),
    platformWeights: new Map(),
    sourceWeights: new Map(),
    directGameWeights: new Map(),
    signalCount: signals.length,
  };

  for (const signal of signals) {
    const candidate = candidateByGame.get(signal.gameId);
    if (!candidate) {
      continue;
    }

    const strength = signalStrength(signal.signalType, signal.signalValue);
    if (strength === 0) {
      continue;
    }

    addCapped(model.directGameWeights, signal.gameId, strength, 12);

    for (const tag of candidate.game.tags) {
      addCapped(model.tagWeights, tag, strength * 0.7);
    }

    if (candidate.game.creatorName) {
      addCapped(
        model.creatorWeights,
        candidate.game.creatorName.trim().toLowerCase(),
        strength * 0.8,
      );
    }

    for (const platform of activePlatforms(candidate.game)) {
      const next = Math.max(
        -6,
        Math.min(6, (model.platformWeights.get(platform) ?? 0) + strength * 0.35),
      );
      model.platformWeights.set(platform, next);
    }

    for (const source of candidate.sources) {
      addCapped(model.sourceWeights, source.id, strength * 0.25, 5);
    }
  }

  return model;
}
