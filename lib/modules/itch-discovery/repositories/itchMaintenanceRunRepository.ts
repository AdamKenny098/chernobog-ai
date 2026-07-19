import type Database from "better-sqlite3";

import { createItchId, parseJson, stringifyJson } from "../database/helpers";
import type { ItchMaintenanceOperation } from "../contract";
import type {
  FinishItchMaintenanceRunInput,
  ItchMaintenanceRun,
} from "../types";

type Row = {
  id: string;
  operation: ItchMaintenanceOperation;
  status: ItchMaintenanceRun["status"];
  started_at: string;
  finished_at: string | null;
  details_json: string;
  error_message: string | null;
};

export class ItchMaintenanceRunRepository {
  constructor(private readonly db: Database.Database) {}

  start(operation: ItchMaintenanceOperation, startedAt = new Date().toISOString()): ItchMaintenanceRun {
    const id = createItchId("itch_maintenance");
    this.db.prepare(
      `INSERT INTO itch_maintenance_runs (
        id, operation, status, started_at, details_json
      ) VALUES (?, ?, 'running', ?, '{}')`,
    ).run(id, operation, startedAt);
    return this.findById(id)!;
  }

  finish(id: string, input: FinishItchMaintenanceRunInput): ItchMaintenanceRun {
    const finishedAt = input.finishedAt ?? new Date().toISOString();
    this.db.prepare(
      `UPDATE itch_maintenance_runs
       SET status = ?, finished_at = ?, details_json = ?, error_message = ?
       WHERE id = ?`,
    ).run(
      input.status,
      finishedAt,
      stringifyJson(input.details ?? {}),
      input.errorMessage ?? null,
      id,
    );
    const run = this.findById(id);
    if (!run) throw new Error(`Maintenance run not found after finish: ${id}`);
    return run;
  }

  findById(id: string): ItchMaintenanceRun | null {
    const row = this.db.prepare(
      `SELECT id, operation, status, started_at, finished_at, details_json, error_message
       FROM itch_maintenance_runs WHERE id = ?`,
    ).get(id) as Row | undefined;
    return row ? mapRow(row) : null;
  }

  list(limit = 50): ItchMaintenanceRun[] {
    const safeLimit = Math.min(500, Math.max(1, Math.floor(limit)));
    const rows = this.db.prepare(
      `SELECT id, operation, status, started_at, finished_at, details_json, error_message
       FROM itch_maintenance_runs
       ORDER BY started_at DESC
       LIMIT ?`,
    ).all(safeLimit) as Row[];
    return rows.map(mapRow);
  }
}

function mapRow(row: Row): ItchMaintenanceRun {
  return {
    id: row.id,
    operation: row.operation,
    status: row.status,
    startedAt: row.started_at,
    finishedAt: row.finished_at ?? undefined,
    details: parseJson<Record<string, unknown>>(row.details_json, {}),
    errorMessage: row.error_message ?? undefined,
  };
}
