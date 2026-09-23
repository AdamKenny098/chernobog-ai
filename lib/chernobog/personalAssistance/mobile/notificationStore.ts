import db from "../../db";
import {
  getPersonalAssistanceProfile,
} from "../profileStore";
import type {
  PersonalAssistanceMobileDevice,
} from "./types";
import type {
  PersonalAssistanceMobileNotificationBatchInput,
  PersonalAssistanceMobileNotificationBatchResult,
  PersonalAssistanceMobileNotificationInput,
  PersonalAssistanceMobileNotificationResult,
  PersonalAssistanceStoredNotification,
} from "./notificationTypes";

const MAX_BATCH_SIZE = 100;
type ReceiptRow = {
  event_id: string;
  device_id: string;
  disposition: string;
  received_at: string;
  processed_at: string | null;
};
type StoredNotificationRow = {
  notification_json: string;
};

db.exec(`
CREATE TABLE IF NOT EXISTS personal_assistance_mobile_notification (
  event_id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  capture_mode TEXT NOT NULL,
  notification_json TEXT NOT NULL,
  posted_at TEXT NOT NULL,
  received_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_personal_assistance_mobile_notification_received
ON personal_assistance_mobile_notification(received_at DESC);

CREATE INDEX IF NOT EXISTS idx_personal_assistance_mobile_notification_device
ON personal_assistance_mobile_notification(device_id, received_at DESC);

CREATE TABLE IF NOT EXISTS personal_assistance_mobile_notification_receipt (
  event_id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  disposition TEXT NOT NULL,
  received_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_personal_assistance_mobile_notification_receipt_received
ON personal_assistance_mobile_notification_receipt(received_at);
`);

const receiptColumns =
  db.prepare(
    "PRAGMA table_info(personal_assistance_mobile_notification_receipt)",
  ).all() as Array<{
    name: string;
  }>;

if (
  !receiptColumns.some(
    (column) =>
      column.name ===
      "processed_at",
  )
) {
  db.exec(`
    ALTER TABLE personal_assistance_mobile_notification_receipt
    ADD COLUMN processed_at TEXT
  `);
}

const readReceiptStatement = db.prepare(`
SELECT
  event_id,
  device_id,
  disposition,
  received_at,
  processed_at
FROM personal_assistance_mobile_notification_receipt
WHERE event_id = ?
LIMIT 1
`);

const insertReceiptStatement = db.prepare(`
INSERT INTO personal_assistance_mobile_notification_receipt (
  event_id,
  device_id,
  disposition,
  received_at,
  processed_at
)
VALUES (?, ?, ?, ?, ?)
`);

const markReceiptProcessedStatement = db.prepare(`
UPDATE personal_assistance_mobile_notification_receipt
SET processed_at = ?
WHERE event_id = ?
  AND device_id = ?
`);

const insertNotificationStatement = db.prepare(`
INSERT INTO personal_assistance_mobile_notification (
  event_id,
  device_id,
  capture_mode,
  notification_json,
  posted_at,
  received_at
)
VALUES (?, ?, ?, ?, ?, ?)
`);
const readStoredNotificationStatement = db.prepare(`
SELECT
  notification_json
FROM personal_assistance_mobile_notification
WHERE event_id = ?
  AND device_id = ?
LIMIT 1
`);

const pruneNotificationStatement = db.prepare(`
DELETE FROM personal_assistance_mobile_notification
WHERE received_at < ?
`);

const pruneReceiptStatement = db.prepare(`
DELETE FROM personal_assistance_mobile_notification_receipt
WHERE received_at < ?
`);

function requiredText(
  value: unknown,
  field: string,
  min: number,
  max: number,
): string {
  if (typeof value !== "string") {
    throw new Error(
      `${field} must be a string.`,
    );
  }

  const trimmed = value.trim();

  if (
    trimmed.length < min ||
    trimmed.length > max
  ) {
    throw new Error(
      `${field} must be between ${min} and ${max} characters.`,
    );
  }

  return trimmed;
}

function optionalText(
  value: unknown,
  field: string,
  max: number,
): string | null {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error(
      `${field} must be a string or null.`,
    );
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed.length > max) {
    throw new Error(
      `${field} cannot exceed ${max} characters.`,
    );
  }

  return trimmed;
}

function timestamp(
  value: unknown,
  field: string,
): string {
  if (typeof value !== "string") {
    throw new Error(
      `${field} must be a timestamp string.`,
    );
  }

  const ms =
    new Date(value).getTime();

  if (Number.isNaN(ms)) {
    throw new Error(
      `${field} must be a valid timestamp.`,
    );
  }

  return new Date(ms).toISOString();
}

function normalizeNotification(
  device: PersonalAssistanceMobileDevice,
  input: PersonalAssistanceMobileNotificationInput,
): PersonalAssistanceStoredNotification {
  const profile =
    getPersonalAssistanceProfile();

  const capture =
    profile.notification.capture;

  if (capture === "disabled") {
    throw new Error(
      "Notification capture is disabled by the Personal Assistance profile.",
    );
  }

  const eventId =
    requiredText(
      input.eventId,
      "eventId",
      8,
      160,
    );

  const appPackage =
    requiredText(
      input.appPackage,
      "appPackage",
      2,
      200,
    );

  const postedAt =
    timestamp(
      input.postedAt,
      "postedAt",
    );

  const sender =
    profile.privacy.storeSenderIdentity
      ? optionalText(
          input.sender,
          "sender",
          300,
        )
      : null;

  let title: string | null = null;
  let body: string | null = null;

  const mustUseRedactedContent =
    capture === "redacted-content" ||
    (
      capture === "full-content" &&
      profile.notification.redactSensitiveContent
    );

  if (mustUseRedactedContent) {
    title =
      optionalText(
        input.redactedTitle,
        "redactedTitle",
        500,
      );

    body =
      profile.notification.storeBodies
        ? optionalText(
            input.redactedBody,
            "redactedBody",
            4_000,
          )
        : null;
  } else if (capture === "full-content") {
    title =
      optionalText(
        input.title,
        "title",
        500,
      );

    body =
      profile.notification.storeBodies
        ? optionalText(
            input.body,
            "body",
            4_000,
          )
        : null;
  }

  return {
    eventId,
    deviceId:
      device.deviceId,
    captureMode:
      capture,
    appPackage,
    appLabel:
      optionalText(
        input.appLabel,
        "appLabel",
        160,
      ),
    notificationKey:
      optionalText(
        input.notificationKey,
        "notificationKey",
        500,
      ),
    category:
      optionalText(
        input.category,
        "category",
        120,
      ),
    channelId:
      optionalText(
        input.channelId,
        "channelId",
        200,
      ),
    postedAt,
    sender,
    title,
    body,
    receivedAt:
      "",
  };
}

const ingestTransaction =
  db.transaction(
    (
      device: PersonalAssistanceMobileDevice,
      batch:
        PersonalAssistanceMobileNotificationBatchInput,
      receivedAt: string,
    ): {
      result:
        PersonalAssistanceMobileNotificationBatchResult;
      accepted:
        PersonalAssistanceStoredNotification[];
    } => {
      const batchId =
        requiredText(
          batch.batchId,
          "batchId",
          8,
          160,
        );

      if (!Array.isArray(batch.events)) {
        throw new Error(
          "events must be an array.",
        );
      }

      if (
        batch.events.length < 1 ||
        batch.events.length > MAX_BATCH_SIZE
      ) {
        throw new Error(
          `events must contain between 1 and ${MAX_BATCH_SIZE} items.`,
        );
      }

      const profile =
        getPersonalAssistanceProfile();

      const results:
        PersonalAssistanceMobileNotificationResult[] = [];
      const accepted:
        PersonalAssistanceStoredNotification[] = [];
      const acknowledgedEventIds:
        string[] = [];

      for (const input of batch.events) {
        let eventId = "";

        try {
          eventId =
            requiredText(
              input?.eventId,
              "eventId",
              8,
              160,
            );
        } catch {
          results.push({
            eventId:
              typeof input?.eventId === "string"
                ? input.eventId
                : "",
            disposition:
              "rejected",
            reason:
              "invalid",
            retryable:
              false,
          });
          continue;
        }

        const receipt =
          readReceiptStatement.get(
            eventId,
          ) as ReceiptRow | undefined;

        if (receipt) {
          if (
            receipt.device_id !==
            device.deviceId
          ) {
            results.push({
              eventId,
              disposition:
                "rejected",
              reason:
                "invalid",
              retryable:
                false,
            });
            continue;
          }

          results.push({
            eventId,
            disposition:
              "duplicate",
            reason:
              "duplicate",
            retryable:
              false,
          });

          if (
            receipt.processed_at
          ) {
            acknowledgedEventIds.push(
              eventId,
            );
          }

          continue;
        }

        if (
          profile.notification.capture ===
          "disabled"
        ) {
          insertReceiptStatement.run(
            eventId,
            device.deviceId,
            "capture-disabled",
            receivedAt,
            receivedAt,
          );

          results.push({
            eventId,
            disposition:
              "rejected",
            reason:
              "capture-disabled",
            retryable:
              false,
          });

          acknowledgedEventIds.push(
            eventId,
          );
          continue;
        }

        try {
          const normalized =
            normalizeNotification(
              device,
              input,
            );

          normalized.receivedAt =
            receivedAt;

          insertNotificationStatement.run(
            normalized.eventId,
            normalized.deviceId,
            normalized.captureMode,
            JSON.stringify(
              normalized,
            ),
            normalized.postedAt,
            receivedAt,
          );

          const processedAt =
            normalized.captureMode ===
              "metadata-only"
              ? receivedAt
              : null;

          insertReceiptStatement.run(
            normalized.eventId,
            normalized.deviceId,
            "accepted",
            receivedAt,
            processedAt,
          );

          accepted.push(
            normalized,
          );

          results.push({
            eventId:
              normalized.eventId,
            disposition:
              "accepted",
            reason:
              "accepted",
            retryable:
              false,
          });

          if (
            normalized.captureMode ===
            "metadata-only"
          ) {
            acknowledgedEventIds.push(
              normalized.eventId,
            );
          }
        } catch {
          results.push({
            eventId,
            disposition:
              "rejected",
            reason:
              "invalid",
            retryable:
              false,
          });
        }
      }

      const retentionCutoff =
        new Date(
          new Date(receivedAt).getTime() -
          profile.notification.retentionDays *
            24 *
            60 *
            60 *
            1000,
        ).toISOString();

      pruneNotificationStatement.run(
        retentionCutoff,
      );

      const receiptRetentionDays =
        Math.max(
          30,
          profile.notification.retentionDays,
        );

      const receiptCutoff =
        new Date(
          new Date(receivedAt).getTime() -
          receiptRetentionDays *
            24 *
            60 *
            60 *
            1000,
        ).toISOString();

      pruneReceiptStatement.run(
        receiptCutoff,
      );

      return {
        result: {
          batchId,
          acceptedCount:
            results.filter(
              (item) =>
                item.disposition ===
                "accepted",
            ).length,
          duplicateCount:
            results.filter(
              (item) =>
                item.disposition ===
                "duplicate",
            ).length,
          rejectedCount:
            results.filter(
              (item) =>
                item.disposition ===
                "rejected",
            ).length,
          results,
          acknowledgedEventIds,
        },
        accepted,
      };
    },
  );

export function ingestPersonalAssistanceMobileNotificationBatch(
  device: PersonalAssistanceMobileDevice,
  batch: PersonalAssistanceMobileNotificationBatchInput,
  now = new Date(),
): {
  result:
    PersonalAssistanceMobileNotificationBatchResult;
  accepted:
    PersonalAssistanceStoredNotification[];
} {
  if (device.status !== "active") {
    throw new Error(
      "Revoked mobile devices cannot upload notification spools.",
    );
  }

  return structuredClone(
    ingestTransaction(
      device,
      batch,
      now.toISOString(),
    ),
  );
}

export function readPersonalAssistanceStoredMobileNotification(
  device: PersonalAssistanceMobileDevice,
  rawEventId: string,
): PersonalAssistanceStoredNotification | null {
  if (device.status !== "active") {
    throw new Error(
      "Revoked mobile devices cannot read notification observations.",
    );
  }

  const eventId =
    requiredText(
      rawEventId,
      "eventId",
      8,
      160,
    );

  const row =
    readStoredNotificationStatement.get(
      eventId,
      device.deviceId,
    ) as StoredNotificationRow | undefined;

  if (!row) {
    return null;
  }

  const notification =
    JSON.parse(
      row.notification_json,
    ) as PersonalAssistanceStoredNotification;

  if (
    notification.eventId !==
      eventId ||
    notification.deviceId !==
      device.deviceId
  ) {
    throw new Error(
      "Stored notification identity does not match the authenticated device.",
    );
  }

  return structuredClone(
    notification,
  );
}
export function markPersonalAssistanceMobileNotificationProcessed(
  device: PersonalAssistanceMobileDevice,
  rawEventId: string,
  now = new Date(),
): void {
  if (device.status !== "active") {
    throw new Error(
      "Revoked mobile devices cannot complete notification processing.",
    );
  }

  const eventId =
    requiredText(
      rawEventId,
      "eventId",
      8,
      160,
    );

  const result =
    markReceiptProcessedStatement.run(
      now.toISOString(),
      eventId,
      device.deviceId,
    );

  if (
    result.changes !==
    1
  ) {
    throw new Error(
      `Notification receipt not found for processed event: ${eventId}`,
    );
  }
}

export function reconcilePersonalAssistanceMobileNotificationReceipts(
  device: PersonalAssistanceMobileDevice,
  eventIds: string[],
): {
  acknowledgedEventIds: string[];
  unknownEventIds: string[];
} {
  if (device.status !== "active") {
    throw new Error(
      "Revoked mobile devices cannot reconcile notification spools.",
    );
  }

  if (!Array.isArray(eventIds)) {
    throw new Error(
      "eventIds must be an array.",
    );
  }

  if (
    eventIds.length < 1 ||
    eventIds.length > 500
  ) {
    throw new Error(
      "eventIds must contain between 1 and 500 items.",
    );
  }

  const acknowledgedEventIds:
    string[] = [];
  const unknownEventIds:
    string[] = [];

  for (const rawEventId of eventIds) {
    const eventId =
      requiredText(
        rawEventId,
        "eventId",
        8,
        160,
      );

    const receipt =
      readReceiptStatement.get(
        eventId,
      ) as ReceiptRow | undefined;

    if (
      receipt &&
      receipt.device_id ===
        device.deviceId &&
      receipt.processed_at
    ) {
      acknowledgedEventIds.push(
        eventId,
      );
    } else {
      unknownEventIds.push(
        eventId,
      );
    }
  }

  return {
    acknowledgedEventIds,
    unknownEventIds,
  };
}
