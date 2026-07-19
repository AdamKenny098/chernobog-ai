import type Database from "better-sqlite3";

import {
  ITCH_RECOMMENDATION_SCORE_VERSION,
  type ItchRecommendationScoreVersion,
} from "../contract";
import type { ItchRecommendationBatch } from "../types";
import {
  createItchId,
  parseJson,
  stringifyJson,
} from "../database/helpers";

type RecommendationBatchRow = {
  id: string;
  profile_id: string;
  preset_id: string | null;
  batch_date: string;
  timezone: string;
  score_version: string;
  candidate_count: number;
  eligible_count: number;
  selected_count: number;
  minimum_score: number;
  batch_size: number;
  generated_at: string;
  config_json: string;
};

export class ItchRecommendationBatchRepository {
  constructor(private readonly db: Database.Database) {}

  create(input: Omit<ItchRecommendationBatch, "id"> & { id?: string }): ItchRecommendationBatch {
    const id = input.id ?? createItchId("itch_recommendation_batch");

    this.db
      .prepare(
        `INSERT INTO itch_recommendation_batches (
          id, profile_id, preset_id, batch_date, timezone, score_version,
          candidate_count, eligible_count, selected_count, minimum_score,
          batch_size, generated_at, config_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(profile_id, batch_date) DO NOTHING`,
      )
      .run(
        id,
        input.profileId,
        input.presetId ?? null,
        input.batchDate,
        input.timezone,
        input.scoreVersion,
        input.candidateCount,
        input.eligibleCount,
        input.selectedCount,
        input.minimumScore,
        input.batchSize,
        input.generatedAt,
        stringifyJson(input.config),
      );

    const batch = this.findByProfileAndDate(input.profileId, input.batchDate);
    if (!batch) {
      throw new Error(
        `Failed to read recommendation batch ${input.profileId}/${input.batchDate}`,
      );
    }

    return batch;
  }

  findByProfileAndDate(
    profileId: string,
    batchDate: string,
  ): ItchRecommendationBatch | null {
    const row = this.db
      .prepare(
        `SELECT * FROM itch_recommendation_batches
         WHERE profile_id = ? AND batch_date = ?`,
      )
      .get(profileId, batchDate) as RecommendationBatchRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  listForProfile(profileId: string, limit = 30): ItchRecommendationBatch[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM itch_recommendation_batches
         WHERE profile_id = ?
         ORDER BY batch_date DESC, generated_at DESC
         LIMIT ?`,
      )
      .all(profileId, limit) as RecommendationBatchRow[];

    return rows.map((row) => this.mapRow(row));
  }

  count(): number {
    const row = this.db
      .prepare("SELECT COUNT(*) AS count FROM itch_recommendation_batches")
      .get() as { count: number };
    return row.count;
  }

  private mapRow(row: RecommendationBatchRow): ItchRecommendationBatch {
    return {
      id: row.id,
      profileId: row.profile_id,
      presetId: row.preset_id ?? undefined,
      batchDate: row.batch_date,
      timezone: row.timezone,
      scoreVersion:
        (row.score_version as ItchRecommendationScoreVersion) ??
        ITCH_RECOMMENDATION_SCORE_VERSION,
      candidateCount: row.candidate_count,
      eligibleCount: row.eligible_count,
      selectedCount: row.selected_count,
      minimumScore: row.minimum_score,
      batchSize: row.batch_size,
      generatedAt: row.generated_at,
      config: parseJson<Record<string, unknown>>(row.config_json, {}),
    };
  }
}
