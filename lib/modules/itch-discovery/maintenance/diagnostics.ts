import fs from "node:fs";
import path from "node:path";

import type Database from "better-sqlite3";

import { getItchDiscoveryDatabase } from "../database/client";
import { resolveItchDiscoveryDatabasePath } from "../database/config";
import { ITCH_DISCOVERY_MIGRATIONS } from "../database/migrations";
import { ItchMaintenanceRunRepository } from "../repositories/itchMaintenanceRunRepository";
import type {
  ItchDiagnosticCheck,
  ItchDiagnosticsReport,
} from "../types";
import { bootstrapItchDiscovery } from "../services/bootstrapItchDiscovery";
import { getItchDiscoveryStatus } from "../services/getItchDiscoveryStatus";
import { listItchDatabaseBackups } from "./backup";

export function runItchDiagnostics(
  options: { now?: Date; backupDirectory?: string } = {},
  database: Database.Database = getItchDiscoveryDatabase(),
): ItchDiagnosticsReport {
  bootstrapItchDiscovery(database);
  const maintenance = new ItchMaintenanceRunRepository(database);
  const run = maintenance.start("diagnostic", options.now?.toISOString());
  const now = options.now ?? new Date();
  const checks: ItchDiagnosticCheck[] = [];

  try {
    const quick = database.pragma("quick_check") as Array<{ quick_check: string }>;
    const quickErrors = quick.map((row) => row.quick_check).filter((value) => value.toLowerCase() !== "ok");
    checks.push(check("database-quick-check", quickErrors.length === 0 ? "pass" : "fail",
      quickErrors.length === 0 ? "SQLite quick_check returned ok." : quickErrors.join("; ")));

    const foreignKeys = database.pragma("foreign_key_check") as unknown[];
    checks.push(check("foreign-keys", foreignKeys.length === 0 ? "pass" : "fail",
      foreignKeys.length === 0 ? "No foreign-key violations were found." : `${foreignKeys.length} foreign-key violation(s) found.`));

    const schemaVersion = (database.prepare(
      "SELECT COALESCE(MAX(version), 0) AS version FROM itch_schema_migrations",
    ).get() as { version: number }).version;
    const latestVersion = ITCH_DISCOVERY_MIGRATIONS.at(-1)?.version ?? 0;
    checks.push(check("schema-version", schemaVersion === latestVersion ? "pass" : "fail",
      `Database schema is ${schemaVersion}; supported schema is ${latestVersion}.`, { schemaVersion, latestVersion }));

    const tableCount = (database.prepare(
      "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name LIKE 'itch_%'",
    ).get() as { count: number }).count;
    checks.push(check("schema-tables", tableCount >= 29 ? "pass" : "fail",
      `${tableCount} Game Radar tables are present.`, { tableCount }));

    const dbPath = resolveItchDiscoveryDatabasePath();
    const dbStat = fs.statSync(dbPath);
    checks.push(check("database-file", dbStat.size > 0 ? "pass" : "fail",
      `Database file is ${(dbStat.size / 1024).toFixed(1)} KiB.`, { databasePath: dbPath, sizeBytes: dbStat.size }));

    const statFs = typeof fs.statfsSync === "function" ? fs.statfsSync(path.dirname(dbPath)) : undefined;
    const freeBytes = statFs ? statFs.bavail * statFs.bsize : undefined;
    checks.push(check("free-disk-space", freeBytes === undefined || freeBytes >= 100 * 1024 * 1024 ? "pass" : "warn",
      freeBytes === undefined ? "Free disk space could not be measured." : `${(freeBytes / 1024 / 1024).toFixed(0)} MiB free on the database volume.`, { freeBytes }));

    const expiredLocks = (database.prepare(
      "SELECT COUNT(*) AS count FROM itch_operation_locks WHERE expires_at <= ?",
    ).get(now.toISOString()) as { count: number }).count;
    checks.push(check("operation-locks", expiredLocks === 0 ? "pass" : "warn",
      expiredLocks === 0 ? "No expired operation locks are present." : `${expiredLocks} expired operation lock(s) should be recovered.`, { expiredLocks }));

    const staleCutoff = new Date(now.getTime() - 2 * 60 * 60_000).toISOString();
    const staleRuns = countStaleRuns(database, staleCutoff);
    checks.push(check("stale-runs", staleRuns.total === 0 ? "pass" : "warn",
      staleRuns.total === 0 ? "No stale running jobs were found." : `${staleRuns.total} stale running job(s) should be recovered.`, staleRuns));

    const backups = listItchDatabaseBackups(options.backupDirectory);
    const latestBackup = backups[0];
    const backupAgeHours = latestBackup
      ? (now.getTime() - Date.parse(latestBackup.createdAt)) / 3_600_000
      : undefined;
    checks.push(check("database-backup", latestBackup && backupAgeHours !== undefined && backupAgeHours <= 168 ? "pass" : "warn",
      latestBackup ? `Latest verified backup is ${backupAgeHours!.toFixed(1)} hours old.` : "No Game Radar database backup exists yet.",
      latestBackup ? { latestBackup: latestBackup.path, backupAgeHours } : {}));

    const status = getItchDiscoveryStatus(database, now);
    checks.push(check("catalogue-cache", status.catalogueGames > 0 ? "pass" : "warn",
      status.catalogueGames > 0 ? `${status.catalogueGames} catalogue game(s) are available.` : "The local catalogue is empty.",
      { catalogueGames: status.catalogueGames, stale: status.stale }));

    const failedSources = (database.prepare(
      "SELECT COUNT(*) AS count FROM itch_sources WHERE enabled = 1 AND last_error IS NOT NULL",
    ).get() as { count: number }).count;
    checks.push(check("rss-sources", failedSources === 0 ? "pass" : "warn",
      failedSources === 0 ? "Enabled RSS sources have no recorded error." : `${failedSources} enabled source(s) currently have a recorded error.`, { failedSources }));

    const reportStatus = checks.some((item) => item.status === "fail")
      ? "unhealthy"
      : checks.some((item) => item.status === "warn")
        ? "degraded"
        : "healthy";
    const report: ItchDiagnosticsReport = {
      status: reportStatus,
      checks,
      databasePath: dbPath,
      schemaVersion,
      latestSchemaVersion: latestVersion,
      tableCount,
      generatedAt: now.toISOString(),
    };
    maintenance.finish(run.id, {
      status: reportStatus === "unhealthy" ? "failed" : reportStatus === "degraded" ? "partial" : "completed",
      details: report,
    });
    return report;
  } catch (error) {
    maintenance.finish(run.id, {
      status: "failed",
      errorMessage: error instanceof Error ? error.message : String(error),
      details: { checks },
    });
    throw error;
  }
}

function check(
  name: string,
  status: ItchDiagnosticCheck["status"],
  message: string,
  details?: Record<string, unknown>,
): ItchDiagnosticCheck {
  return { name, status, message, details };
}

function countStaleRuns(database: Database.Database, cutoff: string) {
  const tables = [
    "itch_pipeline_runs",
    "itch_refresh_runs",
    "itch_update_watch_runs",
    "itch_feedback_learning_runs",
  ];
  const result: Record<string, number> & { total: number } = { total: 0 };
  for (const table of tables) {
    const count = (database.prepare(
      `SELECT COUNT(*) AS count FROM ${table} WHERE status = 'running' AND started_at < ?`,
    ).get(cutoff) as { count: number }).count;
    result[table] = count;
    result.total += count;
  }
  return result;
}
