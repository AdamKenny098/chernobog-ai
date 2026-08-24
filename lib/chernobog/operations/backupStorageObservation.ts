export const CHERNOBOG_BACKUP_STATUSES = [
    "running",
    "succeeded",
    "failed",
    "unknown",
  ] as const;
  
  export type ChernobogBackupStatus =
    (typeof CHERNOBOG_BACKUP_STATUSES)[number];
  
  export const CHERNOBOG_STORAGE_STATUSES = [
    "healthy",
    "degraded",
    "critical",
    "unavailable",
    "unknown",
  ] as const;
  
  export type ChernobogStorageStatus =
    (typeof CHERNOBOG_STORAGE_STATUSES)[number];
  
  export interface ChernobogBackupObservation {
    id: string;
  
    status: ChernobogBackupStatus;
  
    observedAt: string;
  
    nodeId?: string;
  
    destinationId?: string;
  
    startedAt?: string;
  
    completedAt?: string;
  
    durationMs?: number;
  
    bytesProcessed?: number;
  
    filesProcessed?: number;
  
    snapshotId?: string;
  
    message?: string;
  
    metadata?: Record<
      string,
      string | number | boolean | null
    >;
  }
  
  export interface ChernobogStorageObservation {
    id: string;
  
    status: ChernobogStorageStatus;
  
    observedAt: string;
  
    nodeId?: string;
  
    capacityBytes?: number;
  
    usedBytes?: number;
  
    freeBytes?: number;
  
    usagePercent?: number;
  
    mounted?: boolean;
  
    writable?: boolean;
  
    message?: string;
  
    metadata?: Record<
      string,
      string | number | boolean | null
    >;
  }
  
  export function createBackupObservation(
    input: Omit<
      ChernobogBackupObservation,
      "observedAt"
    > & {
      observedAt?: string;
    }
  ): ChernobogBackupObservation {
    return {
      ...input,
  
      observedAt:
        input.observedAt ??
        new Date().toISOString(),
    };
  }
  
  export function createStorageObservation(
    input: Omit<
      ChernobogStorageObservation,
      "observedAt"
    > & {
      observedAt?: string;
    }
  ): ChernobogStorageObservation {
    return {
      ...input,
  
      observedAt:
        input.observedAt ??
        new Date().toISOString(),
    };
  }