import type {
    ChernobogBackupObservation,
    ChernobogBackupStatus,
    ChernobogStorageObservation,
    ChernobogStorageStatus,
  } from "./backupStorageObservation";
  
  import {
    createBackupObservation,
    createStorageObservation,
  } from "./backupStorageObservation";
  
  import {
    publishBackupObservation,
    publishStorageObservation,
  } from "./backupStorageEvents";
  
  export interface BackupReport {
    id: string;
  
    status: ChernobogBackupStatus;
  
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
  
    observedAt?: string;
  }
  
  export interface StorageReport {
    id: string;
  
    status: ChernobogStorageStatus;
  
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
  
    observedAt?: string;
  }
  
  export interface BackupReportOptions {
    previousStatus?: ChernobogBackupStatus;
  }
  
  export interface StorageReportOptions {
    previousStatus?: ChernobogStorageStatus;
  }
  
  export async function reportBackupState(
    report: BackupReport,
    options: BackupReportOptions = {}
  ): Promise<ChernobogBackupObservation> {
    const observation =
      createBackupObservation({
        id: report.id,
  
        status: report.status,
  
        nodeId: report.nodeId,
  
        destinationId:
          report.destinationId,
  
        startedAt:
          report.startedAt,
  
        completedAt:
          report.completedAt,
  
        durationMs:
          report.durationMs,
  
        bytesProcessed:
          report.bytesProcessed,
  
        filesProcessed:
          report.filesProcessed,
  
        snapshotId:
          report.snapshotId,
  
        message:
          report.message,
  
        metadata:
          report.metadata,
  
        observedAt:
          report.observedAt,
      });
  
    await publishBackupObservation(
      observation,
      {
        previousStatus:
          options.previousStatus,
      }
    );
  
    return observation;
  }
  
  export async function reportStorageState(
    report: StorageReport,
    options: StorageReportOptions = {}
  ): Promise<ChernobogStorageObservation> {
    const observation =
      createStorageObservation({
        id:
          report.id,
  
        status:
          report.status,
  
        nodeId:
          report.nodeId,
  
        capacityBytes:
          report.capacityBytes,
  
        usedBytes:
          report.usedBytes,
  
        freeBytes:
          report.freeBytes,
  
        usagePercent:
          report.usagePercent,
  
        mounted:
          report.mounted,
  
        writable:
          report.writable,
  
        message:
          report.message,
  
        metadata:
          report.metadata,
  
        observedAt:
          report.observedAt,
      });
  
    await publishStorageObservation(
      observation,
      {
        previousStatus:
          options.previousStatus,
      }
    );
  
    return observation;
  }