import type {
  WorkScheduleStatus,
} from "../workSchedule/types";
import type {
  GoogleCalendarStatus,
  GoogleCalendarSyncSummary,
} from "../calendar/types";

/**
 * OH-6E1: a read-only view over the existing PA-4/PA-5 authorities.
 * PA-4 owns shift truth; PA-5 owns Google Calendar projection. This code
 * never fetches Google events or invokes a calendar mutation.
 */
export type RosterReadiness =
  | "missing"
  | "empty"
  | "refresh-pending"
  | "stale"
  | "current";

export type CalendarReadiness =
  | "disconnected"
  | "client-unconfigured"
  | "auto-sync-disabled"
  | "never-synced"
  | "sync-failed"
  | "sync-skipped"
  | "snapshot-mismatch"
  | "recorded-synced";

export type ScheduleCalendarAssessment =
  | "needs-roster"
  | "needs-calendar"
  | "needs-sync-review"
  | "review-conflicts"
  | "recorded-aligned";

export type ScheduleCalendarAuthoritySnapshot = {
  asOf: string;
  assessment: ScheduleCalendarAssessment;
  guidance: string;
  roster: {
    source: "alkimii";
    readiness: RosterReadiness;
    preferredSource: string | null;
    snapshotId: string | null;
    importedAt: string | null;
    observedAt: string | null;
    timeZone: string | null;
    shiftCount: number;
    pendingRefresh: boolean;
    isStale: boolean;
    latestChangeCount: number;
    nextShift: {
      startAt: string;
      endAt: string;
      status: string;
    } | null;
  };
  calendar: {
    provider: "google-calendar";
    clientConfigured: boolean;
    connected: boolean;
    autoSyncWorkSchedule: boolean;
    readiness: CalendarReadiness;
    lastSync: {
      disposition: GoogleCalendarSyncSummary["disposition"];
      snapshotId: string | null;
      attemptedAt: string;
      completedAt: string | null;
      created: number;
      updated: number;
      deleted: number;
      unchanged: number;
      conflictCount: number;
      errorRecorded: boolean;
    } | null;
    lastRecordedSyncMatchesRoster: boolean;
  };
  boundaries: {
    readOnly: true;
    rosterSourceOfTruth: "pa4-alkimii";
    calendarProjectionOwner: "pa5-google-calendar";
    syncEvidence: "last-recorded-pa5-summary";
    contactsGoogleCalendar: false;
    exposesCredentials: false;
    exposesCalendarId: false;
    exposesRawShiftMetadata: false;
    executesTools: false;
    createsEvents: false;
    updatesEvents: false;
    deletesEvents: false;
    schedulesInterruptions: false;
  };
};

function rosterReadiness(
  schedule: WorkScheduleStatus,
): RosterReadiness {
  if (!schedule.snapshot) {
    return "missing";
  }
  if (schedule.snapshot.shifts.length === 0) {
    return "empty";
  }
  if (schedule.pendingRefresh) {
    return "refresh-pending";
  }
  if (schedule.isStale) {
    return "stale";
  }
  return "current";
}

function calendarReadiness(
  schedule: WorkScheduleStatus,
  calendar: GoogleCalendarStatus,
): CalendarReadiness {
  if (!calendar.connected) {
    return "disconnected";
  }
  if (!calendar.clientConfigured) {
    return "client-unconfigured";
  }
  if (!calendar.autoSyncWorkSchedule) {
    return "auto-sync-disabled";
  }
  const last = calendar.lastSync;
  if (!last) {
    return "never-synced";
  }
  if (last.disposition === "failed") {
    return "sync-failed";
  }
  if (last.disposition !== "synced") {
    return "sync-skipped";
  }
  if (
    !schedule.snapshot ||
    last.snapshotId !== schedule.snapshot.snapshotId
  ) {
    return "snapshot-mismatch";
  }
  return "recorded-synced";
}

function overallAssessment(
  roster: RosterReadiness,
  calendar: CalendarReadiness,
  conflicts: number,
): {
  assessment: ScheduleCalendarAssessment;
  guidance: string;
} {
  if (roster !== "current") {
    return {
      assessment: "needs-roster",
      guidance:
        "Open Alkimii My Schedule > Roster on the paired Android phone and verify a fresh authoritative capture before relying on the calendar projection.",
    };
  }
  if (
    calendar === "disconnected" ||
    calendar === "client-unconfigured" ||
    calendar === "auto-sync-disabled"
  ) {
    return {
      assessment: "needs-calendar",
      guidance:
        "Review the existing PA-5 Google Calendar connection and automatic-sync settings. This endpoint will not change them.",
    };
  }
  if (calendar !== "recorded-synced") {
    return {
      assessment: "needs-sync-review",
      guidance:
        "Review the PA-5 sync history for the current PA-4 snapshot. Only the existing Calendar steward may reconcile managed work events.",
    };
  }
  if (conflicts > 0) {
    return {
      assessment: "review-conflicts",
      guidance:
        "PA-5 reported overlapping non-managed calendar events in its last sync. Review those conflicts manually.",
    };
  }
  return {
    assessment: "recorded-aligned",
    guidance:
      "PA-5's last recorded successful sync matches the current PA-4 roster snapshot. Remote Google Calendar was not queried by this read-only assessment.",
  };
}

export function buildScheduleCalendarAuthority(
  schedule: WorkScheduleStatus,
  calendar: GoogleCalendarStatus,
  now = new Date(),
): ScheduleCalendarAuthoritySnapshot {
  if (!Number.isFinite(now.getTime())) {
    throw new Error("Assessment time must be a valid date.");
  }

  const roster = rosterReadiness(schedule);
  const calendarState = calendarReadiness(schedule, calendar);
  const sync = calendar.lastSync;
  const match = Boolean(
    schedule.snapshot &&
    sync?.disposition === "synced" &&
    sync.snapshotId === schedule.snapshot.snapshotId,
  );
  const { assessment, guidance } = overallAssessment(
    roster,
    calendarState,
    match ? (sync?.conflictCount ?? 0) : 0,
  );

  return {
    asOf: now.toISOString(),
    assessment,
    guidance,
    roster: {
      source: "alkimii",
      readiness: roster,
      preferredSource: schedule.preferredSource,
      snapshotId: schedule.snapshot?.snapshotId ?? null,
      importedAt: schedule.lastImportedAt,
      observedAt: schedule.snapshot?.observedAt ?? null,
      timeZone: schedule.snapshot?.timeZone ?? null,
      shiftCount: schedule.snapshot?.shifts.length ?? 0,
      pendingRefresh: schedule.pendingRefresh,
      isStale: schedule.isStale,
      latestChangeCount: schedule.latestChanges.length,
      nextShift: schedule.nextShift
        ? {
            startAt: schedule.nextShift.startAt,
            endAt: schedule.nextShift.endAt,
            status: schedule.nextShift.status,
          }
        : null,
    },
    calendar: {
      provider: "google-calendar",
      clientConfigured: calendar.clientConfigured,
      connected: calendar.connected,
      autoSyncWorkSchedule: calendar.autoSyncWorkSchedule,
      readiness: calendarState,
      lastRecordedSyncMatchesRoster: match,
      lastSync: sync
        ? {
            disposition: sync.disposition,
            snapshotId: sync.snapshotId,
            attemptedAt: sync.attemptedAt,
            completedAt: sync.completedAt,
            created: sync.created,
            updated: sync.updated,
            deleted: sync.deleted,
            unchanged: sync.unchanged,
            conflictCount: sync.conflictCount,
            errorRecorded: Boolean(sync.error),
          }
        : null,
    },
    boundaries: {
      readOnly: true,
      rosterSourceOfTruth: "pa4-alkimii",
      calendarProjectionOwner: "pa5-google-calendar",
      syncEvidence: "last-recorded-pa5-summary",
      contactsGoogleCalendar: false,
      exposesCredentials: false,
      exposesCalendarId: false,
      exposesRawShiftMetadata: false,
      executesTools: false,
      createsEvents: false,
      updatesEvents: false,
      deletesEvents: false,
      schedulesInterruptions: false,
    },
  };
}
