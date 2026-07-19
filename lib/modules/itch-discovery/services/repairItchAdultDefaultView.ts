import type Database from "better-sqlite3";

import { getItchDiscoveryDatabase } from "../database/client";
import { nowIso } from "../database/helpers";
import {
  ItchAdultSettingsRepository,
  ItchFilterPresetRepository,
  ItchPreferenceRepository,
} from "../repositories";
import { bootstrapItchDiscovery } from "./bootstrapItchDiscovery";
import { buildItchRecommendationBatch } from "./buildItchRecommendationBatch";

export type RepairItchAdultDefaultViewResult = {
  blurCoversByDefault: boolean;
  defaultPresetName: string;
  removedOpenRecommendations: number;
  removedBatches: number;
  rebuiltRecommendations: number;
  eligibleCandidates: number;
};

export function repairItchAdultDefaultView(
  database: Database.Database = getItchDiscoveryDatabase(),
): RepairItchAdultDefaultViewResult {
  bootstrapItchDiscovery(database);

  const adults = new ItchAdultSettingsRepository(database);
  const filters = new ItchFilterPresetRepository(database);
  const preferences = new ItchPreferenceRepository(database);

  const settings = adults.update({
    enabled: true,
    adultOnly: true,
    blurCoversByDefault: false,
  });

  const profile = preferences.ensureDefaultProfile();
  const preset = filters.findByName("For You") ?? filters.findDefault();
  if (!preset) {
    throw new Error("Game Radar default preset could not be resolved.");
  }
  filters.setDefault(preset.id);

  const deleted = database.transaction(() => {
    const removedRecommendations = database.prepare(
      `DELETE FROM itch_recommendations
       WHERE profile_id = ?
         AND state IN ('unseen', 'seen', 'opened')`,
    ).run(profile.id).changes;

    const removedBatches = database.prepare(
      `DELETE FROM itch_recommendation_batches
       WHERE profile_id = ?`,
    ).run(profile.id).changes;

    return { removedRecommendations, removedBatches };
  })();

  const rebuilt = buildItchRecommendationBatch(database, {
    profileId: profile.id,
    presetId: preset.id,
    batchSize: 60,
    now: nowIso(),
  });

  return {
    blurCoversByDefault: settings.blurCoversByDefault,
    defaultPresetName: preset.name,
    removedOpenRecommendations: deleted.removedRecommendations,
    removedBatches: deleted.removedBatches,
    rebuiltRecommendations: rebuilt.selected.length,
    eligibleCandidates: rebuilt.eligibleCandidates,
  };
}
