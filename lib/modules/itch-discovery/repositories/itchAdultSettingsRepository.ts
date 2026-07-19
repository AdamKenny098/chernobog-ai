import type Database from "better-sqlite3";

import { fromSqliteBoolean, nowIso, parseJson, stringifyJson, toSqliteBoolean } from "../database/helpers";
import type { ItchAdultSettings } from "../types";

const DEFAULT_BLOCKED_TERMS = [
  "non-consensual",
  "non consensual",
  "barely legal",
  "underage",
  "minor-presenting",
  "minor presenting",
  "pseudo-incest",
  "pseudo incest",
  "incest",
  "bestiality",
  "sexual violence",
  "rape",
  "coercion",
  "sex trafficking",
  "revenge porn",
  "hidden cam",
  "scat",
  "vomit fetish",
  "extreme harm",
];

const DEFAULT_ADULT_TAGS = [
  "adult",
  "nsfw",
  "erotic",
  "adult-visual-novel",
  "adult-dating-sim",
  "mature-romance",
];

type Row = {
  id: "default";
  enabled: number;
  adult_only: number;
  age_gate_required: number;
  blur_covers_by_default: number;
  discreet_notifications: number;
  hide_explicit_titles: number;
  block_unknown_age_content: number;
  hard_excluded_terms_json: string;
  preferred_adult_tags_json: string;
  created_at: string;
  updated_at: string;
};

export class ItchAdultSettingsRepository {
  constructor(private readonly db: Database.Database) {}

  ensureDefault(): ItchAdultSettings {
    const existing = this.get();
    if (existing) return existing;
    const now = nowIso();
    this.db.prepare(
      `INSERT INTO itch_adult_settings (
        id, enabled, adult_only, age_gate_required, blur_covers_by_default,
        discreet_notifications, hide_explicit_titles, block_unknown_age_content,
        hard_excluded_terms_json, preferred_adult_tags_json, created_at, updated_at
      ) VALUES ('default', 1, 1, 1, 0, 1, 0, 1, ?, ?, ?, ?)`,
    ).run(stringifyJson(DEFAULT_BLOCKED_TERMS), stringifyJson(DEFAULT_ADULT_TAGS), now, now);
    return this.get()!;
  }

  get(): ItchAdultSettings | null {
    const row = this.db.prepare("SELECT * FROM itch_adult_settings WHERE id = 'default'").get() as Row | undefined;
    return row ? this.map(row) : null;
  }

  update(input: Partial<Omit<ItchAdultSettings, "id" | "createdAt" | "updatedAt">>): ItchAdultSettings {
    const current = this.ensureDefault();
    const next = { ...current, ...input, updatedAt: nowIso() };
    this.db.prepare(
      `UPDATE itch_adult_settings SET
        enabled = ?, adult_only = ?, age_gate_required = ?, blur_covers_by_default = ?,
        discreet_notifications = ?, hide_explicit_titles = ?, block_unknown_age_content = ?,
        hard_excluded_terms_json = ?, preferred_adult_tags_json = ?, updated_at = ?
       WHERE id = 'default'`,
    ).run(
      toSqliteBoolean(next.enabled), toSqliteBoolean(next.adultOnly),
      toSqliteBoolean(next.ageGateRequired), toSqliteBoolean(next.blurCoversByDefault),
      toSqliteBoolean(next.discreetNotifications), toSqliteBoolean(next.hideExplicitTitles),
      toSqliteBoolean(next.blockUnknownAgeContent), stringifyJson(next.hardExcludedTerms),
      stringifyJson(next.preferredAdultTags), next.updatedAt,
    );
    return this.get()!;
  }

  private map(row: Row): ItchAdultSettings {
    return {
      id: "default",
      enabled: fromSqliteBoolean(row.enabled),
      adultOnly: fromSqliteBoolean(row.adult_only),
      ageGateRequired: fromSqliteBoolean(row.age_gate_required),
      blurCoversByDefault: fromSqliteBoolean(row.blur_covers_by_default),
      discreetNotifications: fromSqliteBoolean(row.discreet_notifications),
      hideExplicitTitles: fromSqliteBoolean(row.hide_explicit_titles),
      blockUnknownAgeContent: fromSqliteBoolean(row.block_unknown_age_content),
      hardExcludedTerms: parseJson<string[]>(row.hard_excluded_terms_json, DEFAULT_BLOCKED_TERMS),
      preferredAdultTags: parseJson<string[]>(row.preferred_adult_tags_json, DEFAULT_ADULT_TAGS),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
