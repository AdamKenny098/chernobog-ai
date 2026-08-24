import { publishChernobogEventSafely } from "../events/publishers";

import type {
  ChernobogBackupObservation,
  ChernobogBackupStatus,
  ChernobogStorageObservation,
  ChernobogStorageStatus,
} from "./backupStorageObservation";

export interface PublishBackupObservationOptions {
  previousStatus?: ChernobogBackupStatus;
}

export interface PublishStorageObservationOptions {
  previousStatus?: ChernobogStorageStatus;
}

function buildBackupPayload(
  observation: ChernobogBackupObservation
) {
  return {
    id: observation.id,

    status:
      observation.status,

    nodeId:
      observation.nodeId,

    destinationId:
      observation.destinationId,

    startedAt:
      observation.startedAt,

    completedAt:
      observation.completedAt,

    durationMs:
      observation.durationMs,

    bytesProcessed:
      observation.bytesProcessed,

    filesProcessed:
      observation.filesProcessed,

    snapshotId:
      observation.snapshotId,

    observedAt:
      observation.observedAt,
  };
}

function buildStoragePayload(
  observation: ChernobogStorageObservation
) {
  return {
    id:
      observation.id,

    status:
      observation.status,

    nodeId:
      observation.nodeId,

    capacityBytes:
      observation.capacityBytes,

    usedBytes:
      observation.usedBytes,

    freeBytes:
      observation.freeBytes,

    usagePercent:
      observation.usagePercent,

    mounted:
      observation.mounted,

    writable:
      observation.writable,

    observedAt:
      observation.observedAt,
  };
}

function backupRecovered(
  previousStatus:
    | ChernobogBackupStatus
    | undefined,
  currentStatus:
    ChernobogBackupStatus
): boolean {
  return (
    currentStatus === "succeeded" &&
    previousStatus !== undefined &&
    (
      previousStatus === "failed" ||
      previousStatus === "unknown"
    )
  );
}

function storageRecovered(
  previousStatus:
    | ChernobogStorageStatus
    | undefined,
  currentStatus:
    ChernobogStorageStatus
): boolean {
  return (
    currentStatus === "healthy" &&
    previousStatus !== undefined &&
    previousStatus !== "healthy"
  );
}

export async function publishBackupObservation(
  observation:
    ChernobogBackupObservation,
  options:
    PublishBackupObservationOptions = {}
): Promise<void> {
  const payload =
    buildBackupPayload(
      observation
    );

  /*
   * Neutral observation.
   */
  await publishChernobogEventSafely({
    type:
      "backup.observed",

    source: {
      subsystem:
        "backup-storage",
      nodeId:
        observation.nodeId,
    },

    severity:
      "debug",

    subject:
      observation.id,

    scope:
      observation.nodeId
        ? `node:${observation.nodeId}`
        : "backup",

    payload,

    dedupeKey: [
      "backup.observed",
      observation.id,
      observation.nodeId ??
        "local",
      observation.status,
      observation.snapshotId ??
        "no-snapshot",
    ].join(":"),

    metadata: {
      tags: [
        "backup",
        observation.status,
      ],
    },
  });

  /*
   * Recovery is a transition, not merely
   * another successful backup.
   */
  if (
    backupRecovered(
      options.previousStatus,
      observation.status
    )
  ) {
    await publishChernobogEventSafely({
      type:
        "backup.recovered",

      source: {
        subsystem:
          "backup-storage",
        nodeId:
          observation.nodeId,
      },

      severity:
        "info",

      subject:
        observation.id,

      payload: {
        ...payload,

        previousStatus:
          options.previousStatus,
      },

      dedupeKey: [
        "backup.recovered",
        observation.id,
        observation.nodeId ??
          "local",
        observation.snapshotId ??
          observation.observedAt,
      ].join(":"),

      metadata: {
        tags: [
          "backup",
          "recovered",
        ],
      },
    });
  }

  const type =
    observation.status === "running"
      ? "backup.running"
      : observation.status === "succeeded"
        ? "backup.completed"
        : observation.status === "failed"
          ? "backup.failed"
          : "backup.unknown";

  await publishChernobogEventSafely({
    type,

    source: {
      subsystem:
        "backup-storage",
      nodeId:
        observation.nodeId,
    },

    severity:
      observation.status === "failed"
        ? "warning"
        : observation.status === "unknown"
          ? "notice"
          : "info",

    subject:
      observation.id,

    payload,

    dedupeKey: [
      type,
      observation.id,
      observation.nodeId ??
        "local",
      observation.snapshotId ??
        observation.observedAt,
    ].join(":"),

    metadata: {
      tags: [
        "backup",
        observation.status,
      ],
    },
  });
}

export async function publishStorageObservation(
  observation:
    ChernobogStorageObservation,
  options:
    PublishStorageObservationOptions = {}
): Promise<void> {
  const payload =
    buildStoragePayload(
      observation
    );

  /*
   * Neutral storage observation.
   */
  await publishChernobogEventSafely({
    type:
      "storage.observed",

    source: {
      subsystem:
        "backup-storage",
      nodeId:
        observation.nodeId,
    },

    severity:
      "debug",

    subject:
      observation.id,

    scope:
      observation.nodeId
        ? `node:${observation.nodeId}`
        : "storage",

    payload,

    dedupeKey: [
      "storage.observed",
      observation.id,
      observation.nodeId ??
        "local",
      observation.status,
    ].join(":"),

    metadata: {
      tags: [
        "storage",
        observation.status,
      ],
    },
  });

  /*
   * A return to healthy is significant
   * enough to receive its own transition
   * event.
   */
  if (
    storageRecovered(
      options.previousStatus,
      observation.status
    )
  ) {
    await publishChernobogEventSafely({
      type:
        "storage.recovered",

      source: {
        subsystem:
          "backup-storage",
        nodeId:
          observation.nodeId,
      },

      severity:
        "info",

      subject:
        observation.id,

      payload: {
        ...payload,

        previousStatus:
          options.previousStatus,
      },

      dedupeKey: [
        "storage.recovered",
        observation.id,
        observation.nodeId ??
          "local",
      ].join(":"),

      metadata: {
        tags: [
          "storage",
          "recovered",
        ],
      },
    });
  }

  const type =
    observation.status === "healthy"
      ? "storage.healthy"
      : observation.status === "degraded"
        ? "storage.degraded"
        : observation.status === "critical"
          ? "storage.critical"
          : observation.status === "unavailable"
            ? "storage.unavailable"
            : "storage.unknown";

  await publishChernobogEventSafely({
    type,

    source: {
      subsystem:
        "backup-storage",
      nodeId:
        observation.nodeId,
    },

    severity:
      observation.status === "critical" ||
      observation.status === "unavailable"
        ? "warning"
        : observation.status === "degraded" ||
            observation.status === "unknown"
          ? "notice"
          : "info",

    subject:
      observation.id,

    payload,

    dedupeKey: [
      type,
      observation.id,
      observation.nodeId ??
        "local",
    ].join(":"),

    metadata: {
      tags: [
        "storage",
        observation.status,
      ],
    },
  });
}