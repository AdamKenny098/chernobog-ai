import Database from "better-sqlite3";
import path from "node:path";

/**
 * OH-1L Personal Assistance persistence ownership boundary.
 *
 * PA retains the accepted physical database location and CHERNOBOG_DATA_DIR
 * override semantics while owning its own SQLite connection. No PA tables or
 * stored state are moved, copied, renamed, reset, or deleted here.
 */
const configuredDataDirectory = process.env.CHERNOBOG_DATA_DIR?.trim();
const dataDirectory = configuredDataDirectory
  ? path.resolve(configuredDataDirectory)
  : path.resolve(process.cwd(), "data");

export const personalAssistanceDatabasePath = path.join(
  dataDirectory,
  "chernobog.db",
);

export const personalAssistanceDb = new Database(
  personalAssistanceDatabasePath,
);
personalAssistanceDb.pragma("journal_mode = WAL");

export function closePersonalAssistancePersistence(): void {
  try {
    personalAssistanceDb.close();
  } catch {
    // Best-effort lifecycle cleanup for isolated verifier processes.
  }
}

// Compatibility exports preserve the accepted store import shapes.
export const db = personalAssistanceDb;
export default personalAssistanceDb;
