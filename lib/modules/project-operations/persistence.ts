import Database from "better-sqlite3";
import path from "node:path";

/**
 * OH-1L ownership boundary for Project Operations persistence.
 *
 * Project Operations continues to use the existing physical Chernobog database
 * so no stored project data is moved or rewritten during decomposition. The
 * project domain owns its own connection and project_operations_* tables instead
 * of borrowing Core's persistence implementation.
 */
const configuredDataDirectory = process.env.CHERNOBOG_DATA_DIR?.trim();
const dataDirectory = configuredDataDirectory
  ? path.resolve(configuredDataDirectory)
  : path.resolve(process.cwd(), "data");

export const projectOperationsDatabasePath = path.join(
  dataDirectory,
  "chernobog.db",
);

export const projectOperationsDb = new Database(
  projectOperationsDatabasePath,
);
projectOperationsDb.pragma("journal_mode = WAL");

export function closeProjectOperationsPersistence(): void {
  try {
    projectOperationsDb.close();
  } catch {
    // Best-effort lifecycle cleanup for isolated verifier processes.
  }
}

export default projectOperationsDb;
