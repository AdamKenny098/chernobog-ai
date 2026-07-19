import type Database from "better-sqlite3";

import type { ItchSchedulerRunResult } from "../contract";
import {
  fromSqliteBoolean,
  nowIso,
  toSqliteBoolean,
} from "../database/helpers";
import type { ItchSchedulerSettings } from "../types";

type SchedulerRow = {
  id: string;
  enabled: number;
  interval_hours: number;
  stale_after_hours: number;
  preferred_local_hour: number;
  timezone: string;
  run_on_startup: number;
  last_checked_at: string | null;
  last_run_at: string | null;
  last_result: ItchSchedulerRunResult;
  created_at: string;
  updated_at: string;
};

export type UpdateItchSchedulerSettingsInput = Partial<
  Pick<
    ItchSchedulerSettings,
    | "enabled"
    | "intervalHours"
    | "staleAfterHours"
    | "preferredLocalHour"
    | "timezone"
    | "runOnStartup"
  >
>;

export class ItchSchedulerRepository {
  constructor(private readonly db: Database.Database) {}

  ensureDefault(): ItchSchedulerSettings {
    const existing = this.get();
    if (existing) return existing;
    const timestamp = nowIso();
    this.db
      .prepare(
        `INSERT INTO itch_scheduler_settings (
          id, enabled, interval_hours, stale_after_hours,
          preferred_local_hour, timezone, run_on_startup,
          last_result, created_at, updated_at
        ) VALUES ('default', 1, 24, 24, 4, 'Europe/Dublin', 1, 'never', ?, ?)`,
      )
      .run(timestamp, timestamp);
    return this.get()!;
  }

  get(): ItchSchedulerSettings | null {
    const row = this.db
      .prepare("SELECT * FROM itch_scheduler_settings WHERE id = 'default'")
      .get() as SchedulerRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  update(input: UpdateItchSchedulerSettingsInput): ItchSchedulerSettings {
    const current = this.ensureDefault();
    const intervalHours = integerRange(
      input.intervalHours ?? current.intervalHours,
      1,
      720,
      "intervalHours",
    );
    const staleAfterHours = integerRange(
      input.staleAfterHours ?? current.staleAfterHours,
      1,
      720,
      "staleAfterHours",
    );
    const preferredLocalHour = integerRange(
      input.preferredLocalHour ?? current.preferredLocalHour,
      0,
      23,
      "preferredLocalHour",
    );
    const timezone = (input.timezone ?? current.timezone).trim();
    validateTimezone(timezone);
    const timestamp = nowIso();

    this.db
      .prepare(
        `UPDATE itch_scheduler_settings SET
          enabled = ?, interval_hours = ?, stale_after_hours = ?,
          preferred_local_hour = ?, timezone = ?, run_on_startup = ?,
          updated_at = ?
         WHERE id = 'default'`,
      )
      .run(
        toSqliteBoolean(input.enabled ?? current.enabled),
        intervalHours,
        staleAfterHours,
        preferredLocalHour,
        timezone,
        toSqliteBoolean(input.runOnStartup ?? current.runOnStartup),
        timestamp,
      );
    return this.get()!;
  }

  recordCheck(input: {
    checkedAt: string;
    result: ItchSchedulerRunResult;
    ranAt?: string;
  }): ItchSchedulerSettings {
    this.ensureDefault();
    this.db
      .prepare(
        `UPDATE itch_scheduler_settings SET
          last_checked_at = ?,
          last_run_at = COALESCE(?, last_run_at),
          last_result = ?,
          updated_at = ?
         WHERE id = 'default'`,
      )
      .run(
        input.checkedAt,
        input.ranAt ?? null,
        input.result,
        input.checkedAt,
      );
    return this.get()!;
  }

  private mapRow(row: SchedulerRow): ItchSchedulerSettings {
    return {
      id: row.id,
      enabled: fromSqliteBoolean(row.enabled),
      intervalHours: row.interval_hours,
      staleAfterHours: row.stale_after_hours,
      preferredLocalHour: row.preferred_local_hour,
      timezone: row.timezone,
      runOnStartup: fromSqliteBoolean(row.run_on_startup),
      lastCheckedAt: row.last_checked_at ?? undefined,
      lastRunAt: row.last_run_at ?? undefined,
      lastResult: row.last_result,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

function integerRange(
  value: number,
  minimum: number,
  maximum: number,
  name: string,
): number {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new TypeError(`${name} must be an integer from ${minimum} to ${maximum}.`);
  }
  return value;
}

function validateTimezone(timezone: string): void {
  if (!timezone || timezone.length > 100) {
    throw new TypeError("timezone must be a non-empty IANA timezone name.");
  }
  try {
    new Intl.DateTimeFormat("en-IE", { timeZone: timezone }).format(new Date());
  } catch {
    throw new TypeError(`Unsupported timezone: ${timezone}`);
  }
}
