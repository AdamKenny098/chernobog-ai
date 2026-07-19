import type Database from "better-sqlite3";

import { getItchDiscoveryDatabase } from "../database/client";
import { parseJson, stringifyJson } from "../database/helpers";
import { ItchMaintenanceRunRepository } from "../repositories/itchMaintenanceRunRepository";
import type { ItchRuntimeRecoveryResult } from "../types";
import { bootstrapItchDiscovery } from "../services/bootstrapItchDiscovery";

const DEFAULT_STALE_AFTER_MS = 2 * 60 * 60_000;

export function recoverItchRuntimeState(
  options: { now?: Date; staleAfterMs?: number } = {},
  database: Database.Database = getItchDiscoveryDatabase(),
): ItchRuntimeRecoveryResult {
  bootstrapItchDiscovery(database);
  const runs = new ItchMaintenanceRunRepository(database);
  const run = runs.start("recovery", options.now?.toISOString());
  const now = options.now ?? new Date();
  const staleAfterMs = clamp(options.staleAfterMs ?? DEFAULT_STALE_AFTER_MS, 60_000, 24 * 60 * 60_000);
  const cutoff = new Date(now.getTime() - staleAfterMs).toISOString();

  try {
    const expiredLocksRemoved = database
      .prepare("DELETE FROM itch_operation_locks WHERE expires_at <= ?")
      .run(now.toISOString()).changes;

    const pipelineRunsRecovered = recoverRuns(database, {
      table: "itch_pipeline_runs",
      cutoff,
      now: now.toISOString(),
      errorColumn: "errors_json",
      phaseColumn: "current_phase",
    });
    const refreshRunsRecovered = recoverRuns(database, {
      table: "itch_refresh_runs",
      cutoff,
      now: now.toISOString(),
      errorColumn: "errors_json",
    });
    const updateRunsRecovered = recoverRuns(database, {
      table: "itch_update_watch_runs",
      cutoff,
      now: now.toISOString(),
      errorColumn: "errors_json",
    });
    const feedbackRunsRecovered = recoverRuns(database, {
      table: "itch_feedback_learning_runs",
      cutoff,
      now: now.toISOString(),
      errorColumn: "errors_json",
    });

    const result: ItchRuntimeRecoveryResult = {
      expiredLocksRemoved,
      pipelineRunsRecovered,
      refreshRunsRecovered,
      updateRunsRecovered,
      feedbackRunsRecovered,
      recoveredAt: now.toISOString(),
    };
    runs.finish(run.id, { status: "completed", details: result });
    return result;
  } catch (error) {
    runs.finish(run.id, {
      status: "failed",
      details: {},
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

function recoverRuns(
  database: Database.Database,
  input: {
    table: string;
    cutoff: string;
    now: string;
    errorColumn: string;
    phaseColumn?: string;
  },
): number {
  const rows = database.prepare(
    `SELECT id, ${input.errorColumn} AS errors_json
     FROM ${input.table}
     WHERE status = 'running' AND started_at < ?`,
  ).all(input.cutoff) as Array<{ id: string; errors_json: string }>;

  const updateSql = input.phaseColumn
    ? `UPDATE ${input.table}
       SET status = 'failed', finished_at = ?, ${input.phaseColumn} = 'completed', ${input.errorColumn} = ?
       WHERE id = ? AND status = 'running'`
    : `UPDATE ${input.table}
       SET status = 'failed', finished_at = ?, ${input.errorColumn} = ?
       WHERE id = ? AND status = 'running'`;
  const update = database.prepare(updateSql);

  const transaction = database.transaction(() => {
    let changed = 0;
    for (const row of rows) {
      const errors = parseJson<Array<Record<string, unknown>>>(row.errors_json, []);
      errors.push({
        code: "GAME_RADAR_STALE_RUN_RECOVERED",
        message: "The process ended while this run was active. Stage K marked it failed during recovery.",
        recoveredAt: input.now,
      });
      changed += update.run(input.now, stringifyJson(errors), row.id).changes;
    }
    return changed;
  });

  return transaction();
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, Math.floor(value)));
}
