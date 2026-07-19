import type Database from "better-sqlite3";

import type {
  ItchPipelineError,
  ItchPipelineRun,
} from "../types";
import type {
  ItchPipelinePhase,
  ItchRefreshStatus,
  ItchRefreshTrigger,
} from "../contract";
import {
  createItchId,
  fromSqliteBoolean,
  nowIso,
  parseJson,
  stringifyJson,
  toSqliteBoolean,
} from "../database/helpers";

type PipelineRunRow = {
  id: string;
  trigger: ItchRefreshTrigger;
  started_at: string;
  finished_at: string | null;
  status: ItchRefreshStatus;
  current_phase: ItchPipelinePhase;
  rss_refresh_run_id: string | null;
  update_watch_run_id: string | null;
  recommendation_batch_id: string | null;
  notification_digest_id: string | null;
  metrics_json: string;
  errors_json: string;
  used_cached_catalogue: number;
};

export type UpdateItchPipelineRunInput = {
  status?: ItchRefreshStatus;
  currentPhase?: ItchPipelinePhase;
  finishedAt?: string;
  rssRefreshRunId?: string;
  updateWatchRunId?: string;
  recommendationBatchId?: string;
  notificationDigestId?: string;
  metrics?: Record<string, unknown>;
  errors?: ItchPipelineError[];
  usedCachedCatalogue?: boolean;
};

export class ItchPipelineRunRepository {
  constructor(private readonly db: Database.Database) {}

  start(
    trigger: ItchRefreshTrigger,
    startedAt = nowIso(),
  ): ItchPipelineRun {
    const run: ItchPipelineRun = {
      id: createItchId("itch_pipeline"),
      trigger,
      startedAt,
      status: "running",
      currentPhase: "starting",
      metrics: {},
      errors: [],
      usedCachedCatalogue: false,
    };

    this.db
      .prepare(
        `INSERT INTO itch_pipeline_runs (
          id, trigger, started_at, status, current_phase,
          metrics_json, errors_json, used_cached_catalogue
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        run.id,
        run.trigger,
        run.startedAt,
        run.status,
        run.currentPhase,
        stringifyJson(run.metrics),
        stringifyJson(run.errors),
        toSqliteBoolean(run.usedCachedCatalogue),
      );

    return run;
  }

  update(id: string, input: UpdateItchPipelineRunInput): ItchPipelineRun {
    const current = this.findById(id);
    if (!current) {
      throw new Error(`Pipeline run not found: ${id}`);
    }

    const next = {
      status: input.status ?? current.status,
      currentPhase: input.currentPhase ?? current.currentPhase,
      finishedAt:
        input.finishedAt === undefined ? current.finishedAt : input.finishedAt,
      rssRefreshRunId: input.rssRefreshRunId ?? current.rssRefreshRunId,
      updateWatchRunId: input.updateWatchRunId ?? current.updateWatchRunId,
      recommendationBatchId:
        input.recommendationBatchId ?? current.recommendationBatchId,
      notificationDigestId:
        input.notificationDigestId ?? current.notificationDigestId,
      metrics: input.metrics ?? current.metrics,
      errors: input.errors ?? current.errors,
      usedCachedCatalogue:
        input.usedCachedCatalogue ?? current.usedCachedCatalogue,
    };

    this.db
      .prepare(
        `UPDATE itch_pipeline_runs SET
          finished_at = ?,
          status = ?,
          current_phase = ?,
          rss_refresh_run_id = ?,
          update_watch_run_id = ?,
          recommendation_batch_id = ?,
          notification_digest_id = ?,
          metrics_json = ?,
          errors_json = ?,
          used_cached_catalogue = ?
         WHERE id = ?`,
      )
      .run(
        next.finishedAt ?? null,
        next.status,
        next.currentPhase,
        next.rssRefreshRunId ?? null,
        next.updateWatchRunId ?? null,
        next.recommendationBatchId ?? null,
        next.notificationDigestId ?? null,
        stringifyJson(next.metrics),
        stringifyJson(next.errors),
        toSqliteBoolean(next.usedCachedCatalogue),
        id,
      );

    const updated = this.findById(id);
    if (!updated) {
      throw new Error(`Failed to update pipeline run: ${id}`);
    }

    return updated;
  }

  finish(
    id: string,
    input: Omit<UpdateItchPipelineRunInput, "finishedAt"> & {
      status: Exclude<ItchRefreshStatus, "running">;
      finishedAt?: string;
    },
  ): ItchPipelineRun {
    return this.update(id, {
      ...input,
      currentPhase: "completed",
      finishedAt: input.finishedAt ?? nowIso(),
    });
  }

  findById(id: string): ItchPipelineRun | null {
    const row = this.db
      .prepare("SELECT * FROM itch_pipeline_runs WHERE id = ?")
      .get(id) as PipelineRunRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  getLatest(): ItchPipelineRun | null {
    const row = this.db
      .prepare(
        `SELECT * FROM itch_pipeline_runs
         ORDER BY started_at DESC
         LIMIT 1`,
      )
      .get() as PipelineRunRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  list(limit = 30): ItchPipelineRun[] {
    const safeLimit = Math.max(1, Math.min(200, Math.floor(limit)));
    return (
      this.db
        .prepare(
          `SELECT * FROM itch_pipeline_runs
           ORDER BY started_at DESC
           LIMIT ?`,
        )
        .all(safeLimit) as PipelineRunRow[]
    ).map((row) => this.mapRow(row));
  }

  private mapRow(row: PipelineRunRow): ItchPipelineRun {
    return {
      id: row.id,
      trigger: row.trigger,
      startedAt: row.started_at,
      finishedAt: row.finished_at ?? undefined,
      status: row.status,
      currentPhase: row.current_phase,
      rssRefreshRunId: row.rss_refresh_run_id ?? undefined,
      updateWatchRunId: row.update_watch_run_id ?? undefined,
      recommendationBatchId: row.recommendation_batch_id ?? undefined,
      notificationDigestId: row.notification_digest_id ?? undefined,
      metrics: parseJson<Record<string, unknown>>(row.metrics_json, {}),
      errors: parseJson<ItchPipelineError[]>(row.errors_json, []),
      usedCachedCatalogue: fromSqliteBoolean(row.used_cached_catalogue),
    };
  }
}
