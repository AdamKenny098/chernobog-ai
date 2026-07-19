import type Database from "better-sqlite3";

import type {
  ExecuteItchFilterPresetInput,
  ItchFilterExecutionResult,
  ItchFilterQuery,
} from "../types";
import { ItchDiscoveryNotFoundError } from "../errors";
import { ItchFilterCandidateRepository } from "../filtering/itchFilterCandidateRepository";
import { applyItchFilterRules } from "../filtering/evaluateItchFilter";
import { normalizeItchFilterQuery } from "../filtering/normalizeItchFilter";
import { ItchFilterPresetRepository } from "../repositories/itchFilterPresetRepository";

export function executeItchFilter(
  db: Database.Database,
  query: ItchFilterQuery,
): ItchFilterExecutionResult {
  const normalized = normalizeItchFilterQuery(db, query);
  const candidates = new ItchFilterCandidateRepository(db).list({
    profileId: normalized.profileId,
  });
  const evaluated = applyItchFilterRules(
    candidates,
    normalized.rules,
    normalized.metadataMode,
    normalized.sort,
    normalized.now,
  );
  const items = evaluated.matched.slice(
    normalized.offset,
    normalized.offset + normalized.limit,
  );

  return {
    metadataMode: normalized.metadataMode,
    normalizedRules: normalized.rules,
    sort: normalized.sort,
    totalCandidates: candidates.length,
    totalMatched: evaluated.matched.length,
    totalReturned: items.length,
    offset: normalized.offset,
    limit: normalized.limit,
    rejectedByRule: evaluated.rejectedByRule,
    items,
  };
}

export function executeItchFilterPreset(
  db: Database.Database,
  input: ExecuteItchFilterPresetInput,
): ItchFilterExecutionResult {
  const presets = new ItchFilterPresetRepository(db);
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

  return executeItchFilter(db, {
    rules: preset.rules,
    sort: preset.sort,
    profileId: input.profileId,
    limit: input.limit,
    offset: input.offset,
    now: input.now,
  });
}
