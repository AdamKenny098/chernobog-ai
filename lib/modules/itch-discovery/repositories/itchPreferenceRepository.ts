import type Database from "better-sqlite3";

import type {
  ItchPlatform,
  ItchWeightFeatureType,
  ItchWeightOrigin,
} from "../contract";
import { ItchTagNormalizer } from "../domain/tagNormalization";
import type {
  ItchPreferenceProfile,
  ItchPreferenceWeight,
} from "../types";
import {
  createItchId,
  fromSqliteBoolean,
  nowIso,
  parseJson,
  stringifyJson,
  toSqliteBoolean,
} from "../database/helpers";
import { ItchTagAliasRepository } from "./itchTagAliasRepository";

type PreferenceProfileRow = {
  id: string;
  profile_name: string;
  enabled: number;
  preferred_platforms_json: string;
  maximum_price_minor: number | null;
  allow_free: number;
  allow_paid: number;
  allow_browser_games: number;
  exclude_nsfw: number;
  minimum_score: number;
  created_at: string;
  updated_at: string;
};

type PreferenceWeightRow = {
  id: string;
  profile_id: string;
  feature_type: ItchWeightFeatureType;
  feature_value: string;
  weight: number;
  origin: ItchWeightOrigin;
  confidence: number;
  created_at: string;
  updated_at: string;
};

export type UpsertPreferenceProfileInput = {
  id?: string;
  profileName: string;
  enabled: boolean;
  preferredPlatforms: ItchPlatform[];
  maximumPriceMinor?: number;
  allowFree: boolean;
  allowPaid: boolean;
  allowBrowserGames: boolean;
  excludeNsfw: boolean;
  minimumScore: number;
};

export type UpsertPreferenceWeightInput = {
  id?: string;
  profileId: string;
  featureType: ItchWeightFeatureType;
  featureValue: string;
  weight: number;
  origin: ItchWeightOrigin;
  confidence: number;
};

export class ItchPreferenceRepository {
  private readonly tagNormalizer: ItchTagNormalizer;

  constructor(private readonly db: Database.Database) {
    this.tagNormalizer = new ItchTagNormalizer(
      new ItchTagAliasRepository(db),
    );
  }

  upsertProfile(input: UpsertPreferenceProfileInput): ItchPreferenceProfile {
    const id = input.id ?? createItchId("itch_profile");
    const timestamp = nowIso();

    this.db
      .prepare(
        `INSERT INTO itch_preference_profile (
          id, profile_name, enabled, preferred_platforms_json,
          maximum_price_minor, allow_free, allow_paid,
          allow_browser_games, exclude_nsfw, minimum_score,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(profile_name) DO UPDATE SET
          enabled = excluded.enabled,
          preferred_platforms_json = excluded.preferred_platforms_json,
          maximum_price_minor = excluded.maximum_price_minor,
          allow_free = excluded.allow_free,
          allow_paid = excluded.allow_paid,
          allow_browser_games = excluded.allow_browser_games,
          exclude_nsfw = excluded.exclude_nsfw,
          minimum_score = excluded.minimum_score,
          updated_at = excluded.updated_at`,
      )
      .run(
        id,
        input.profileName,
        toSqliteBoolean(input.enabled),
        stringifyJson(input.preferredPlatforms),
        input.maximumPriceMinor ?? null,
        toSqliteBoolean(input.allowFree),
        toSqliteBoolean(input.allowPaid),
        toSqliteBoolean(input.allowBrowserGames),
        toSqliteBoolean(input.excludeNsfw),
        input.minimumScore,
        timestamp,
        timestamp,
      );

    const profile = this.findProfileByName(input.profileName);
    if (!profile) {
      throw new Error(`Failed to read preference profile: ${input.profileName}`);
    }

    return profile;
  }

  ensureDefaultProfile(): ItchPreferenceProfile {
    const existing = this.findProfileByName("Default");
    if (existing) {
      return this.upsertProfile({
        profileName: existing.profileName,
        enabled: existing.enabled,
        preferredPlatforms: existing.preferredPlatforms,
        maximumPriceMinor: existing.maximumPriceMinor,
        allowFree: existing.allowFree,
        allowPaid: existing.allowPaid,
        allowBrowserGames: existing.allowBrowserGames,
        excludeNsfw: false,
        minimumScore: existing.minimumScore,
      });
    }

    return this.upsertProfile({
      profileName: "Default",
      enabled: true,
      preferredPlatforms: ["windows"],
      allowFree: true,
      allowPaid: true,
      allowBrowserGames: true,
      excludeNsfw: false,
      minimumScore: 0,
    });
  }

  findProfileById(id: string): ItchPreferenceProfile | null {
    const row = this.db
      .prepare("SELECT * FROM itch_preference_profile WHERE id = ?")
      .get(id) as PreferenceProfileRow | undefined;

    return row ? this.mapProfile(row) : null;
  }

  findProfileByName(profileName: string): ItchPreferenceProfile | null {
    const row = this.db
      .prepare("SELECT * FROM itch_preference_profile WHERE profile_name = ?")
      .get(profileName) as PreferenceProfileRow | undefined;

    return row ? this.mapProfile(row) : null;
  }

  upsertWeight(input: UpsertPreferenceWeightInput): ItchPreferenceWeight {
    const id = input.id ?? createItchId("itch_weight");
    const timestamp = nowIso();
    const normalizedValue = this.normalizeFeatureValue(
      input.featureType,
      input.featureValue,
    );

    this.db
      .prepare(
        `INSERT INTO itch_preference_weights (
          id, profile_id, feature_type, feature_value, weight,
          origin, confidence, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(profile_id, feature_type, feature_value, origin)
        DO UPDATE SET
          weight = excluded.weight,
          confidence = excluded.confidence,
          updated_at = excluded.updated_at`,
      )
      .run(
        id,
        input.profileId,
        input.featureType,
        normalizedValue,
        input.weight,
        input.origin,
        input.confidence,
        timestamp,
        timestamp,
      );

    const row = this.db
      .prepare(
        `SELECT * FROM itch_preference_weights
         WHERE profile_id = ? AND feature_type = ?
           AND feature_value = ? AND origin = ?`,
      )
      .get(
        input.profileId,
        input.featureType,
        normalizedValue,
        input.origin,
      ) as PreferenceWeightRow | undefined;

    if (!row) {
      throw new Error(`Failed to read preference weight: ${normalizedValue}`);
    }

    return this.mapWeight(row);
  }

  listWeights(profileId: string): ItchPreferenceWeight[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM itch_preference_weights
         WHERE profile_id = ?
         ORDER BY ABS(weight) DESC, feature_type ASC, feature_value ASC`,
      )
      .all(profileId) as PreferenceWeightRow[];

    return rows.map((row) => this.mapWeight(row));
  }

  findWeight(input: {
    profileId: string;
    featureType: ItchWeightFeatureType;
    featureValue: string;
    origin: ItchWeightOrigin;
  }): ItchPreferenceWeight | null {
    const normalizedValue = this.normalizeFeatureValue(
      input.featureType,
      input.featureValue,
    );
    const row = this.db
      .prepare(
        `SELECT * FROM itch_preference_weights
         WHERE profile_id = ? AND feature_type = ?
           AND feature_value = ? AND origin = ?`,
      )
      .get(
        input.profileId,
        input.featureType,
        normalizedValue,
        input.origin,
      ) as PreferenceWeightRow | undefined;
    return row ? this.mapWeight(row) : null;
  }

  adjustWeight(input: {
    profileId: string;
    featureType: ItchWeightFeatureType;
    featureValue: string;
    origin: ItchWeightOrigin;
    delta: number;
    minimum?: number;
    maximum?: number;
    confidenceFloor?: number;
  }): ItchPreferenceWeight {
    const current = this.findWeight(input);
    const minimum = input.minimum ?? -8;
    const maximum = input.maximum ?? 8;
    const nextWeight = Math.max(
      minimum,
      Math.min(maximum, (current?.weight ?? 0) + input.delta),
    );
    const nextConfidence = Math.min(
      1,
      Math.max(input.confidenceFloor ?? 0.35, (current?.confidence ?? 0.3) + 0.04),
    );

    return this.upsertWeight({
      id: current?.id,
      profileId: input.profileId,
      featureType: input.featureType,
      featureValue: input.featureValue,
      weight: Math.round(nextWeight * 1000) / 1000,
      origin: input.origin,
      confidence: Math.round(nextConfidence * 1000) / 1000,
    });
  }


  private normalizeFeatureValue(
    featureType: ItchWeightFeatureType,
    featureValue: string,
  ): string {
    return featureType === "tag"
      ? this.tagNormalizer.normalize(featureValue).canonicalTag ??
          featureValue.trim().toLowerCase()
      : featureValue.trim().toLowerCase();
  }

  private mapProfile(row: PreferenceProfileRow): ItchPreferenceProfile {
    return {
      id: row.id,
      profileName: row.profile_name,
      enabled: fromSqliteBoolean(row.enabled),
      preferredPlatforms: parseJson<ItchPlatform[]>(
        row.preferred_platforms_json,
        [],
      ),
      maximumPriceMinor: row.maximum_price_minor ?? undefined,
      allowFree: fromSqliteBoolean(row.allow_free),
      allowPaid: fromSqliteBoolean(row.allow_paid),
      allowBrowserGames: fromSqliteBoolean(row.allow_browser_games),
      excludeNsfw: fromSqliteBoolean(row.exclude_nsfw),
      minimumScore: row.minimum_score,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapWeight(row: PreferenceWeightRow): ItchPreferenceWeight {
    return {
      id: row.id,
      profileId: row.profile_id,
      featureType: row.feature_type,
      featureValue: row.feature_value,
      weight: row.weight,
      origin: row.origin,
      confidence: row.confidence,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
