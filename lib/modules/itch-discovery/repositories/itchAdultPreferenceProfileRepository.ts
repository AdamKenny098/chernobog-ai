import type Database from "better-sqlite3";

import { createItchId, fromSqliteBoolean, nowIso, parseJson, stringifyJson, toSqliteBoolean } from "../database/helpers";
import type { AdultPreferenceRuleState } from "../seeds/adultPreferenceProfiles";
import type { ItchFilterMetadataMode } from "../contract";

export type ItchAdultPreferenceRule = {
  id: string;
  profileId: string;
  taxonomyTag: string;
  categoryId?: string;
  state: AdultPreferenceRuleState;
  weight: number;
  source: "system" | "manual" | "learned";
  note?: string;
  createdAt: string;
  updatedAt: string;
};

export type ItchAdultPreferenceProfile = {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  enabled: boolean;
  metadataMode: ItchFilterMetadataMode;
  defaultSort: Array<{ field: string; direction: "asc" | "desc" }>;
  createdAt: string;
  updatedAt: string;
  rules: ItchAdultPreferenceRule[];
};

export type UpsertAdultPreferenceProfileInput = {
  id?: string;
  name: string;
  description: string;
  isDefault: boolean;
  enabled: boolean;
  metadataMode: ItchFilterMetadataMode;
  defaultSort: Array<{ field: string; direction: "asc" | "desc" }>;
};

export type UpsertAdultPreferenceRuleInput = {
  id?: string;
  profileId: string;
  taxonomyTag: string;
  categoryId?: string;
  state: AdultPreferenceRuleState;
  weight?: number;
  source?: "system" | "manual" | "learned";
  note?: string;
};

type ProfileRow = {
  id: string;
  name: string;
  description: string;
  is_default: number;
  enabled: number;
  metadata_mode: ItchFilterMetadataMode;
  default_sort_json: string;
  created_at: string;
  updated_at: string;
};

type RuleRow = {
  id: string;
  profile_id: string;
  taxonomy_tag: string;
  category_id: string | null;
  rule_state: AdultPreferenceRuleState;
  weight: number;
  source: "system" | "manual" | "learned";
  note: string | null;
  created_at: string;
  updated_at: string;
};

export class ItchAdultPreferenceProfileRepository {
  constructor(private readonly db: Database.Database) {}

  upsertProfile(input: UpsertAdultPreferenceProfileInput): ItchAdultPreferenceProfile {
    const timestamp = nowIso();
    const id = input.id ?? createItchId("itch_adult_profile");
    const name = input.name.trim();

    if (!name) {
      throw new Error("adult preference profile name is required");
    }

    const write = this.db.transaction(() => {
      if (input.isDefault) {
        this.db.prepare("UPDATE itch_adult_preference_profiles SET is_default = 0").run();
      }

      this.db.prepare(
        `INSERT INTO itch_adult_preference_profiles (
          id, name, description, is_default, enabled, metadata_mode,
          default_sort_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(name) DO UPDATE SET
          description = excluded.description,
          is_default = excluded.is_default,
          enabled = excluded.enabled,
          metadata_mode = excluded.metadata_mode,
          default_sort_json = excluded.default_sort_json,
          updated_at = excluded.updated_at`,
      ).run(
        id,
        name,
        input.description.trim(),
        toSqliteBoolean(input.isDefault),
        toSqliteBoolean(input.enabled),
        input.metadataMode,
        stringifyJson(input.defaultSort),
        timestamp,
        timestamp,
      );
    });
    write();

    const profile = this.findByName(name);
    if (!profile) {
      throw new Error(`Failed to read adult preference profile ${name}`);
    }
    return profile;
  }

  upsertRule(input: UpsertAdultPreferenceRuleInput): ItchAdultPreferenceRule {
    const timestamp = nowIso();
    const id = input.id ?? createItchId("itch_adult_rule");
    const tag = input.taxonomyTag.trim().toLocaleLowerCase("en-US");
    if (!tag) {
      throw new Error("taxonomy tag is required");
    }

    this.db.prepare(
      `INSERT INTO itch_adult_preference_rules (
        id, profile_id, taxonomy_tag, category_id, rule_state, weight,
        source, note, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(profile_id, taxonomy_tag) DO UPDATE SET
        category_id = excluded.category_id,
        rule_state = excluded.rule_state,
        weight = excluded.weight,
        source = excluded.source,
        note = excluded.note,
        updated_at = excluded.updated_at`,
    ).run(
      id,
      input.profileId,
      tag,
      input.categoryId ?? null,
      input.state,
      input.weight ?? (input.state === "prefer" ? 1 : input.state === "exclude" ? -5 : 0),
      input.source ?? "system",
      input.note ?? null,
      timestamp,
      timestamp,
    );

    const row = this.db.prepare(
      `SELECT * FROM itch_adult_preference_rules WHERE profile_id = ? AND taxonomy_tag = ?`,
    ).get(input.profileId, tag) as RuleRow | undefined;

    if (!row) {
      throw new Error(`Failed to read adult preference rule ${tag}`);
    }
    return this.mapRule(row);
  }

  findById(id: string): ItchAdultPreferenceProfile | null {
    const row = this.db.prepare(
      "SELECT * FROM itch_adult_preference_profiles WHERE id = ?",
    ).get(id) as ProfileRow | undefined;
    return row ? this.mapProfile(row) : null;
  }

  findByName(name: string): ItchAdultPreferenceProfile | null {
    const row = this.db.prepare(
      "SELECT * FROM itch_adult_preference_profiles WHERE lower(name) = lower(?)",
    ).get(name.trim()) as ProfileRow | undefined;
    return row ? this.mapProfile(row) : null;
  }

  findDefault(): ItchAdultPreferenceProfile | null {
    const row = this.db.prepare(
      `SELECT * FROM itch_adult_preference_profiles
       WHERE enabled = 1
       ORDER BY is_default DESC, name ASC
       LIMIT 1`,
    ).get() as ProfileRow | undefined;
    return row ? this.mapProfile(row) : null;
  }

  listProfiles(): ItchAdultPreferenceProfile[] {
    const rows = this.db.prepare(
      `SELECT * FROM itch_adult_preference_profiles
       ORDER BY is_default DESC, enabled DESC, name ASC`,
    ).all() as ProfileRow[];
    return rows.map((row) => this.mapProfile(row));
  }

  countProfiles(): number {
    const row = this.db.prepare(
      "SELECT COUNT(*) AS count FROM itch_adult_preference_profiles",
    ).get() as { count: number };
    return row.count;
  }

  countRules(): number {
    const row = this.db.prepare(
      "SELECT COUNT(*) AS count FROM itch_adult_preference_rules",
    ).get() as { count: number };
    return row.count;
  }

  listRules(profileId: string): ItchAdultPreferenceRule[] {
    const rows = this.db.prepare(
      `SELECT * FROM itch_adult_preference_rules
       WHERE profile_id = ?
       ORDER BY CASE rule_state
         WHEN 'require' THEN 1
         WHEN 'prefer' THEN 2
         WHEN 'exclude' THEN 3
         ELSE 4
       END, taxonomy_tag ASC`,
    ).all(profileId) as RuleRow[];
    return rows.map((row) => this.mapRule(row));
  }

  private mapProfile(row: ProfileRow): ItchAdultPreferenceProfile {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      isDefault: fromSqliteBoolean(row.is_default),
      enabled: fromSqliteBoolean(row.enabled),
      metadataMode: row.metadata_mode,
      defaultSort: parseJson(row.default_sort_json, []),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      rules: this.listRules(row.id),
    };
  }

  private mapRule(row: RuleRow): ItchAdultPreferenceRule {
    return {
      id: row.id,
      profileId: row.profile_id,
      taxonomyTag: row.taxonomy_tag,
      categoryId: row.category_id ?? undefined,
      state: row.rule_state,
      weight: row.weight,
      source: row.source,
      note: row.note ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
