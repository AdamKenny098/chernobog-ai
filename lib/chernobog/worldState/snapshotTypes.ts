import type { WorldStateRecord } from "./types";

export const CHERNOBOG_WORLD_STATE_SNAPSHOT_SCHEMA_VERSION = 1 as const;

export interface WorldStateSnapshot {
  schemaVersion: typeof CHERNOBOG_WORLD_STATE_SNAPSHOT_SCHEMA_VERSION;
  createdAt: string;
  recordCount: number;
  recordsSha256: string;
  records: WorldStateRecord[];
}

export type WorldStateSnapshotLoadResult =
  | {
      status: "missing";
    }
  | {
      status: "loaded";
      snapshot: WorldStateSnapshot;
    };

export type WorldStateRecoveryMode =
  | "snapshot-restored"
  | "snapshot-caught-up"
  | "history-rebuilt"
  | "corrupt-snapshot-rebuilt";

export interface WorldStateRecoveryResult {
  mode: WorldStateRecoveryMode;
  restoredRecords: number;
  replayedEvents: number;
  catchUpEvents: number;
  stateRecords: number;
  quarantinedPath?: string;
  persistedSnapshotPath: string;
}
