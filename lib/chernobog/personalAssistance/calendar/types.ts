export type GoogleCalendarConfig = {
  calendarId: string;
  autoSyncWorkSchedule: boolean;
  eventTitle: string;
};

export type GoogleCalendarEncryptedAuth = {
  accessToken: string | null;
  refreshToken: string | null;
  accessTokenExpiresAt: string | null;
  scope: string | null;
  connectedAt: string | null;
};

export type GoogleCalendarOAuthPending = {
  state: string;
  redirectUri: string;
  createdAt: string;
};

export type GoogleCalendarConflict = {
  shiftId: string;
  eventId: string;
  overlapStartAt: string;
  overlapEndAt: string;
};

export type GoogleCalendarSyncSummary = {
  disposition:
    | "synced"
    | "skipped-not-connected"
    | "skipped-auto-sync-disabled"
    | "skipped-no-shifts"
    | "failed";
  snapshotId: string | null;
  created: number;
  updated: number;
  deleted: number;
  unchanged: number;
  conflictCount: number;
  attemptedAt: string;
  completedAt: string | null;
  error: string | null;
};

export type GoogleCalendarState = {
  schemaVersion: 1;
  config: GoogleCalendarConfig;
  auth: GoogleCalendarEncryptedAuth;
  oauthPending: GoogleCalendarOAuthPending | null;
  lastSync: GoogleCalendarSyncSummary | null;
};

export type GoogleCalendarStatus = {
  provider: "google-calendar";
  clientConfigured: boolean;
  connected: boolean;
  redirectUri: string;
  calendarId: string;
  autoSyncWorkSchedule: boolean;
  eventTitle: string;
  lastSync: GoogleCalendarSyncSummary | null;
  boundaries: {
    sourceOfTruth: "pa4-work-schedule";
    mayCreateManagedWorkEvents: true;
    mayUpdateManagedWorkEvents: true;
    mayDeleteManagedWorkEvents: true;
    mayModifyUnrelatedEvents: false;
    mayDeleteUnrelatedEvents: false;
    mayInferExtraShifts: false;
  };
};

export type GoogleCalendarEventDateTime = {
  dateTime?: string;
  date?: string;
  timeZone?: string;
};

export type GoogleCalendarEvent = {
  id?: string;
  status?: string;
  summary?: string;
  description?: string;
  transparency?: string;
  start?: GoogleCalendarEventDateTime;
  end?: GoogleCalendarEventDateTime;
  extendedProperties?: {
    private?: Record<string, string>;
  };
};

export type DesiredGoogleCalendarEvent = {
  sourceKey: string;
  shiftId: string;
  body: GoogleCalendarEvent;
};

export type GoogleCalendarMutationPlan = {
  create: DesiredGoogleCalendarEvent[];
  update: Array<{
    eventId: string;
    desired: DesiredGoogleCalendarEvent;
  }>;
  delete: string[];
  unchanged: number;
  unrelatedIgnored: number;
};