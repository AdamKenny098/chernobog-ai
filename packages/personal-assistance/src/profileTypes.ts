export type PersonalAssistancePreferenceOrigin =
  | "system-default"
  | "explicit-user";

export type PersonalAssistanceInterruptionPreference =
  | "critical-only"
  | "important"
  | "normal"
  | "all";

export type PersonalAssistanceNotificationCapture =
  | "disabled"
  | "metadata-only"
  | "redacted-content"
  | "full-content";

export type PersonalAssistanceProfileField =
  | "locale"
  | "timeZone"
  | "proactiveAssistanceEnabled"
  | "interruptionPreference"
  | "notification.capture"
  | "notification.retentionDays"
  | "notification.storeBodies"
  | "notification.redactSensitiveContent"
  | "communication.trackResponsibilities"
  | "communication.defaultResponseWindowHours"
  | "schedule.preferredWorkScheduleSource"
  | "schedule.preferredCalendarSource"
  | "schedule.staleAfterMinutes"
  | "privacy.storeSenderIdentity"
  | "privacy.storeDeviceHealthHistory";

export interface PersonalAssistanceProfile {
  schemaVersion: 1;
  profileId: "primary";
  revision: number;
  locale: string | null;
  timeZone: string | null;
  proactiveAssistanceEnabled: boolean;
  interruptionPreference: PersonalAssistanceInterruptionPreference;
  notification: {
    capture: PersonalAssistanceNotificationCapture;
    retentionDays: number;
    storeBodies: boolean;
    redactSensitiveContent: boolean;
  };
  communication: {
    trackResponsibilities: boolean;
    defaultResponseWindowHours: number | null;
  };
  schedule: {
    preferredWorkScheduleSource: string | null;
    preferredCalendarSource: string | null;
    staleAfterMinutes: number;
  };
  privacy: {
    storeSenderIdentity: boolean;
    storeDeviceHealthHistory: boolean;
  };
  explicitFields: PersonalAssistanceProfileField[];
  createdAt: string | null;
  updatedAt: string | null;
  updatedBy: PersonalAssistancePreferenceOrigin;
  reason: string | null;
}

export interface PersonalAssistanceProfilePatch {
  locale?: string | null;
  timeZone?: string | null;
  proactiveAssistanceEnabled?: boolean;
  interruptionPreference?: PersonalAssistanceInterruptionPreference;
  notification?: {
    capture?: PersonalAssistanceNotificationCapture;
    retentionDays?: number;
    storeBodies?: boolean;
    redactSensitiveContent?: boolean;
  };
  communication?: {
    trackResponsibilities?: boolean;
    defaultResponseWindowHours?: number | null;
  };
  schedule?: {
    preferredWorkScheduleSource?: string | null;
    preferredCalendarSource?: string | null;
    staleAfterMinutes?: number;
  };
  privacy?: {
    storeSenderIdentity?: boolean;
    storeDeviceHealthHistory?: boolean;
  };
  reason?: string | null;
}

export type PersonalAssistanceProfileAuditAction =
  | "patch"
  | "reset";

export interface PersonalAssistanceProfileAuditEntry {
  id: number;
  action: PersonalAssistanceProfileAuditAction;
  revision: number;
  changedFields: PersonalAssistanceProfileField[];
  previousProfile: PersonalAssistanceProfile;
  nextProfile: PersonalAssistanceProfile;
  reason: string | null;
  updatedAt: string;
}

export interface PersonalAssistanceEffectiveProfile {
  profile: PersonalAssistanceProfile;
  origins: Record<
    PersonalAssistanceProfileField,
    PersonalAssistancePreferenceOrigin
  >;
}

export const PERSONAL_ASSISTANCE_PROFILE_FIELDS:
  readonly PersonalAssistanceProfileField[] = [
    "locale",
    "timeZone",
    "proactiveAssistanceEnabled",
    "interruptionPreference",
    "notification.capture",
    "notification.retentionDays",
    "notification.storeBodies",
    "notification.redactSensitiveContent",
    "communication.trackResponsibilities",
    "communication.defaultResponseWindowHours",
    "schedule.preferredWorkScheduleSource",
    "schedule.preferredCalendarSource",
    "schedule.staleAfterMinutes",
    "privacy.storeSenderIdentity",
    "privacy.storeDeviceHealthHistory",
  ] as const;

export const PERSONAL_ASSISTANCE_INTERRUPTION_PREFERENCES:
  readonly PersonalAssistanceInterruptionPreference[] = [
    "critical-only",
    "important",
    "normal",
    "all",
  ] as const;

export const PERSONAL_ASSISTANCE_NOTIFICATION_CAPTURES:
  readonly PersonalAssistanceNotificationCapture[] = [
    "disabled",
    "metadata-only",
    "redacted-content",
    "full-content",
  ] as const;

export function isPersonalAssistanceInterruptionPreference(
  value: unknown,
): value is PersonalAssistanceInterruptionPreference {
  return (
    typeof value === "string" &&
    PERSONAL_ASSISTANCE_INTERRUPTION_PREFERENCES.includes(
      value as PersonalAssistanceInterruptionPreference,
    )
  );
}

export function isPersonalAssistanceNotificationCapture(
  value: unknown,
): value is PersonalAssistanceNotificationCapture {
  return (
    typeof value === "string" &&
    PERSONAL_ASSISTANCE_NOTIFICATION_CAPTURES.includes(
      value as PersonalAssistanceNotificationCapture,
    )
  );
}