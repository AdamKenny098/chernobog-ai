import {
  createHash,
  randomBytes,
  randomUUID,
} from "node:crypto";

import db from "../persistence";
import type {
  PersonalAssistanceMobileDevice,
  PersonalAssistanceMobileEnrollmentChallenge,
  PersonalAssistanceMobileEnrollmentInput,
  PersonalAssistanceMobileEnrollmentResult,
  PersonalAssistanceMobileRecoveryInput,
  PersonalAssistanceMobileRecoveryChallenge,
} from "./types";

const DEFAULT_ENROLLMENT_MINUTES = 10;
const MIN_ENROLLMENT_MINUTES = 1;
const MAX_ENROLLMENT_MINUTES = 30;

type EnrollmentRow = {
  enrollment_id: string;
  code_hash: string;
  created_at: string;
  expires_at: string;
  consumed_at: string | null;
  consumed_device_id: string | null;
};

type DeviceRow = {
  device_id: string;
  installation_id: string;
  display_name: string;
  platform: string;
  app_version: string | null;
  token_hash: string;
  enrolled_at: string;
  last_seen_at: string | null;
  revoked_at: string | null;
};

db.exec(`
CREATE TABLE IF NOT EXISTS personal_assistance_mobile_enrollment (
  enrollment_id TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  consumed_device_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_personal_assistance_mobile_enrollment_expiry
ON personal_assistance_mobile_enrollment(expires_at);

CREATE TABLE IF NOT EXISTS personal_assistance_mobile_device (
  device_id TEXT PRIMARY KEY,
  installation_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  app_version TEXT,
  token_hash TEXT NOT NULL UNIQUE,
  enrolled_at TEXT NOT NULL,
  last_seen_at TEXT,
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_personal_assistance_mobile_device_status
ON personal_assistance_mobile_device(revoked_at, enrolled_at);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS personal_assistance_mobile_recovery (
  code_hash TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  installation_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_pa_mobile_recovery_device
ON personal_assistance_mobile_recovery(device_id, expires_at);
`);

type RecoveryRow = {
  code_hash: string;
  device_id: string;
  installation_id: string;
  created_at: string;
  expires_at: string;
  consumed_at: string | null;
};

const insertRecoveryStatement = db.prepare(`
INSERT INTO personal_assistance_mobile_recovery (
  code_hash, device_id, installation_id, created_at, expires_at, consumed_at
) VALUES (?, ?, ?, ?, ?, NULL)
`);

const readRecoveryStatement = db.prepare(`
SELECT code_hash, device_id, installation_id, created_at, expires_at, consumed_at
FROM personal_assistance_mobile_recovery
WHERE code_hash = ? LIMIT 1
`);

const consumeRecoveryStatement = db.prepare(`
UPDATE personal_assistance_mobile_recovery
SET consumed_at = ?
WHERE code_hash = ? AND consumed_at IS NULL AND expires_at > ?
`);

const rotateDeviceTokenStatement = db.prepare(`
UPDATE personal_assistance_mobile_device
SET token_hash = ?
WHERE device_id = ? AND installation_id = ? AND revoked_at IS NULL
`);

const insertEnrollmentStatement = db.prepare(`
INSERT INTO personal_assistance_mobile_enrollment (
  enrollment_id,
  code_hash,
  created_at,
  expires_at,
  consumed_at,
  consumed_device_id
)
VALUES (?, ?, ?, ?, NULL, NULL)
`);

const readEnrollmentByHashStatement = db.prepare(`
SELECT
  enrollment_id,
  code_hash,
  created_at,
  expires_at,
  consumed_at,
  consumed_device_id
FROM personal_assistance_mobile_enrollment
WHERE code_hash = ?
LIMIT 1
`);

const consumeEnrollmentStatement = db.prepare(`
UPDATE personal_assistance_mobile_enrollment
SET
  consumed_at = ?,
  consumed_device_id = ?
WHERE
  enrollment_id = ? AND
  consumed_at IS NULL
`);

const deleteOldEnrollmentStatement = db.prepare(`
DELETE FROM personal_assistance_mobile_enrollment
WHERE expires_at < ?
`);

const readDeviceByInstallationStatement = db.prepare(`
SELECT
  device_id,
  installation_id,
  display_name,
  platform,
  app_version,
  token_hash,
  enrolled_at,
  last_seen_at,
  revoked_at
FROM personal_assistance_mobile_device
WHERE installation_id = ?
LIMIT 1
`);

const readDeviceByTokenHashStatement = db.prepare(`
SELECT
  device_id,
  installation_id,
  display_name,
  platform,
  app_version,
  token_hash,
  enrolled_at,
  last_seen_at,
  revoked_at
FROM personal_assistance_mobile_device
WHERE token_hash = ?
LIMIT 1
`);

const readDeviceByIdStatement = db.prepare(`
SELECT
  device_id,
  installation_id,
  display_name,
  platform,
  app_version,
  token_hash,
  enrolled_at,
  last_seen_at,
  revoked_at
FROM personal_assistance_mobile_device
WHERE device_id = ?
LIMIT 1
`);

const insertDeviceStatement = db.prepare(`
INSERT INTO personal_assistance_mobile_device (
  device_id,
  installation_id,
  display_name,
  platform,
  app_version,
  token_hash,
  enrolled_at,
  last_seen_at,
  revoked_at
)
VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL)
`);

const revokeDeviceStatement = db.prepare(`
UPDATE personal_assistance_mobile_device
SET revoked_at = ?
WHERE
  device_id = ? AND
  revoked_at IS NULL
`);

const listDevicesStatement = db.prepare(`
SELECT
  device_id,
  installation_id,
  display_name,
  platform,
  app_version,
  token_hash,
  enrolled_at,
  last_seen_at,
  revoked_at
FROM personal_assistance_mobile_device
ORDER BY enrolled_at DESC
`);

function hashSecret(
  namespace: string,
  secret: string,
): string {
  return createHash("sha256")
    .update(namespace)
    .update("\0")
    .update(secret)
    .digest("hex");
}

function pairingCodeHash(
  code: string,
): string {
  return hashSecret(
    "chernobog-pa-mobile-enrollment-v1",
    code,
  );
}

function recoveryCodeHash(code: string): string {
  return hashSecret("chernobog-pa-mobile-recovery-v1", code);
}

function deviceTokenHash(
  token: string,
): string {
  return hashSecret(
    "chernobog-pa-mobile-device-v1",
    token,
  );
}

function normalizedText(
  value: unknown,
  field: string,
  minLength: number,
  maxLength: number,
): string {
  if (typeof value !== "string") {
    throw new Error(
      `${field} must be a string.`,
    );
  }

  const trimmed = value.trim();

  if (
    trimmed.length < minLength ||
    trimmed.length > maxLength
  ) {
    throw new Error(
      `${field} must be between ${minLength} and ${maxLength} characters.`,
    );
  }

  return trimmed;
}

function optionalText(
  value: unknown,
  field: string,
  maxLength: number,
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

  if (trimmed.length > maxLength) {
    throw new Error(
      `${field} cannot exceed ${maxLength} characters.`,
    );
  }

  return trimmed;
}

function enrollmentMinutes(
  value: number | undefined,
): number {
  if (value === undefined) {
    return DEFAULT_ENROLLMENT_MINUTES;
  }

  if (
    !Number.isInteger(value) ||
    value < MIN_ENROLLMENT_MINUTES ||
    value > MAX_ENROLLMENT_MINUTES
  ) {
    throw new Error(
      `expiresInMinutes must be an integer from ${MIN_ENROLLMENT_MINUTES} to ${MAX_ENROLLMENT_MINUTES}.`,
    );
  }

  return value;
}

function toDevice(
  row: DeviceRow,
): PersonalAssistanceMobileDevice {
  if (row.platform !== "android") {
    throw new Error(
      `Unsupported stored mobile platform: ${row.platform}`,
    );
  }

  return {
    deviceId: row.device_id,
    installationId: row.installation_id,
    displayName: row.display_name,
    platform: "android",
    appVersion: row.app_version,
    enrolledAt: row.enrolled_at,
    lastSeenAt: row.last_seen_at,
    revokedAt: row.revoked_at,
    status:
      row.revoked_at === null
        ? "active"
        : "revoked",
  };
}

export function createPersonalAssistanceMobileEnrollment(
  options: {
    expiresInMinutes?: number;
    now?: Date;
  } = {},
): PersonalAssistanceMobileEnrollmentChallenge {
  const now =
    options.now ??
    new Date();

  const minutes =
    enrollmentMinutes(
      options.expiresInMinutes,
    );

  const pairingCode =
    randomBytes(18)
      .toString("base64url");

  const enrollmentId =
    randomUUID();

  const createdAt =
    now.toISOString();

  const expiresAt =
    new Date(
      now.getTime() +
      minutes * 60_000,
    ).toISOString();

  const oldCutoff =
    new Date(
      now.getTime() -
      24 * 60 * 60 * 1000,
    ).toISOString();

  deleteOldEnrollmentStatement.run(
    oldCutoff,
  );

  insertEnrollmentStatement.run(
    enrollmentId,
    pairingCodeHash(
      pairingCode,
    ),
    createdAt,
    expiresAt,
  );

  return structuredClone({
    enrollmentId,
    pairingCode,
    createdAt,
    expiresAt,
  });
}

const consumeEnrollmentTransaction =
  db.transaction(
    (
      input:
        PersonalAssistanceMobileEnrollmentInput,
      now: Date,
    ) => {
      const pairingCode =
        normalizedText(
          input.pairingCode,
          "pairingCode",
          16,
          128,
        );

      const installationId =
        normalizedText(
          input.installationId,
          "installationId",
          8,
          160,
        );

      const displayName =
        normalizedText(
          input.displayName,
          "displayName",
          1,
          80,
        );

      const appVersion =
        optionalText(
          input.appVersion,
          "appVersion",
          80,
        );

      const enrollment =
        readEnrollmentByHashStatement.get(
          pairingCodeHash(
            pairingCode,
          ),
        ) as EnrollmentRow | undefined;

      if (!enrollment) {
        throw new Error(
          "Mobile enrollment code is invalid.",
        );
      }

      if (enrollment.consumed_at) {
        throw new Error(
          "Mobile enrollment code has already been consumed.",
        );
      }

      const nowMs =
        now.getTime();

      const expiresMs =
        new Date(
          enrollment.expires_at,
        ).getTime();

      if (
        Number.isNaN(expiresMs) ||
        expiresMs <= nowMs
      ) {
        throw new Error(
          "Mobile enrollment code has expired.",
        );
      }

      const existing =
        readDeviceByInstallationStatement.get(
          installationId,
        ) as DeviceRow | undefined;

      if (existing) {
        throw new Error(
          existing.revoked_at
            ? "This mobile installation was previously enrolled and revoked. Re-enrollment requires a new installation identity."
            : "This mobile installation is already enrolled.",
        );
      }

      const deviceId =
        randomUUID();

      const token =
        randomBytes(32)
          .toString("base64url");

      const enrolledAt =
        now.toISOString();

      insertDeviceStatement.run(
        deviceId,
        installationId,
        displayName,
        "android",
        appVersion,
        deviceTokenHash(
          token,
        ),
        enrolledAt,
      );

      const consumed =
        consumeEnrollmentStatement.run(
          enrolledAt,
          deviceId,
          enrollment
            .enrollment_id,
        );

      if (consumed.changes !== 1) {
        throw new Error(
          "Mobile enrollment code could not be consumed.",
        );
      }

      const row =
        readDeviceByIdStatement.get(
          deviceId,
        ) as DeviceRow | undefined;

      if (!row) {
        throw new Error(
          "Enrolled mobile device could not be reloaded.",
        );
      }

      return {
        device:
          toDevice(row),
        token,
      };
    },
  );

/**
 * Only local owner tooling must mint these codes. No public HTTP endpoint
 * creates mobile recovery codes. A code is bound to an existing active device.
 */
export function createPersonalAssistanceMobileRecovery(
  deviceId: string,
  options: { expiresInMinutes?: number; now?: Date } = {},
): PersonalAssistanceMobileRecoveryChallenge {
  const now = options.now ?? new Date();
  const id = normalizedText(deviceId, "deviceId", 8, 128);
  const row = readDeviceByIdStatement.get(id) as DeviceRow | undefined;
  if (!row || row.revoked_at) {
    throw new Error("Active mobile device not found for recovery.");
  }
  const minutes = enrollmentMinutes(options.expiresInMinutes);
  const recoveryCode = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + minutes * 60_000).toISOString();
  insertRecoveryStatement.run(
    recoveryCodeHash(recoveryCode),
    row.device_id,
    row.installation_id,
    now.toISOString(),
    expiresAt,
  );
  return { deviceId: row.device_id, expiresAt, recoveryCode };
}

const recoverDeviceTransaction = db.transaction(
  (input: PersonalAssistanceMobileRecoveryInput, now: Date): PersonalAssistanceMobileEnrollmentResult => {
    const deviceId = normalizedText(input.deviceId, "deviceId", 8, 128);
    const installationId = normalizedText(input.installationId, "installationId", 8, 160);
    const recoveryCode = normalizedText(input.recoveryCode, "recoveryCode", 32, 256);
    const recovery = readRecoveryStatement.get(
      recoveryCodeHash(recoveryCode),
    ) as RecoveryRow | undefined;

    if (!recovery ||
        recovery.device_id !== deviceId ||
        recovery.installation_id !== installationId) {
      throw new Error("Invalid mobile recovery code or device identity.");
    }
    if (recovery.consumed_at) {
      throw new Error("Mobile recovery code has already been consumed.");
    }
    if (Date.parse(recovery.expires_at) <= now.getTime()) {
      throw new Error("Mobile recovery code has expired.");
    }

    const device = readDeviceByIdStatement.get(deviceId) as DeviceRow | undefined;
    if (!device || device.installation_id !== installationId || device.revoked_at) {
      throw new Error("Mobile device was revoked or is not registered on this server.");
    }

    const token = randomBytes(32).toString("base64url");
    const changed = rotateDeviceTokenStatement.run(
      deviceTokenHash(token), deviceId, installationId,
    );
    if (changed.changes !== 1) {
      throw new Error("Mobile credential rotation failed.");
    }
    const consumed = consumeRecoveryStatement.run(
      now.toISOString(), recovery.code_hash, now.toISOString(),
    );
    if (consumed.changes !== 1) {
      throw new Error("Mobile recovery code was consumed or expired.");
    }
    const updated = readDeviceByIdStatement.get(deviceId) as DeviceRow | undefined;
    if (!updated) {
      throw new Error("Recovered device could not be loaded.");
    }
    return { device: toDevice(updated), token };
  },
);

/** Atomic replacement: same device and installation, new token, old token invalid. */
export function recoverPersonalAssistanceMobileDevice(
  input: PersonalAssistanceMobileRecoveryInput,
  now = new Date(),
): PersonalAssistanceMobileEnrollmentResult {
  return structuredClone(recoverDeviceTransaction(input, now));
}

export function enrollPersonalAssistanceMobileDevice(
  input:
    PersonalAssistanceMobileEnrollmentInput,
  now = new Date(),
): PersonalAssistanceMobileEnrollmentResult {
  return structuredClone(
    consumeEnrollmentTransaction(
      input,
      now,
    ),
  );
}

export function authenticatePersonalAssistanceMobileToken(
  token: string,
): PersonalAssistanceMobileDevice {
  const normalized =
    normalizedText(
      token,
      "mobile bearer token",
      32,
      256,
    );

  const row =
    readDeviceByTokenHashStatement.get(
      deviceTokenHash(
        normalized,
      ),
    ) as DeviceRow | undefined;

  if (!row) {
    throw new Error(
      "Mobile bearer token is invalid.",
    );
  }

  if (row.revoked_at) {
    throw new Error(
      "Mobile device credential has been revoked.",
    );
  }

  return structuredClone(
    toDevice(row),
  );
}

export function listPersonalAssistanceMobileDevices():
  PersonalAssistanceMobileDevice[] {
  return (
    listDevicesStatement.all() as
      DeviceRow[]
  ).map(
    (row) =>
      structuredClone(
        toDevice(row),
      ),
  );
}

const revokeDeviceTransaction =
  db.transaction(
    (
      deviceId: string,
      now: Date,
    ) => {
      const normalized =
        normalizedText(
          deviceId,
          "deviceId",
          8,
          128,
        );

      const existing =
        readDeviceByIdStatement.get(
          normalized,
        ) as DeviceRow | undefined;

      if (!existing) {
        throw new Error(
          "Mobile device was not found.",
        );
      }

      if (existing.revoked_at) {
        return toDevice(
          existing,
        );
      }

      revokeDeviceStatement.run(
        now.toISOString(),
        normalized,
      );

      const updated =
        readDeviceByIdStatement.get(
          normalized,
        ) as DeviceRow | undefined;

      if (!updated) {
        throw new Error(
          "Revoked mobile device could not be reloaded.",
        );
      }

      return toDevice(
        updated,
      );
    },
  );

export function revokePersonalAssistanceMobileDevice(
  deviceId: string,
  now = new Date(),
): PersonalAssistanceMobileDevice {
  return structuredClone(
    revokeDeviceTransaction(
      deviceId,
      now,
    ),
  );
}