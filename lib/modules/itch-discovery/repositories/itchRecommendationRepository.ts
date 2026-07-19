import type Database from "better-sqlite3";

import {
  ITCH_RECOMMENDATION_SCORE_VERSION,
  type ItchRecommendationState,
  type RecommendationScoreBreakdown,
} from "../contract";
import type {
  ItchRecommendation,
  UpsertItchRecommendationInput,
} from "../types";
import {
  createItchId,
  nowIso,
  parseJson,
  stringifyJson,
} from "../database/helpers";

type RecommendationRow = {
  id: string;
  game_id: string;
  profile_id: string;
  batch_date: string;
  score: number;
  score_breakdown_json: string;
  reason_text: string;
  state: ItchRecommendationState;
  recommended_at: string;
  first_seen_at: string | null;
  last_action_at: string | null;
  rank_position: number | null;
  score_version: string;
};

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

export class ItchRecommendationRepository {
  constructor(private readonly db: Database.Database) {}

  upsert(input: UpsertItchRecommendationInput): ItchRecommendation {
    const id = input.id ?? createItchId("itch_recommendation");

    this.db
      .prepare(
        `INSERT INTO itch_recommendations (
          id, game_id, profile_id, batch_date, score,
          score_breakdown_json, reason_text, state, recommended_at,
          first_seen_at, last_action_at, rank_position, score_version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(game_id, profile_id) DO UPDATE SET
          batch_date = excluded.batch_date,
          score = excluded.score,
          score_breakdown_json = excluded.score_breakdown_json,
          reason_text = excluded.reason_text,
          recommended_at = excluded.recommended_at,
          rank_position = excluded.rank_position,
          score_version = excluded.score_version`,
      )
      .run(
        id,
        input.gameId,
        input.profileId,
        input.batchDate,
        input.score,
        stringifyJson(input.scoreBreakdown),
        input.reason,
        input.state,
        input.recommendedAt,
        input.firstSeenAt ?? null,
        input.lastActionAt ?? null,
        input.rankPosition ?? null,
        input.scoreVersion ?? ITCH_RECOMMENDATION_SCORE_VERSION,
      );

    const recommendation = this.findByGameAndProfile(
      input.gameId,
      input.profileId,
    );
    if (!recommendation) {
      throw new Error(`Failed to read recommendation for game ${input.gameId}`);
    }

    return recommendation;
  }

  updateScore(input: {
    gameId: string;
    profileId: string;
    score: number;
    scoreBreakdown: RecommendationScoreBreakdown;
    reason: string;
    rankPosition?: number;
    scoreVersion?: string;
  }): ItchRecommendation | null {
    this.db
      .prepare(
        `UPDATE itch_recommendations
         SET score = ?,
             score_breakdown_json = ?,
             reason_text = ?,
             rank_position = ?,
             score_version = ?
         WHERE game_id = ? AND profile_id = ?`,
      )
      .run(
        input.score,
        stringifyJson(input.scoreBreakdown),
        input.reason,
        input.rankPosition ?? null,
        input.scoreVersion ?? ITCH_RECOMMENDATION_SCORE_VERSION,
        input.gameId,
        input.profileId,
      );

    return this.findByGameAndProfile(input.gameId, input.profileId);
  }

  findById(id: string): ItchRecommendation | null {
    const row = this.db
      .prepare("SELECT * FROM itch_recommendations WHERE id = ?")
      .get(id) as RecommendationRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  findByGameAndProfile(
    gameId: string,
    profileId: string,
  ): ItchRecommendation | null {
    const row = this.db
      .prepare(
        `SELECT * FROM itch_recommendations
         WHERE game_id = ? AND profile_id = ?`,
      )
      .get(gameId, profileId) as RecommendationRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  listForProfile(profileId: string): ItchRecommendation[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM itch_recommendations
         WHERE profile_id = ?
         ORDER BY score DESC, recommended_at DESC, id ASC`,
      )
      .all(profileId) as RecommendationRow[];

    return rows.map((row) => this.mapRow(row));
  }

  listByBatch(
    profileId: string,
    batchDate: string,
  ): ItchRecommendation[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM itch_recommendations
         WHERE profile_id = ? AND batch_date = ?
         ORDER BY rank_position ASC, score DESC, id ASC`,
      )
      .all(profileId, batchDate) as RecommendationRow[];

    return rows.map((row) => this.mapRow(row));
  }

  updateState(
    id: string,
    state: ItchRecommendationState,
  ): ItchRecommendation | null {
    const timestamp = nowIso();
    const firstSeenAt = state === "seen" ? timestamp : null;

    this.db
      .prepare(
        `UPDATE itch_recommendations
         SET state = ?,
             first_seen_at = COALESCE(first_seen_at, ?),
             last_action_at = ?
         WHERE id = ?`,
      )
      .run(state, firstSeenAt, timestamp, id);

    return this.findById(id);
  }

  listByState(
    profileId: string,
    state: ItchRecommendationState,
    limit = 100,
  ): ItchRecommendation[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM itch_recommendations
         WHERE profile_id = ? AND state = ?
         ORDER BY score DESC, recommended_at DESC
         LIMIT ?`,
      )
      .all(profileId, state, limit) as RecommendationRow[];

    return rows.map((row) => this.mapRow(row));
  }

  count(profileId?: string): number {
    const row = profileId
      ? (this.db
          .prepare(
            "SELECT COUNT(*) AS count FROM itch_recommendations WHERE profile_id = ?",
          )
          .get(profileId) as { count: number })
      : (this.db
          .prepare("SELECT COUNT(*) AS count FROM itch_recommendations")
          .get() as { count: number });

    return row.count;
  }

  private mapRow(row: RecommendationRow): ItchRecommendation {
    return {
      id: row.id,
      gameId: row.game_id,
      profileId: row.profile_id,
      batchDate: row.batch_date,
      score: row.score,
      scoreBreakdown: parseJson(
        row.score_breakdown_json,
        EMPTY_SCORE_BREAKDOWN,
      ),
      reason: row.reason_text,
      state: row.state,
      recommendedAt: row.recommended_at,
      firstSeenAt: row.first_seen_at ?? undefined,
      lastActionAt: row.last_action_at ?? undefined,
      rankPosition: row.rank_position ?? undefined,
      scoreVersion: ITCH_RECOMMENDATION_SCORE_VERSION,
    };
  }
}
