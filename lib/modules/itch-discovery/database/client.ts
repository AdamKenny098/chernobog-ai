import Database from "better-sqlite3";

import { ItchDiscoveryDatabaseError } from "../errors";
import {
  ensureItchDiscoveryDatabaseDirectory,
  resolveItchDiscoveryDatabasePath,
} from "./config";
import { runItchDiscoveryMigrations } from "./migrations";

export type ItchDiscoveryDatabase = Database.Database;

export type CreateItchDiscoveryDatabaseOptions = {
  databasePath?: string;
  readonly?: boolean;
  runMigrations?: boolean;
};

let singletonDatabase: ItchDiscoveryDatabase | null = null;
let singletonPath: string | null = null;

export function createItchDiscoveryDatabase(
  options: CreateItchDiscoveryDatabaseOptions = {},
): ItchDiscoveryDatabase {
  const databasePath = resolveItchDiscoveryDatabasePath(options.databasePath);

  if (!options.readonly) {
    ensureItchDiscoveryDatabaseDirectory(databasePath);
  }

  try {
    const db = new Database(databasePath, {
      readonly: options.readonly ?? false,
      fileMustExist: options.readonly ?? false,
    });

    db.pragma("foreign_keys = ON");
    db.pragma("busy_timeout = 5000");

    if (!options.readonly) {
      db.pragma("journal_mode = WAL");
      db.pragma("synchronous = NORMAL");
      db.pragma("temp_store = MEMORY");
    }

    if (options.runMigrations !== false && !options.readonly) {
      runItchDiscoveryMigrations(db);
    }

    return db;
  } catch (error) {
    throw new ItchDiscoveryDatabaseError(
      `Failed to open the Game Radar database at ${databasePath}.`,
      { cause: error },
    );
  }
}

export function getItchDiscoveryDatabase(): ItchDiscoveryDatabase {
  const databasePath = resolveItchDiscoveryDatabasePath();

  if (singletonDatabase && singletonPath === databasePath) {
    return singletonDatabase;
  }

  singletonDatabase?.close();
  singletonDatabase = createItchDiscoveryDatabase({ databasePath });
  singletonPath = databasePath;

  return singletonDatabase;
}

export function closeItchDiscoveryDatabase(): void {
  singletonDatabase?.close();
  singletonDatabase = null;
  singletonPath = null;
}
