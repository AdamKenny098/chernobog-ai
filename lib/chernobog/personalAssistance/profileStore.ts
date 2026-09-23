import db from "../db";
import type {
  PersonalAssistanceEffectiveProfile,
  PersonalAssistancePreferenceOrigin,
  PersonalAssistanceProfile,
  PersonalAssistanceProfileAuditAction,
  PersonalAssistanceProfileAuditEntry,
  PersonalAssistanceProfileField,
  PersonalAssistanceProfilePatch,
} from "./profileTypes";
import {
  PERSONAL_ASSISTANCE_PROFILE_FIELDS,
  isPersonalAssistanceInterruptionPreference,
  isPersonalAssistanceNotificationCapture,
} from "./profileTypes";

const PROFILE_KEY = "primary";

type ProfileRow = {
  profile_json: string;
  revision: number;
  updated_at: string;
};

type ProfileAuditRow = {
  id: number;
  action: string;
  revision: number;
  changed_fields_json: string;
  previous_profile_json: string;
  next_profile_json: string;
  reason: string | null;
  updated_at: string;
};

db.exec(`
CREATE TABLE IF NOT EXISTS personal_assistance_profile (
  profile_key TEXT PRIMARY KEY,
  profile_json TEXT NOT NULL,
  revision INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS personal_assistance_profile_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  revision INTEGER NOT NULL,
  changed_fields_json TEXT NOT NULL,
  previous_profile_json TEXT NOT NULL,
  next_profile_json TEXT NOT NULL,
  reason TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_personal_assistance_profile_audit_id
ON personal_assistance_profile_audit(id DESC);
`);

const readProfileStatement = db.prepare(`
SELECT profile_json, revision, updated_at
FROM personal_assistance_profile
WHERE profile_key = ?
LIMIT 1
`);

const writeProfileStatement = db.prepare(`
INSERT INTO personal_assistance_profile (
  profile_key, profile_json, revision, updated_at
)
VALUES (?, ?, ?, ?)
ON CONFLICT(profile_key)
DO UPDATE SET
  profile_json = excluded.profile_json,
  revision = excluded.revision,
  updated_at = excluded.updated_at
`);

const insertAuditStatement = db.prepare(`
INSERT INTO personal_assistance_profile_audit (
  action,
  revision,
  changed_fields_json,
  previous_profile_json,
  next_profile_json,
  reason,
  updated_at
)
VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const listAuditStatement = db.prepare(`
SELECT
  id,
  action,
  revision,
  changed_fields_json,
  previous_profile_json,
  next_profile_json,
  reason,
  updated_at
FROM personal_assistance_profile_audit
ORDER BY id DESC
LIMIT ?
`);

function defaultProfile(): PersonalAssistanceProfile {
  return {
    schemaVersion: 1,
    profileId: "primary",
    revision: 0,
    locale: null,
    timeZone: null,
    proactiveAssistanceEnabled: false,
    interruptionPreference: "critical-only",
    notification: {
      capture: "disabled",
      retentionDays: 7,
      storeBodies: false,
      redactSensitiveContent: true,
    },
    communication: {
      trackResponsibilities: false,
      defaultResponseWindowHours: null,
    },
    schedule: {
      preferredWorkScheduleSource: null,
      preferredCalendarSource: null,
      staleAfterMinutes: 240,
    },
    privacy: {
      storeSenderIdentity: false,
      storeDeviceHealthHistory: false,
    },
    explicitFields: [],
    createdAt: null,
    updatedAt: null,
    updatedBy: "system-default",
    reason: null,
  };
}

function normalizeOptionalText(
  value: string | null | undefined,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function safeInteger(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value)
  ) {
    return fallback;
  }

  return Math.min(max, Math.max(min, value));
}

function sanitizeExplicitFields(
  value: unknown,
): PersonalAssistanceProfileField[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const allowed = new Set<string>(
    PERSONAL_ASSISTANCE_PROFILE_FIELDS,
  );

  return Array.from(
    new Set(
      value.filter(
        (field): field is PersonalAssistanceProfileField =>
          typeof field === "string" &&
          allowed.has(field),
      ),
    ),
  ).sort();
}

function objectValue(
  value: unknown,
): Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  )
    ? value as Record<string, unknown>
    : {};
}

function sanitizeProfile(
  value: unknown,
): PersonalAssistanceProfile {
  const defaults = defaultProfile();

  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return defaults;
  }

  const input = value as Record<string, unknown>;
  const notification = objectValue(input.notification);
  const communication = objectValue(input.communication);
  const schedule = objectValue(input.schedule);
  const privacy = objectValue(input.privacy);

  const responseWindow =
    communication.defaultResponseWindowHours;

  return {
    schemaVersion: 1,
    profileId: "primary",
    revision: safeInteger(
      input.revision,
      0,
      0,
      Number.MAX_SAFE_INTEGER,
    ),
    locale:
      typeof input.locale === "string"
        ? normalizeOptionalText(input.locale)
        : null,
    timeZone:
      typeof input.timeZone === "string"
        ? normalizeOptionalText(input.timeZone)
        : null,
    proactiveAssistanceEnabled:
      typeof input.proactiveAssistanceEnabled === "boolean"
        ? input.proactiveAssistanceEnabled
        : false,
    interruptionPreference:
      isPersonalAssistanceInterruptionPreference(
        input.interruptionPreference,
      )
        ? input.interruptionPreference
        : "critical-only",
    notification: {
      capture:
        isPersonalAssistanceNotificationCapture(
          notification.capture,
        )
          ? notification.capture
          : "disabled",
      retentionDays: safeInteger(
        notification.retentionDays,
        7,
        1,
        365,
      ),
      storeBodies:
        typeof notification.storeBodies === "boolean"
          ? notification.storeBodies
          : false,
      redactSensitiveContent:
        typeof notification.redactSensitiveContent === "boolean"
          ? notification.redactSensitiveContent
          : true,
    },
    communication: {
      trackResponsibilities:
        typeof communication.trackResponsibilities === "boolean"
          ? communication.trackResponsibilities
          : false,
      defaultResponseWindowHours:
        responseWindow === null
          ? null
          : typeof responseWindow === "number" &&
              Number.isInteger(responseWindow) &&
              responseWindow >= 1 &&
              responseWindow <= 720
            ? responseWindow
            : null,
    },
    schedule: {
      preferredWorkScheduleSource:
        typeof schedule.preferredWorkScheduleSource === "string"
          ? normalizeOptionalText(
              schedule.preferredWorkScheduleSource,
            )
          : null,
      preferredCalendarSource:
        typeof schedule.preferredCalendarSource === "string"
          ? normalizeOptionalText(
              schedule.preferredCalendarSource,
            )
          : null,
      staleAfterMinutes: safeInteger(
        schedule.staleAfterMinutes,
        240,
        5,
        10_080,
      ),
    },
    privacy: {
      storeSenderIdentity:
        typeof privacy.storeSenderIdentity === "boolean"
          ? privacy.storeSenderIdentity
          : false,
      storeDeviceHealthHistory:
        typeof privacy.storeDeviceHealthHistory === "boolean"
          ? privacy.storeDeviceHealthHistory
          : false,
    },
    explicitFields: sanitizeExplicitFields(
      input.explicitFields,
    ),
    createdAt:
      typeof input.createdAt === "string"
        ? input.createdAt
        : null,
    updatedAt:
      typeof input.updatedAt === "string"
        ? input.updatedAt
        : null,
    updatedBy:
      input.updatedBy === "explicit-user"
        ? "explicit-user"
        : "system-default",
    reason:
      typeof input.reason === "string"
        ? normalizeOptionalText(input.reason)
        : null,
  };
}

function parseStoredProfile(
  raw: string,
): PersonalAssistanceProfile {
  try {
    return sanitizeProfile(JSON.parse(raw));
  } catch {
    return defaultProfile();
  }
}

function readStoredProfile():
  PersonalAssistanceProfile {
  const row = readProfileStatement.get(
    PROFILE_KEY,
  ) as ProfileRow | undefined;

  if (!row) {
    return defaultProfile();
  }

  const profile = parseStoredProfile(
    row.profile_json,
  );
  profile.revision = Math.max(
    profile.revision,
    row.revision,
  );
  profile.updatedAt = row.updated_at;
  return profile;
}

function writeProfile(
  profile: PersonalAssistanceProfile,
): void {
  writeProfileStatement.run(
    PROFILE_KEY,
    JSON.stringify(profile),
    profile.revision,
    profile.updatedAt ?? new Date().toISOString(),
  );
}

function writeAudit(
  action: PersonalAssistanceProfileAuditAction,
  previousProfile: PersonalAssistanceProfile,
  nextProfile: PersonalAssistanceProfile,
  changedFields: PersonalAssistanceProfileField[],
  reason: string | null,
  updatedAt: string,
): void {
  insertAuditStatement.run(
    action,
    nextProfile.revision,
    JSON.stringify(changedFields),
    JSON.stringify(previousProfile),
    JSON.stringify(nextProfile),
    reason,
    updatedAt,
  );
}

function applyPatch(
  current: PersonalAssistanceProfile,
  patch: PersonalAssistanceProfilePatch,
): {
  next: PersonalAssistanceProfile;
  changedFields: PersonalAssistanceProfileField[];
} {
  const next = structuredClone(current);
  const explicit = new Set(current.explicitFields);
  const changed = new Set<PersonalAssistanceProfileField>();

  const mark = (
    field: PersonalAssistanceProfileField,
  ) => {
    explicit.add(field);
    changed.add(field);
  };

  if (
    Object.prototype.hasOwnProperty.call(
      patch,
      "locale",
    )
  ) {
    next.locale = normalizeOptionalText(patch.locale);
    mark("locale");
  }

  if (
    Object.prototype.hasOwnProperty.call(
      patch,
      "timeZone",
    )
  ) {
    next.timeZone = normalizeOptionalText(patch.timeZone);
    mark("timeZone");
  }

  if (
    patch.proactiveAssistanceEnabled !== undefined
  ) {
    if (
      typeof patch.proactiveAssistanceEnabled !== "boolean"
    ) {
      throw new Error(
        "proactiveAssistanceEnabled must be boolean.",
      );
    }
    next.proactiveAssistanceEnabled =
      patch.proactiveAssistanceEnabled;
    mark("proactiveAssistanceEnabled");
  }

  if (patch.interruptionPreference !== undefined) {
    if (
      !isPersonalAssistanceInterruptionPreference(
        patch.interruptionPreference,
      )
    ) {
      throw new Error(
        "interruptionPreference must be critical-only, important, normal, or all.",
      );
    }
    next.interruptionPreference =
      patch.interruptionPreference;
    mark("interruptionPreference");
  }

  if (patch.notification) {
    const value = patch.notification;

    if (value.capture !== undefined) {
      if (
        !isPersonalAssistanceNotificationCapture(
          value.capture,
        )
      ) {
        throw new Error(
          "notification.capture must be disabled, metadata-only, redacted-content, or full-content.",
        );
      }
      next.notification.capture = value.capture;
      mark("notification.capture");
    }

    if (value.retentionDays !== undefined) {
      if (
        !Number.isInteger(value.retentionDays) ||
        value.retentionDays < 1 ||
        value.retentionDays > 365
      ) {
        throw new Error(
          "notification.retentionDays must be an integer from 1 to 365.",
        );
      }
      next.notification.retentionDays =
        value.retentionDays;
      mark("notification.retentionDays");
    }

    if (value.storeBodies !== undefined) {
      if (typeof value.storeBodies !== "boolean") {
        throw new Error(
          "notification.storeBodies must be boolean.",
        );
      }
      next.notification.storeBodies =
        value.storeBodies;
      mark("notification.storeBodies");
    }

    if (
      value.redactSensitiveContent !== undefined
    ) {
      if (
        typeof value.redactSensitiveContent !== "boolean"
      ) {
        throw new Error(
          "notification.redactSensitiveContent must be boolean.",
        );
      }
      next.notification.redactSensitiveContent =
        value.redactSensitiveContent;
      mark("notification.redactSensitiveContent");
    }
  }

  if (patch.communication) {
    const value = patch.communication;

    if (value.trackResponsibilities !== undefined) {
      if (
        typeof value.trackResponsibilities !== "boolean"
      ) {
        throw new Error(
          "communication.trackResponsibilities must be boolean.",
        );
      }
      next.communication.trackResponsibilities =
        value.trackResponsibilities;
      mark("communication.trackResponsibilities");
    }

    if (
      Object.prototype.hasOwnProperty.call(
        value,
        "defaultResponseWindowHours",
      )
    ) {
      const responseWindow =
        value.defaultResponseWindowHours;

      if (
        responseWindow !== null &&
        (
          typeof responseWindow !== "number" ||
          !Number.isInteger(responseWindow) ||
          responseWindow < 1 ||
          responseWindow > 720
        )
      ) {
        throw new Error(
          "communication.defaultResponseWindowHours must be null or an integer from 1 to 720.",
        );
      }

      next.communication.defaultResponseWindowHours =
        responseWindow ?? null;
      mark("communication.defaultResponseWindowHours");
    }
  }

  if (patch.schedule) {
    const value = patch.schedule;

    if (
      Object.prototype.hasOwnProperty.call(
        value,
        "preferredWorkScheduleSource",
      )
    ) {
      next.schedule.preferredWorkScheduleSource =
        normalizeOptionalText(
          value.preferredWorkScheduleSource,
        );
      mark("schedule.preferredWorkScheduleSource");
    }

    if (
      Object.prototype.hasOwnProperty.call(
        value,
        "preferredCalendarSource",
      )
    ) {
      next.schedule.preferredCalendarSource =
        normalizeOptionalText(
          value.preferredCalendarSource,
        );
      mark("schedule.preferredCalendarSource");
    }

    if (value.staleAfterMinutes !== undefined) {
      if (
        !Number.isInteger(value.staleAfterMinutes) ||
        value.staleAfterMinutes < 5 ||
        value.staleAfterMinutes > 10_080
      ) {
        throw new Error(
          "schedule.staleAfterMinutes must be an integer from 5 to 10080.",
        );
      }
      next.schedule.staleAfterMinutes =
        value.staleAfterMinutes;
      mark("schedule.staleAfterMinutes");
    }
  }

  if (patch.privacy) {
    const value = patch.privacy;

    if (value.storeSenderIdentity !== undefined) {
      if (
        typeof value.storeSenderIdentity !== "boolean"
      ) {
        throw new Error(
          "privacy.storeSenderIdentity must be boolean.",
        );
      }
      next.privacy.storeSenderIdentity =
        value.storeSenderIdentity;
      mark("privacy.storeSenderIdentity");
    }

    if (
      value.storeDeviceHealthHistory !== undefined
    ) {
      if (
        typeof value.storeDeviceHealthHistory !== "boolean"
      ) {
        throw new Error(
          "privacy.storeDeviceHealthHistory must be boolean.",
        );
      }
      next.privacy.storeDeviceHealthHistory =
        value.storeDeviceHealthHistory;
      mark("privacy.storeDeviceHealthHistory");
    }
  }

  next.explicitFields = Array.from(explicit).sort();

  return {
    next,
    changedFields: Array.from(changed).sort(),
  };
}

const patchTransaction = db.transaction(
  (
    patch: PersonalAssistanceProfilePatch,
    timestamp: string,
  ) => {
    const previous = readStoredProfile();
    const { next, changedFields } = applyPatch(
      previous,
      patch,
    );

    if (changedFields.length === 0) {
      throw new Error(
        "Profile patch did not contain any supported fields.",
      );
    }

    next.revision = previous.revision + 1;
    next.createdAt = previous.createdAt ?? timestamp;
    next.updatedAt = timestamp;
    next.updatedBy = "explicit-user";
    next.reason = normalizeOptionalText(patch.reason);

    writeProfile(next);
    writeAudit(
      "patch",
      previous,
      next,
      changedFields,
      next.reason,
      timestamp,
    );

    return next;
  },
);

const resetTransaction = db.transaction(
  (
    timestamp: string,
    reason: string | null,
  ) => {
    const previous = readStoredProfile();
    const next = defaultProfile();

    next.revision = previous.revision + 1;
    next.createdAt = previous.createdAt ?? timestamp;
    next.updatedAt = timestamp;
    next.updatedBy = "system-default";
    next.reason = reason;

    writeProfile(next);
    writeAudit(
      "reset",
      previous,
      next,
      [...PERSONAL_ASSISTANCE_PROFILE_FIELDS],
      reason,
      timestamp,
    );

    return next;
  },
);

export function getPersonalAssistanceProfile():
  PersonalAssistanceProfile {
  return structuredClone(readStoredProfile());
}

export function getPersonalAssistanceEffectiveProfile():
  PersonalAssistanceEffectiveProfile {
  const profile = readStoredProfile();
  const explicit = new Set(profile.explicitFields);

  const origins = Object.fromEntries(
    PERSONAL_ASSISTANCE_PROFILE_FIELDS.map(
      (field) => [
        field,
        explicit.has(field)
          ? "explicit-user"
          : "system-default",
      ],
    ),
  ) as Record<
    PersonalAssistanceProfileField,
    PersonalAssistancePreferenceOrigin
  >;

  return structuredClone({
    profile,
    origins,
  });
}

export function patchPersonalAssistanceProfile(
  patch: PersonalAssistanceProfilePatch,
  now = new Date(),
): PersonalAssistanceProfile {
  return structuredClone(
    patchTransaction(
      patch,
      now.toISOString(),
    ),
  );
}

export function resetPersonalAssistanceProfile(
  reason?: string | null,
  now = new Date(),
): PersonalAssistanceProfile {
  return structuredClone(
    resetTransaction(
      now.toISOString(),
      normalizeOptionalText(reason),
    ),
  );
}

export function listPersonalAssistanceProfileAudit(
  limit = 20,
): PersonalAssistanceProfileAuditEntry[] {
  const safeLimit =
    Number.isInteger(limit)
      ? Math.min(100, Math.max(1, limit))
      : 20;

  const rows = listAuditStatement.all(
    safeLimit,
  ) as ProfileAuditRow[];

  return rows.map((row) => {
    let changedFields:
      PersonalAssistanceProfileField[] = [];

    try {
      changedFields = sanitizeExplicitFields(
        JSON.parse(row.changed_fields_json),
      );
    } catch {
      changedFields = [];
    }

    return {
      id: row.id,
      action:
        row.action === "reset" ? "reset" : "patch",
      revision: row.revision,
      changedFields,
      previousProfile: parseStoredProfile(
        row.previous_profile_json,
      ),
      nextProfile: parseStoredProfile(
        row.next_profile_json,
      ),
      reason: row.reason,
      updatedAt: row.updated_at,
    };
  });
}