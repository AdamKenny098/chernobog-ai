import type Database from "better-sqlite3";

import type {
  ItchFilterCandidate,
  ItchFilterCandidateSource,
  ItchRecommendation,
} from "../types";
import { ItchGameRepository } from "../repositories/itchGameRepository";

export type ListItchFilterCandidatesOptions = {
  profileId?: string;
};

type SourceRow = {
  game_id: string;
  source_id: string;
  source_name: string;
  source_type: ItchFilterCandidateSource["sourceType"];
  source_url: string;
  priority: number;
};

type RecommendationRow = {
  id: string;
  game_id: string;
  profile_id: string;
  score: number;
  state: ItchRecommendation["state"];
  recommended_at: string;
};

function calculateMetadataCompleteness(game: ItchFilterCandidate["game"]): {
  score: number;
  missing: string[];
} {
  const checks: Array<[string, boolean]> = [
    ["creatorName", Boolean(game.creatorName)],
    ["shortDescription", Boolean(game.shortDescription)],
    ["coverImageUrl", Boolean(game.coverImageUrl)],
    ["tags", game.tags.length > 0],
    ["platforms", Object.values(game.platforms).some(Boolean)],
    ["price", game.price.kind !== "unknown"],
  ];

  const missing = checks.filter(([, present]) => !present).map(([field]) => field);
  const present = checks.length - missing.length;

  return {
    score: Math.round((present / checks.length) * 100),
    missing,
  };
}

function parseDiscountPercent(saleText?: string): number | undefined {
  if (!saleText) {
    return undefined;
  }

  const match = saleText.match(/(?:-|save\s*)?(\d{1,3})\s*%/i);
  if (!match) {
    return undefined;
  }

  const value = Number(match[1]);
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    return undefined;
  }

  return value;
}

export class ItchFilterCandidateRepository {
  private readonly games: ItchGameRepository;

  constructor(private readonly db: Database.Database) {
    this.games = new ItchGameRepository(db);
  }

  list(options: ListItchFilterCandidatesOptions = {}): ItchFilterCandidate[] {
    const games = this.games.listAll();
    const sourcesByGame = this.loadSourcesByGame();
    const recommendationsByGame = this.loadRecommendationsByGame(
      options.profileId,
    );

    return games.map((game): ItchFilterCandidate => {
      const completeness = calculateMetadataCompleteness(game);
      const recommendation = recommendationsByGame.get(game.id);

      return {
        game,
        sources: sourcesByGame.get(game.id) ?? [],
        recommendation: recommendation
          ? {
              id: recommendation.id,
              profileId: recommendation.profileId,
              score: recommendation.score,
              state: recommendation.state,
              recommendedAt: recommendation.recommendedAt,
            }
          : undefined,
        metadataCompleteness: completeness.score,
        missingMetadataFields: completeness.missing,
        discountPercent: parseDiscountPercent(game.price.saleText),
      };
    });
  }

  private loadSourcesByGame(): Map<string, ItchFilterCandidateSource[]> {
    const rows = this.db
      .prepare(
        `SELECT DISTINCT
           d.game_id,
           s.id AS source_id,
           s.name AS source_name,
           s.source_type,
           s.source_url,
           s.priority
         FROM itch_discoveries d
         INNER JOIN itch_sources s ON s.id = d.source_id
         ORDER BY s.priority DESC, s.name ASC, s.id ASC`,
      )
      .all() as SourceRow[];

    const result = new Map<string, ItchFilterCandidateSource[]>();

    for (const row of rows) {
      const existing = result.get(row.game_id) ?? [];
      existing.push({
        id: row.source_id,
        name: row.source_name,
        sourceType: row.source_type,
        sourceUrl: row.source_url,
        priority: row.priority,
      });
      result.set(row.game_id, existing);
    }

    return result;
  }

  private loadRecommendationsByGame(
    profileId?: string,
  ): Map<string, Pick<
    ItchRecommendation,
    "id" | "profileId" | "score" | "state" | "recommendedAt"
  >> {
    const rows = profileId
      ? (this.db
          .prepare(
            `SELECT id, game_id, profile_id, score, state, recommended_at
             FROM itch_recommendations
             WHERE profile_id = ?
             ORDER BY recommended_at DESC, id ASC`,
          )
          .all(profileId) as RecommendationRow[])
      : (this.db
          .prepare(
            `SELECT id, game_id, profile_id, score, state, recommended_at
             FROM itch_recommendations
             ORDER BY recommended_at DESC, id ASC`,
          )
          .all() as RecommendationRow[]);

    const result = new Map<string, Pick<
      ItchRecommendation,
      "id" | "profileId" | "score" | "state" | "recommendedAt"
    >>();

    for (const row of rows) {
      if (result.has(row.game_id)) {
        continue;
      }

      result.set(row.game_id, {
        id: row.id,
        profileId: row.profile_id,
        score: row.score,
        state: row.state,
        recommendedAt: row.recommended_at,
      });
    }

    return result;
  }
}
