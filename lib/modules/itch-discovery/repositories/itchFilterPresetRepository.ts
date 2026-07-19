import type Database from "better-sqlite3";

import type { ItchFilterRule } from "../contract";
import {
  ItchDiscoveryNotFoundError,
  ItchFilterValidationError,
} from "../errors";
import type { ItchFilterPreset, UpsertItchFilterPresetInput } from "../types";
import {
  createItchId,
  fromSqliteBoolean,
  nowIso,
  parseJson,
  stringifyJson,
  toSqliteBoolean,
} from "../database/helpers";
import { normalizeItchFilterQuery } from "../filtering/normalizeItchFilter";

type FilterPresetRow = {
  id: string;
  name: string;
  description: string | null;
  is_default: number;
  is_system: number;
  rules_json: string;
  sort_json: string;
  created_at: string;
  updated_at: string;
};

export class ItchFilterPresetRepository {
  constructor(private readonly db: Database.Database) {}

  upsert(input: UpsertItchFilterPresetInput): ItchFilterPreset {
    const name = input.name.trim();
    if (!name) {
      throw new ItchFilterValidationError(["filter preset name is required"]);
    }
    if (name.length > 100) {
      throw new ItchFilterValidationError([
        "filter preset name cannot exceed 100 characters",
      ]);
    }

    const normalized = normalizeItchFilterQuery(this.db, {
      rules: input.rules,
      sort: input.sort,
      limit: 1,
    });
    const metadataRule = input.rules.find(
      (rule): rule is Extract<ItchFilterRule, { field: "metadataCompleteness" }> =>
        rule.field === "metadataCompleteness",
    );
    const normalizedRules: ItchFilterRule[] = metadataRule
      ? [
          ...normalized.rules,
          { field: "metadataCompleteness", operator: normalized.metadataMode },
        ]
      : normalized.rules;

    const existingById = input.id ? this.findById(input.id) : null;
    const existingByName = this.findByName(name);
    if (existingByName && existingByName.id !== existingById?.id) {
      if (input.id) {
        throw new ItchFilterValidationError([
          `a filter preset named "${name}" already exists`,
        ]);
      }
    }

    const id = existingById?.id ?? existingByName?.id ?? input.id ?? createItchId("itch_filter");
    const timestamp = nowIso();

    const write = this.db.transaction(() => {
      if (input.isDefault) {
        this.db.prepare("UPDATE itch_filter_presets SET is_default = 0").run();
      }

      if (existingById || existingByName) {
        this.db
          .prepare(
            `UPDATE itch_filter_presets SET
               name = ?,
               description = ?,
               is_default = ?,
               is_system = ?,
               rules_json = ?,
               sort_json = ?,
               updated_at = ?
             WHERE id = ?`,
          )
          .run(
            name,
            input.description?.trim() || null,
            toSqliteBoolean(input.isDefault),
            toSqliteBoolean(input.isSystem),
            stringifyJson(normalizedRules),
            stringifyJson(normalized.sort),
            timestamp,
            id,
          );
      } else {
        this.db
          .prepare(
            `INSERT INTO itch_filter_presets (
              id, name, description, is_default, is_system,
              rules_json, sort_json, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            id,
            name,
            input.description?.trim() || null,
            toSqliteBoolean(input.isDefault),
            toSqliteBoolean(input.isSystem),
            stringifyJson(normalizedRules),
            stringifyJson(normalized.sort),
            timestamp,
            timestamp,
          );
      }
    });

    write();

    const preset = this.findById(id);
    if (!preset) {
      throw new Error(`Failed to read filter preset ${name}`);
    }

    return preset;
  }

  findById(id: string): ItchFilterPreset | null {
    const row = this.db
      .prepare("SELECT * FROM itch_filter_presets WHERE id = ?")
      .get(id) as FilterPresetRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  findByName(name: string): ItchFilterPreset | null {
    const row = this.db
      .prepare(
        `SELECT * FROM itch_filter_presets
         WHERE lower(name) = lower(?)`,
      )
      .get(name.trim()) as FilterPresetRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  findDefault(): ItchFilterPreset | null {
    const row = this.db
      .prepare(
        `SELECT * FROM itch_filter_presets
         ORDER BY is_default DESC, is_system DESC, name ASC
         LIMIT 1`,
      )
      .get() as FilterPresetRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  listAll(): ItchFilterPreset[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM itch_filter_presets
         ORDER BY is_default DESC, is_system DESC, name ASC`,
      )
      .all() as FilterPresetRow[];

    return rows.map((row) => this.mapRow(row));
  }

  setDefault(id: string): ItchFilterPreset {
    if (!this.findById(id)) {
      throw new ItchDiscoveryNotFoundError("Game Radar filter preset", id);
    }

    const update = this.db.transaction(() => {
      this.db.prepare("UPDATE itch_filter_presets SET is_default = 0").run();
      this.db
        .prepare(
          `UPDATE itch_filter_presets
           SET is_default = 1, updated_at = ?
           WHERE id = ?`,
        )
        .run(nowIso(), id);
    });
    update();

    const preset = this.findById(id);
    if (!preset) {
      throw new Error(`Failed to set default filter preset: ${id}`);
    }
    return preset;
  }

  duplicate(id: string, newName: string): ItchFilterPreset {
    const source = this.findById(id);
    if (!source) {
      throw new ItchDiscoveryNotFoundError("Game Radar filter preset", id);
    }

    return this.upsert({
      name: newName,
      description: source.description,
      isDefault: false,
      isSystem: false,
      rules: source.rules,
      sort: source.sort,
    });
  }

  deleteById(id: string, options: { allowSystem?: boolean } = {}): boolean {
    const preset = this.findById(id);
    if (!preset) {
      return false;
    }
    if (preset.isSystem && !options.allowSystem) {
      throw new ItchFilterValidationError([
        "system filter presets cannot be deleted",
      ]);
    }

    const remove = this.db.transaction(() => {
      this.db.prepare("DELETE FROM itch_filter_presets WHERE id = ?").run(id);
      if (preset.isDefault) {
        const replacement = this.db
          .prepare(
            `SELECT id FROM itch_filter_presets
             ORDER BY is_system DESC, name ASC
             LIMIT 1`,
          )
          .get() as { id: string } | undefined;
        if (replacement) {
          this.db
            .prepare(
              `UPDATE itch_filter_presets
               SET is_default = 1, updated_at = ?
               WHERE id = ?`,
            )
            .run(nowIso(), replacement.id);
        }
      }
    });
    remove();
    return true;
  }

  count(): number {
    const row = this.db
      .prepare("SELECT COUNT(*) AS count FROM itch_filter_presets")
      .get() as { count: number };

    return row.count;
  }

  private mapRow(row: FilterPresetRow): ItchFilterPreset {
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      isDefault: fromSqliteBoolean(row.is_default),
      isSystem: fromSqliteBoolean(row.is_system),
      rules: parseJson(row.rules_json, []),
      sort: parseJson(row.sort_json, []),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
