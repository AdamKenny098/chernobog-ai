import db from "../../db";
import {
  getPersonalAssistanceProfile,
} from "../profileStore";
import type {
  PersonalAssistanceMobileDevice,
} from "./types";
import type {
  PersonalAssistanceMobileAppState,
  PersonalAssistanceMobileHeartbeatInput,
  PersonalAssistanceMobileHeartbeatResult,
  PersonalAssistanceMobileHealthSnapshot,
  PersonalAssistanceMobileNetworkType,
} from "./healthTypes";

const HEARTBEAT_RECEIPT_RETENTION_DAYS = 7;

type HealthRow = {
  device_id: string;
  heartbeat_id: string;
  health_json: string;
  received_at: string;
};

type ReceiptRow = {
  heartbeat_id: string;
  device_id: string;
  received_at: string;
};

db.exec(`
CREATE TABLE IF NOT EXISTS personal_assistance_mobile_health (
  device_id TEXT PRIMARY KEY,
  heartbeat_id TEXT NOT NULL,
  health_json TEXT NOT NULL,
  received_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS personal_assistance_mobile_health_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL,
  heartbeat_id TEXT NOT NULL UNIQUE,
  health_json TEXT NOT NULL,
  received_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_personal_assistance_mobile_health_history_device
ON personal_assistance_mobile_health_history(device_id, received_at DESC);

CREATE TABLE IF NOT EXISTS personal_assistance_mobile_heartbeat_receipt (
  heartbeat_id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  received_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_personal_assistance_mobile_heartbeat_receipt_received
ON personal_assistance_mobile_heartbeat_receipt(received_at);
`);

const readCurrentHealthStatement = db.prepare(`
SELECT
  device_id,
  heartbeat_id,
  health_json,
  received_at
FROM personal_assistance_mobile_health
WHERE device_id = ?
LIMIT 1
`);

const readReceiptStatement = db.prepare(`
SELECT
  heartbeat_id,
  device_id,
  received_at
FROM personal_assistance_mobile_heartbeat_receipt
WHERE heartbeat_id = ?
LIMIT 1
`);

const insertReceiptStatement = db.prepare(`
INSERT INTO personal_assistance_mobile_heartbeat_receipt (
  heartbeat_id,
  device_id,
  received_at
)
VALUES (?, ?, ?)
`);

const pruneReceiptsStatement = db.prepare(`
DELETE FROM personal_assistance_mobile_heartbeat_receipt
WHERE received_at < ?
`);

const writeCurrentHealthStatement = db.prepare(`
INSERT INTO personal_assistance_mobile_health (
  device_id,
  heartbeat_id,
  health_json,
  received_at
)
VALUES (?, ?, ?, ?)
ON CONFLICT(device_id)
DO UPDATE SET
  heartbeat_id = excluded.heartbeat_id,
  health_json = excluded.health_json,
  received_at = excluded.received_at
`);

const insertHealthHistoryStatement = db.prepare(`
INSERT INTO personal_assistance_mobile_health_history (
  device_id,
  heartbeat_id,
  health_json,
  received_at
)
VALUES (?, ?, ?, ?)
`);

const touchDeviceStatement = db.prepare(`
UPDATE personal_assistance_mobile_device
SET last_seen_at = ?
WHERE
  device_id = ? AND
  revoked_at IS NULL
`);

function normalizedIdentifier(
  value: unknown,
  field: string,
): string {
  if (typeof value !== "string") {
    throw new Error(
      `${field} must be a string.`,
    );
  }

  const trimmed = value.trim();

  if (
    trimmed.length < 8 ||
    trimmed.length > 160
  ) {
    throw new Error(
      `${field} must be between 8 and 160 characters.`,
    );
  }

  return trimmed;
}

function optionalBoolean(
  value: unknown,
  fallback: boolean | null,
  field: string,
): boolean | null {
  if (
    value === undefined ||
    value === null
  ) {
    return fallback;
  }

  if (typeof value !== "boolean") {
    throw new Error(
      `${field} must be boolean or null.`,
    );
  }

  return value;
}

function batteryPercent(
  value: unknown,
): number | null {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > 100
  ) {
    throw new Error(
      "batteryPercent must be null or an integer from 0 to 100.",
    );
  }

  return value;
}

function spoolCount(
  value: unknown,
): number {
  if (value === undefined) {
    return 0;
  }

  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > 100_000
  ) {
    throw new Error(
      "spoolPendingCount must be an integer from 0 to 100000.",
    );
  }

  return value;
}

function networkType(
  value: unknown,
): PersonalAssistanceMobileNetworkType {
  const allowed:
    readonly PersonalAssistanceMobileNetworkType[] = [
      "wifi",
      "cellular",
      "ethernet",
      "offline",
      "unknown",
    ];

  if (value === undefined) {
    return "unknown";
  }

  if (
    typeof value !== "string" ||
    !allowed.includes(
      value as PersonalAssistanceMobileNetworkType,
    )
  ) {
    throw new Error(
      "networkType must be wifi, cellular, ethernet, offline, or unknown.",
    );
  }

  return value as PersonalAssistanceMobileNetworkType;
}

function appState(
  value: unknown,
): PersonalAssistanceMobileAppState {
  const allowed:
    readonly PersonalAssistanceMobileAppState[] = [
      "foreground",
      "background",
      "unknown",
    ];

  if (value === undefined) {
    return "unknown";
  }

  if (
    typeof value !== "string" ||
    !allowed.includes(
      value as PersonalAssistanceMobileAppState,
    )
  ) {
    throw new Error(
      "appState must be foreground, background, or unknown.",
    );
  }

  return value as PersonalAssistanceMobileAppState;
}

function clientObservedAt(
  value: unknown,
): string | null {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error(
      "clientObservedAt must be an ISO-compatible timestamp or null.",
    );
  }

  const timestamp =
    new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    throw new Error(
      "clientObservedAt must be an ISO-compatible timestamp or null.",
    );
  }

  return new Date(timestamp).toISOString();
}

function buildSnapshot(
  device: PersonalAssistanceMobileDevice,
  input: PersonalAssistanceMobileHeartbeatInput,
  receivedAt: string,
): PersonalAssistanceMobileHealthSnapshot {
  return {
    deviceId: device.deviceId,
    heartbeatId: normalizedIdentifier(
      input.heartbeatId,
      "heartbeatId",
    ),
    batteryPercent: batteryPercent(
      input.batteryPercent,
    ),
    charging: optionalBoolean(
      input.charging,
      null,
      "charging",
    ),
    lowPowerMode: optionalBoolean(
      input.lowPowerMode,
      null,
      "lowPowerMode",
    ),
    networkType: networkType(
      input.networkType,
    ),
    appState: appState(
      input.appState,
    ),
    notificationListenerEnabled:
      optionalBoolean(
        input.notificationListenerEnabled,
        false,
        "notificationListenerEnabled",
      ) ?? false,
    spoolPendingCount: spoolCount(
      input.spoolPendingCount,
    ),
    clientObservedAt: clientObservedAt(
      input.clientObservedAt,
    ),
    receivedAt,
  };
}

function parseHealthRow(
  row: HealthRow,
): PersonalAssistanceMobileHealthSnapshot {
  const parsed =
    JSON.parse(
      row.health_json,
    ) as PersonalAssistanceMobileHealthSnapshot;

  return {
    ...parsed,
    deviceId: row.device_id,
    heartbeatId: row.heartbeat_id,
    receivedAt: row.received_at,
  };
}

const recordHeartbeatTransaction =
  db.transaction(
    (
      device: PersonalAssistanceMobileDevice,
      input: PersonalAssistanceMobileHeartbeatInput,
      receivedAt: string,
    ): PersonalAssistanceMobileHeartbeatResult => {
      const heartbeatId =
        normalizedIdentifier(
          input.heartbeatId,
          "heartbeatId",
        );

      const existingReceipt =
        readReceiptStatement.get(
          heartbeatId,
        ) as ReceiptRow | undefined;

      if (existingReceipt) {
        if (
          existingReceipt.device_id !==
          device.deviceId
        ) {
          throw new Error(
            "Heartbeat identifier is already bound to another device.",
          );
        }

        const current =
          readCurrentHealthStatement.get(
            device.deviceId,
          ) as HealthRow | undefined;

        if (!current) {
          throw new Error(
            "Duplicate heartbeat receipt exists without current health state.",
          );
        }

        return {
          accepted: true,
          duplicate: true,
          historyPersisted: false,
          snapshot: parseHealthRow(current),
          serverTime: receivedAt,
        };
      }

      const snapshot =
        buildSnapshot(
          device,
          input,
          receivedAt,
        );

      const serialized =
        JSON.stringify(snapshot);

      insertReceiptStatement.run(
        heartbeatId,
        device.deviceId,
        receivedAt,
      );

      writeCurrentHealthStatement.run(
        device.deviceId,
        heartbeatId,
        serialized,
        receivedAt,
      );

      const touched =
        touchDeviceStatement.run(
          receivedAt,
          device.deviceId,
        );

      if (touched.changes !== 1) {
        throw new Error(
          "Mobile device could not be marked seen.",
        );
      }

      const profile =
        getPersonalAssistanceProfile();

      const historyPersisted =
        profile
          .privacy
          .storeDeviceHealthHistory;

      if (historyPersisted) {
        insertHealthHistoryStatement.run(
          device.deviceId,
          heartbeatId,
          serialized,
          receivedAt,
        );
      }

      const cutoff =
        new Date(
          new Date(receivedAt).getTime() -
          HEARTBEAT_RECEIPT_RETENTION_DAYS *
            24 *
            60 *
            60 *
            1000,
        ).toISOString();

      pruneReceiptsStatement.run(cutoff);

      return {
        accepted: true,
        duplicate: false,
        historyPersisted,
        snapshot,
        serverTime: receivedAt,
      };
    },
  );

export function recordPersonalAssistanceMobileHeartbeat(
  device: PersonalAssistanceMobileDevice,
  input: PersonalAssistanceMobileHeartbeatInput,
  now = new Date(),
): PersonalAssistanceMobileHeartbeatResult {
  if (device.status !== "active") {
    throw new Error(
      "Revoked mobile devices cannot submit heartbeats.",
    );
  }

  return structuredClone(
    recordHeartbeatTransaction(
      device,
      input,
      now.toISOString(),
    ),
  );
}

export function getPersonalAssistanceMobileHealth(
  deviceId: string,
): PersonalAssistanceMobileHealthSnapshot | null {
  const normalized =
    normalizedIdentifier(
      deviceId,
      "deviceId",
    );

  const row =
    readCurrentHealthStatement.get(
      normalized,
    ) as HealthRow | undefined;

  return row
    ? structuredClone(
        parseHealthRow(row),
      )
    : null;
}