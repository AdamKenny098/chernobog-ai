import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import type Database from "better-sqlite3";

import {
  closeItchDiscoveryDatabase,
  createItchDiscoveryDatabase,
  getItchDiscoveryDatabase,
} from "../database/client";
import { resolveItchDiscoveryDatabasePath } from "../database/config";
import { ITCH_DISCOVERY_MIGRATIONS } from "../database/migrations";
import { ItchMaintenanceRunRepository } from "../repositories/itchMaintenanceRunRepository";
import type {
  ItchDatabaseBackupInfo,
  ItchDatabaseBackupResult,
  ItchDatabaseRestoreResult,
} from "../types";
import { bootstrapItchDiscovery } from "../services/bootstrapItchDiscovery";

const DEFAULT_BACKUP_RELATIVE_DIR = path.join("data", "backups", "game-radar");

export async function createItchDatabaseBackup(
  options: {
    backupDirectory?: string;
    retentionCount?: number;
    now?: Date;
    databasePath?: string;
  } = {},
  database: Database.Database = getItchDiscoveryDatabase(),
): Promise<ItchDatabaseBackupResult> {
  bootstrapItchDiscovery(database);
  const maintenance = new ItchMaintenanceRunRepository(database);
  const run = maintenance.start("backup", options.now?.toISOString());
  const now = options.now ?? new Date();
  const databasePath = resolveItchDiscoveryDatabasePath(options.databasePath);
  const backupDirectory = resolveBackupDirectory(options.backupDirectory);
  const retentionCount = clamp(options.retentionCount ?? 14, 1, 365);

  fs.mkdirSync(backupDirectory, { recursive: true });
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupDirectory, `chernobog-game-radar-${stamp}.sqlite`);
  const tempPath = `${backupPath}.partial`;

  try {
    removeIfExists(tempPath);
    await database.backup(tempPath);
    const verification = verifyItchDatabaseBackup(tempPath);
    if (!verification.valid) {
      throw new Error(`Backup verification failed: ${verification.errors.join("; ")}`);
    }
    fs.renameSync(tempPath, backupPath);

    const info = describeBackup(backupPath);
    const manifestPath = `${backupPath}.json`;
    fs.writeFileSync(manifestPath, JSON.stringify({
      ...info,
      sourceDatabasePath: databasePath,
      schemaVersion: verification.schemaVersion,
      tableCount: verification.tableCount,
    }, null, 2));

    const pruned = pruneBackups(backupDirectory, retentionCount);
    const result: ItchDatabaseBackupResult = { backup: info, manifestPath, pruned };
    maintenance.finish(run.id, { status: "completed", details: result });
    return result;
  } catch (error) {
    removeIfExists(tempPath);
    maintenance.finish(run.id, {
      status: "failed",
      errorMessage: error instanceof Error ? error.message : String(error),
      details: { backupDirectory },
    });
    throw error;
  }
}

export function verifyItchDatabaseBackup(filePath: string): {
  valid: boolean;
  schemaVersion: number;
  tableCount: number;
  errors: string[];
} {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
    return { valid: false, schemaVersion: 0, tableCount: 0, errors: ["Backup file does not exist."] };
  }

  let db: Database.Database | undefined;
  try {
    db = createItchDiscoveryDatabase({
      databasePath: absolutePath,
      readonly: true,
      runMigrations: false,
    });
    const quickCheck = db.pragma("quick_check") as Array<{ quick_check: string }>;
    const errors = quickCheck
      .map((row) => row.quick_check)
      .filter((value) => value.toLowerCase() !== "ok");
    const foreignKeys = db.pragma("foreign_key_check") as unknown[];
    if (foreignKeys.length > 0) errors.push(`${foreignKeys.length} foreign-key violation(s).`);

    const migration = db.prepare(
      "SELECT COALESCE(MAX(version), 0) AS version FROM itch_schema_migrations",
    ).get() as { version: number };
    const tables = db.prepare(
      "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name LIKE 'itch_%'",
    ).get() as { count: number };
    const latest = ITCH_DISCOVERY_MIGRATIONS.at(-1)?.version ?? 0;
    if (migration.version > latest) errors.push(`Backup schema ${migration.version} is newer than supported schema ${latest}.`);
    if (migration.version < 1) errors.push("Backup does not contain a Game Radar schema.");
    return {
      valid: errors.length === 0,
      schemaVersion: migration.version,
      tableCount: tables.count,
      errors,
    };
  } catch (error) {
    return {
      valid: false,
      schemaVersion: 0,
      tableCount: 0,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  } finally {
    db?.close();
  }
}

export function listItchDatabaseBackups(backupDirectory?: string): ItchDatabaseBackupInfo[] {
  const directory = resolveBackupDirectory(backupDirectory);
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory)
    .filter((name) => name.endsWith(".sqlite"))
    .map((name) => describeBackup(path.join(directory, name)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function restoreItchDatabaseBackup(input: {
  backupPath: string;
  confirmation: string;
  databasePath?: string;
  backupDirectory?: string;
  now?: Date;
}): Promise<ItchDatabaseRestoreResult> {
  if (input.confirmation !== "RESTORE") {
    throw new Error('Restore requires confirmation value "RESTORE".');
  }

  const backupPath = path.resolve(input.backupPath);
  const verification = verifyItchDatabaseBackup(backupPath);
  if (!verification.valid) {
    throw new Error(`Backup cannot be restored: ${verification.errors.join("; ")}`);
  }

  const databasePath = resolveItchDiscoveryDatabasePath(input.databasePath);
  if (path.resolve(databasePath) === backupPath) {
    throw new Error("Backup path and active database path cannot be the same file.");
  }

  const current = getItchDiscoveryDatabase();
  const maintenance = new ItchMaintenanceRunRepository(current);
  const run = maintenance.start("restore", input.now?.toISOString());
  const preRestore = await createItchDatabaseBackup(
    {
      backupDirectory: input.backupDirectory,
      retentionCount: 30,
      now: input.now,
      databasePath,
    },
    current,
  );

  const tempPath = `${databasePath}.restore-partial`;
  try {
    closeItchDiscoveryDatabase();
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    removeIfExists(tempPath);
    fs.copyFileSync(backupPath, tempPath);
    removeIfExists(`${databasePath}-wal`);
    removeIfExists(`${databasePath}-shm`);
    removeIfExists(databasePath);
    fs.renameSync(tempPath, databasePath);

    const restored = createItchDiscoveryDatabase({ databasePath });
    const postCheck = restored.pragma("quick_check") as Array<{ quick_check: string }>;
    if (postCheck.some((row) => row.quick_check.toLowerCase() !== "ok")) {
      restored.close();
      throw new Error("Restored database failed quick_check.");
    }
    const restoredVersion = (restored.prepare(
      "SELECT COALESCE(MAX(version), 0) AS version FROM itch_schema_migrations",
    ).get() as { version: number }).version;
    restored.close();

    const result: ItchDatabaseRestoreResult = {
      restoredFrom: backupPath,
      databasePath,
      preRestoreBackup: preRestore.backup.path,
      schemaVersion: restoredVersion,
      restoredAt: (input.now ?? new Date()).toISOString(),
    };
    const active = getItchDiscoveryDatabase();
    recordRestoreOutcome(active, run.id, run.startedAt, "completed", result);
    return result;
  } catch (error) {
    removeIfExists(tempPath);
    const active = getItchDiscoveryDatabase();
    recordRestoreOutcome(
      active,
      run.id,
      run.startedAt,
      "failed",
      { backupPath, preRestoreBackup: preRestore.backup.path },
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
}

function recordRestoreOutcome(
  database: Database.Database,
  originalRunId: string,
  startedAt: string,
  status: "completed" | "failed",
  details: Record<string, unknown>,
  errorMessage?: string,
): void {
  const repository = new ItchMaintenanceRunRepository(database);
  const run = repository.findById(originalRunId) ?? repository.start("restore", startedAt);
  repository.finish(run.id, { status, details, errorMessage });
}

function resolveBackupDirectory(value?: string): string {
  const configured = value ?? process.env.CHERNOBOG_GAME_RADAR_BACKUP_DIR ?? DEFAULT_BACKUP_RELATIVE_DIR;
  return path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured);
}

function describeBackup(filePath: string): ItchDatabaseBackupInfo {
  const stat = fs.statSync(filePath);
  return {
    path: path.resolve(filePath),
    filename: path.basename(filePath),
    sizeBytes: stat.size,
    createdAt: stat.mtime.toISOString(),
    sha256: hashFile(filePath),
  };
}

function hashFile(filePath: string): string {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function pruneBackups(directory: string, retentionCount: number): string[] {
  const backups = listItchDatabaseBackups(directory);
  const pruned: string[] = [];
  for (const backup of backups.slice(retentionCount)) {
    removeIfExists(backup.path);
    removeIfExists(`${backup.path}.json`);
    pruned.push(backup.path);
  }
  return pruned;
}

function removeIfExists(filePath: string): void {
  try {
    fs.rmSync(filePath, { force: true });
  } catch {
    // Best-effort cleanup; the caller will surface the primary error.
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, Math.floor(value)));
}
