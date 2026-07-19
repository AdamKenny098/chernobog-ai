import type Database from "better-sqlite3";

import type { ItchRefreshStatus, ItchRefreshTrigger } from "../contract";
import type {
  FinishItchRefreshRunInput,
  ItchRefreshRun,
} from "../types";
import {
  createItchId,
  nowIso,
  parseJson,
  stringifyJson,
} from "../database/helpers";

type RefreshRunRow = {
  id: string;
  trigger: ItchRefreshTrigger;
  started_at: string;
  finished_at: string | null;
  status: ItchRefreshStatus;
  sources_attempted: number;
  sources_succeeded: number;
  entries_scanned: number;
  unique_games_found: number;
  new_games_added: number;
  games_updated: number;
  games_enriched: number;
  games_rejected: number;
  recommendations_created: number;
  errors_json: string;
};

export class ItchRefreshRunRepository {
  constructor(private readonly db: Database.Database) {}

  start(trigger: ItchRefreshTrigger): ItchRefreshRun {
    const run: ItchRefreshRun = {
      id: createItchId("itch_refresh"),
      trigger,
      startedAt: nowIso(),
      status: "running",
      sourcesAttempted: 0,
      sourcesSucceeded: 0,
      entriesScanned: 0,
      uniqueGamesFound: 0,
      newGamesAdded: 0,
      gamesUpdated: 0,
      gamesEnriched: 0,
      gamesRejected: 0,
      recommendationsCreated: 0,
      errors: [],
    };

    this.db
      .prepare(
        `INSERT INTO itch_refresh_runs (
          id, trigger, started_at, status, sources_attempted,
          sources_succeeded, entries_scanned, unique_games_found,
          new_games_added, games_updated, games_enriched, games_rejected,
          recommendations_created, errors_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        run.id,
        run.trigger,
        run.startedAt,
        run.status,
        run.sourcesAttempted,
        run.sourcesSucceeded,
        run.entriesScanned,
        run.uniqueGamesFound,
        run.newGamesAdded,
        run.gamesUpdated,
        run.gamesEnriched,
        run.gamesRejected,
        run.recommendationsCreated,
        stringifyJson(run.errors),
      );

    return run;
  }

  finish(id: string, input: FinishItchRefreshRunInput): ItchRefreshRun | null {
    const current = this.findById(id);
    if (!current) {
      return null;
    }

    const finishedAt = input.finishedAt ?? nowIso();

    this.db
      .prepare(
        `UPDATE itch_refresh_runs SET
          finished_at = ?,
          status = ?,
          sources_attempted = ?,
          sources_succeeded = ?,
          entries_scanned = ?,
          unique_games_found = ?,
          new_games_added = ?,
          games_updated = ?,
          games_enriched = ?,
          games_rejected = ?,
          recommendations_created = ?,
          errors_json = ?
         WHERE id = ?`,
      )
      .run(
        finishedAt,
        input.status,
        input.sourcesAttempted ?? current.sourcesAttempted,
        input.sourcesSucceeded ?? current.sourcesSucceeded,
        input.entriesScanned ?? current.entriesScanned,
        input.uniqueGamesFound ?? current.uniqueGamesFound,
        input.newGamesAdded ?? current.newGamesAdded,
        input.gamesUpdated ?? current.gamesUpdated,
        input.gamesEnriched ?? current.gamesEnriched,
        input.gamesRejected ?? current.gamesRejected,
        input.recommendationsCreated ?? current.recommendationsCreated,
        stringifyJson(input.errors ?? current.errors),
        id,
      );

    return this.findById(id);
  }

  findById(id: string): ItchRefreshRun | null {
    const row = this.db
      .prepare("SELECT * FROM itch_refresh_runs WHERE id = ?")
      .get(id) as RefreshRunRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  getLatest(): ItchRefreshRun | null {
    const row = this.db
      .prepare(
        `SELECT * FROM itch_refresh_runs
         ORDER BY started_at DESC
         LIMIT 1`,
      )
      .get() as RefreshRunRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  private mapRow(row: RefreshRunRow): ItchRefreshRun {
    return {
      id: row.id,
      trigger: row.trigger,
      startedAt: row.started_at,
      finishedAt: row.finished_at ?? undefined,
      status: row.status,
      sourcesAttempted: row.sources_attempted,
      sourcesSucceeded: row.sources_succeeded,
      entriesScanned: row.entries_scanned,
      uniqueGamesFound: row.unique_games_found,
      newGamesAdded: row.new_games_added,
      gamesUpdated: row.games_updated,
      gamesEnriched: row.games_enriched,
      gamesRejected: row.games_rejected,
      recommendationsCreated: row.recommendations_created,
      errors: parseJson<Array<Record<string, unknown>>>(row.errors_json, []),
    };
  }
}
