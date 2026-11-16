import type { WorkScheduleStatus } from "../workSchedule/types";
import type { GoogleCalendarStatus } from "../calendar/types";
import { buildScheduleCalendarAuthority } from "./readModel";

type Severity = "critical" | "warning" | "info";
export type ScheduleCalendarFindingCode =
  | "roster-missing"
  | "roster-empty"
  | "roster-refresh-pending"
  | "roster-stale"
  | "roster-future-timestamp"
  | "roster-time-zone-invalid"
  | "profile-time-zone-unset"
  | "profile-time-zone-invalid"
  | "roster-profile-time-zone-mismatch"
  | "calendar-client-unconfigured"
  | "calendar-disconnected"
  | "calendar-auto-sync-disabled"
  | "calendar-never-synced"
  | "calendar-sync-failed"
  | "calendar-sync-skipped"
  | "calendar-snapshot-mismatch"
  | "calendar-sync-future-timestamp"
  | "calendar-sync-before-roster"
  | "calendar-recorded-conflicts";

export type ScheduleCalendarDiagnostic = {
  asOf: string;
  assessment: "recorded-aligned" | "needs-review";
  evidenceScope: "local-pa4-pa5-records-only";
  roster: {
    readiness: string;
    shiftCount: number;
    ageMinutes: number | null;
    staleAfterMinutes: number;
    hasUpcomingShiftInSnapshot: boolean;
    timeZone: string | null;
    profileTimeZoneConfigured: boolean;
  };
  calendar: {
    readiness: string;
    connected: boolean;
    automaticSyncEnabled: boolean;
    recordedSnapshotMatches: boolean;
    lastSyncAgeMinutes: number | null;
    lastSyncDisposition: string | null;
    lastRecordedConflictCount: number;
  };
  findings: {
    code: ScheduleCalendarFindingCode;
    severity: Severity;
    recommendation: string;
  }[];
  boundaries: {
    readOnly: true;
    contactsGoogle: false;
    canEstablishRemoteDrift: false;
    exposesCredentials: false;
    exposesCalendarId: false;
    exposesRawShifts: false;
    exposesOAuthErrors: false;
    createsEvents: false;
    updatesEvents: false;
    deletesEvents: false;
    createsResponsibilities: false;
    changesTimeZone: false;
  };
};

function ageMinutes(value: string | null | undefined, now: Date): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? Math.round((now.getTime() - parsed) / 60_000) : null;
}

function validTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-IE", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

/**
 * OH-6E2 read-only diagnostics of local PA-4 roster and PA-5 recorded-sync state.
 * A matching PA-5 sync record is NOT proof of remote Google Calendar contents.
 */
export function buildScheduleCalendarDiagnostics(
  schedule: WorkScheduleStatus,
  calendar: GoogleCalendarStatus,
  profileTimeZone: string | null,
  now = new Date(),
): ScheduleCalendarDiagnostic {
  if (!Number.isFinite(now.getTime())) throw new Error("Invalid diagnostics timestamp.");
  const view = buildScheduleCalendarAuthority(schedule, calendar, now);
  const findings: ScheduleCalendarDiagnostic["findings"] = [];
  const add = (code: ScheduleCalendarFindingCode, severity: Severity, recommendation: string) => {
    findings.push({ code, severity, recommendation });
  };

  const shiftCount = schedule.snapshot?.shifts.length ?? 0;
  const rosterAge = ageMinutes(schedule.lastImportedAt, now);
  const sync = calendar.lastSync;
  const syncAge = ageMinutes(sync?.completedAt ?? sync?.attemptedAt, now);
  const lastSuccessfulAndMatched = Boolean(
    sync?.disposition === "synced" &&
    schedule.snapshot &&
    sync.snapshotId === schedule.snapshot.snapshotId,
  );

  if (!schedule.snapshot) {
    add("roster-missing", "critical", "Capture the current authoritative roster in Alkimii on the paired Android device.");
  } else {
    if (shiftCount === 0) add("roster-empty", "warning", "Check the captured roster; zero recorded shifts does not establish time off.");
    if (schedule.pendingRefresh) add("roster-refresh-pending", "warning", "Open Alkimii My Schedule > Roster and allow a fresh capture.");
    if (schedule.isStale) add("roster-stale", "warning", "Refresh the Alkimii roster before depending on schedule or calendar projections.");
    if (rosterAge !== null && rosterAge < -5) add("roster-future-timestamp", "warning", "Check device/server clock accuracy and imported roster timestamps.");
    if (!validTimeZone(schedule.snapshot.timeZone)) add("roster-time-zone-invalid", "warning", "Review the stored roster's IANA time zone before interpreting shift times.");
  }
  if (!profileTimeZone) {
    add("profile-time-zone-unset", "warning", "Set the Personal Assistance profile to the intended IANA time zone (for Ireland, Europe/Dublin), then recapture the roster.");
  } else if (!validTimeZone(profileTimeZone)) {
    add("profile-time-zone-invalid", "warning", "Correct the Personal Assistance profile's IANA time zone.");
  } else if (schedule.snapshot && validTimeZone(schedule.snapshot.timeZone) && profileTimeZone !== schedule.snapshot.timeZone) {
    add("roster-profile-time-zone-mismatch", "warning", "Review the profile and roster time zones, particularly across daylight saving transitions; recapture if appropriate.");
  }

  if (!calendar.clientConfigured) add("calendar-client-unconfigured", "critical", "Review PA-5 Google Calendar client configuration; do not expose OAuth secrets.");
  if (!calendar.connected) add("calendar-disconnected", "critical", "Reconnect the existing PA-5 Google Calendar authorization before attempting work-event sync.");
  if (!calendar.autoSyncWorkSchedule) add("calendar-auto-sync-disabled", "warning", "Check whether automatic work-roster projection should be enabled in PA-5.");

  if (!sync) add("calendar-never-synced", "warning", "Review PA-5 status; no previous sync attempt is recorded.");
  else {
    if (sync.disposition === "failed") add("calendar-sync-failed", "warning", "Inspect the PA-5 sync status locally; do not return raw provider error details in this endpoint.");
    else if (sync.disposition !== "synced") add("calendar-sync-skipped", "warning", "Review the PA-5 recorded skip reason and configuration before syncing.");
    else if (schedule.snapshot && sync.snapshotId !== schedule.snapshot.snapshotId) add("calendar-snapshot-mismatch", "warning", "Review whether PA-5 needs to project the latest authoritative Alkimii snapshot.");
    if (syncAge !== null && syncAge < -5) add("calendar-sync-future-timestamp", "warning", "Check server clock accuracy and recorded sync timestamps.");
    const imported = schedule.lastImportedAt ? Date.parse(schedule.lastImportedAt) : NaN;
    const completed = sync.completedAt ? Date.parse(sync.completedAt) : NaN;
    if (lastSuccessfulAndMatched && Number.isFinite(imported) && Number.isFinite(completed) && completed + 60_000 < imported) {
      add("calendar-sync-before-roster", "warning", "Confirm whether the recorded sync predates the latest roster import.");
    }
    if (lastSuccessfulAndMatched && sync.conflictCount > 0) {
      add("calendar-recorded-conflicts", "warning", "Review PA-5's last recorded conflict count; this endpoint cannot identify or confirm current remote conflicts.");
    }
  }

  const order: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };
  findings.sort((a, b) => order[a.severity] - order[b.severity] || a.code.localeCompare(b.code));
  return {
    asOf: now.toISOString(),
    assessment: findings.length === 0 ? "recorded-aligned" : "needs-review",
    evidenceScope: "local-pa4-pa5-records-only",
    roster: {
      readiness: view.roster.readiness,
      shiftCount,
      ageMinutes: rosterAge,
      staleAfterMinutes: schedule.staleAfterMinutes,
      hasUpcomingShiftInSnapshot: schedule.nextShift !== null,
      timeZone: schedule.snapshot?.timeZone ?? null,
      profileTimeZoneConfigured: profileTimeZone !== null && profileTimeZone !== "",
    },
    calendar: {
      readiness: view.calendar.readiness,
      connected: calendar.connected,
      automaticSyncEnabled: calendar.autoSyncWorkSchedule,
      recordedSnapshotMatches: lastSuccessfulAndMatched,
      lastSyncAgeMinutes: syncAge,
      lastSyncDisposition: sync?.disposition ?? null,
      lastRecordedConflictCount: lastSuccessfulAndMatched ? (sync?.conflictCount ?? 0) : 0,
    },
    findings,
    boundaries: {
      readOnly: true,
      contactsGoogle: false,
      canEstablishRemoteDrift: false,
      exposesCredentials: false,
      exposesCalendarId: false,
      exposesRawShifts: false,
      exposesOAuthErrors: false,
      createsEvents: false,
      updatesEvents: false,
      deletesEvents: false,
      createsResponsibilities: false,
      changesTimeZone: false,
    },
  };
}
