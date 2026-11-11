import assert from "node:assert/strict";
import { buildScheduleCalendarDiagnostics } from "../packages/personal-assistance/src/scheduleCalendarAuthority/diagnostics";
import type { WorkScheduleStatus } from "../packages/personal-assistance/src/workSchedule/types";
import type { GoogleCalendarStatus } from "../packages/personal-assistance/src/calendar/types";

const NOW = new Date("2026-11-10T12:00:00.000Z");

function scheduleFixture(): WorkScheduleStatus {
  const shift = {
    id: "shift_private_identifier",
    source: "alkimii" as const,
    date: "2026-11-11",
    startAt: "2026-11-11T14:00:00.000Z",
    endAt: "2026-11-11T23:00:00.000Z",
    role: "SECRET_ROLE_123",
    location: "SECRET_LOCATION_123",
    department: "SECRET_DEPARTMENT_123",
    status: "scheduled" as const,
    fingerprint: "SECRET_FINGERPRINT_123",
  };
  return {
    source: "alkimii",
    preferredSource: null,
    staleAfterMinutes: 1440,
    isStale: false,
    pendingRefresh: false,
    lastImportedAt: "2026-11-10T11:50:00.000Z",
    latestSignal: null,
    latestChanges: [],
    snapshot: {
      schemaVersion: 1,
      snapshotId: "schedule_current",
      source: "alkimii",
      observedAt: "2026-11-10T11:49:00.000Z",
      importedAt: "2026-11-10T11:50:00.000Z",
      timeZone: "Europe/Dublin",
      shifts: [shift],
    },
    nextShift: shift,
    boundaries: {
      executesTools: false,
      grantsPermissions: false,
      createsCalendarEvents: false,
      sendsMessages: false,
    },
  };
}

function calendarFixture(): GoogleCalendarStatus {
  return {
    provider: "google-calendar",
    clientConfigured: true,
    connected: true,
    redirectUri: "https://SECRET_OAUTH_REDIRECT.invalid/callback",
    calendarId: "SECRET_CALENDAR_ID_123",
    autoSyncWorkSchedule: true,
    eventTitle: "SECRET_EVENT_TITLE_123",
    lastSync: {
      disposition: "synced",
      snapshotId: "schedule_current",
      created: 1,
      updated: 0,
      deleted: 0,
      unchanged: 0,
      conflictCount: 0,
      attemptedAt: "2026-11-10T11:54:00.000Z",
      completedAt: "2026-11-10T11:55:00.000Z",
      error: null,
    },
    boundaries: {
      sourceOfTruth: "pa4-work-schedule",
      mayCreateManagedWorkEvents: true,
      mayUpdateManagedWorkEvents: true,
      mayDeleteManagedWorkEvents: true,
      mayModifyUnrelatedEvents: false,
      mayDeleteUnrelatedEvents: false,
      mayInferExtraShifts: false,
    },
  };
}

function evaluate(
  changeSchedule?: (schedule: WorkScheduleStatus) => void,
  changeCalendar?: (calendar: GoogleCalendarStatus) => void,
  profileTimeZone: string | null = "Europe/Dublin",
) {
  const schedule = scheduleFixture();
  const calendar = calendarFixture();
  changeSchedule?.(schedule);
  changeCalendar?.(calendar);
  const before = JSON.stringify({ schedule, calendar });
  const result = buildScheduleCalendarDiagnostics(schedule, calendar, profileTimeZone, NOW);
  assert.equal(JSON.stringify({ schedule, calendar }), before, "diagnostics must not mutate either input");
  return result;
}

function codes(result: ReturnType<typeof evaluate>) {
  return new Set(result.findings.map((finding) => finding.code));
}

async function main() {
  const good = evaluate();
  assert.equal(good.assessment, "recorded-aligned");
  assert.equal(good.findings.length, 0);
  assert.equal(good.evidenceScope, "local-pa4-pa5-records-only");
  assert.equal(good.roster.ageMinutes, 10);
  assert.equal(good.calendar.lastSyncAgeMinutes, 5);
  assert.equal(good.calendar.recordedSnapshotMatches, true);
  assert.equal(good.boundaries.canEstablishRemoteDrift, false);
  console.log("PASS aligned authority is based on recorded PA-4/PA-5 evidence, not a remote Google claim");

  const missing = evaluate((s) => { s.snapshot = null; s.nextShift = null; s.lastImportedAt = null; s.isStale = true; });
  assert(codes(missing).has("roster-missing"));
  const pending = evaluate((s) => { s.pendingRefresh = true; s.isStale = true; });
  assert(codes(pending).has("roster-refresh-pending"));
  assert(codes(pending).has("roster-stale"));
  const empty = evaluate((s) => { if (s.snapshot) s.snapshot.shifts = []; s.nextShift = null; });
  assert(codes(empty).has("roster-empty"));
  const noUpcoming = evaluate((s) => { s.nextShift = null; });
  assert.equal(noUpcoming.roster.hasUpcomingShiftInSnapshot, false);
  assert.equal(noUpcoming.findings.length, 0, "no future shift is not a fabricated schedule issue");
  console.log("PASS missing, stale, pending, empty and no-upcoming-shift conditions stay distinct");

  const unset = evaluate(undefined, undefined, null);
  assert(codes(unset).has("profile-time-zone-unset"));
  const mismatch = evaluate((s) => { if (s.snapshot) s.snapshot.timeZone = "UTC"; });
  assert(codes(mismatch).has("roster-profile-time-zone-mismatch"));
  const invalid = evaluate((s) => { if (s.snapshot) s.snapshot.timeZone = "Mars/Olympus"; });
  assert(codes(invalid).has("roster-time-zone-invalid"));
  const future = evaluate((s) => { s.lastImportedAt = "2026-11-10T12:15:00.000Z"; });
  assert(codes(future).has("roster-future-timestamp"));
  console.log("PASS configured time zone, absent profile zone, and clock anomalies are safely classified");

  const disconnected = evaluate(undefined, (c) => { c.connected = false; });
  assert(codes(disconnected).has("calendar-disconnected"));
  const disabled = evaluate(undefined, (c) => { c.autoSyncWorkSchedule = false; });
  assert(codes(disabled).has("calendar-auto-sync-disabled"));
  const skipped = evaluate(undefined, (c) => { if (c.lastSync) c.lastSync.disposition = "skipped-not-connected"; });
  assert(codes(skipped).has("calendar-sync-skipped"));
  const failed = evaluate(undefined, (c) => { if (c.lastSync) { c.lastSync.disposition = "failed"; c.lastSync.error = "SECRET_OAUTH_FAILURE_123"; } });
  assert(codes(failed).has("calendar-sync-failed"));
  const mismatchSync = evaluate(undefined, (c) => { if (c.lastSync) c.lastSync.snapshotId = "old_snapshot"; });
  assert(codes(mismatchSync).has("calendar-snapshot-mismatch"));
  assert.equal(mismatchSync.calendar.recordedSnapshotMatches, false);
  console.log("PASS connection, configuration, skipped, failed, and snapshot-drift histories are classified");

  const conflict = evaluate(undefined, (c) => { if (c.lastSync) c.lastSync.conflictCount = 2; });
  assert(codes(conflict).has("calendar-recorded-conflicts"));
  assert.equal(conflict.calendar.lastRecordedConflictCount, 2);
  const prior = evaluate(undefined, (c) => { if (c.lastSync) c.lastSync.completedAt = "2026-11-10T11:00:00.000Z"; });
  assert(codes(prior).has("calendar-sync-before-roster"));
  const staleConflict = evaluate(undefined, (c) => { if (c.lastSync) { c.lastSync.snapshotId = "old_snapshot"; c.lastSync.conflictCount = 12; } });
  assert.equal(staleConflict.calendar.lastRecordedConflictCount, 0);
  assert(!codes(staleConflict).has("calendar-recorded-conflicts"));
  console.log("PASS recorded conflicts do not masquerade as live events or leak old-snapshot evidence");

  const serialized = JSON.stringify([good, failed, mismatch, conflict]);
  for (const forbidden of [
    "SECRET_ROLE_123", "SECRET_LOCATION_123", "SECRET_DEPARTMENT_123", "SECRET_FINGERPRINT_123",
    "SECRET_CALENDAR_ID_123", "SECRET_EVENT_TITLE_123", "SECRET_OAUTH_REDIRECT", "SECRET_OAUTH_FAILURE_123",
  ]) assert(!serialized.includes(forbidden), `sensitive value leaked: ${forbidden}`);
  assert.equal(good.boundaries.readOnly, true);
  assert.equal(good.boundaries.contactsGoogle, false);
  assert.equal(good.boundaries.createsResponsibilities, false);
  assert.equal(good.boundaries.changesTimeZone, false);
  assert.equal(good.boundaries.createsEvents, false);
  assert.equal(good.boundaries.updatesEvents, false);
  assert.equal(good.boundaries.deletesEvents, false);
  console.log("PASS isolated read-only diagnostics preserve privacy and never mutate PA-4/PA-5 sources");

  console.log("OH-6E2 SCHEDULE/CALENDAR DIAGNOSTICS: PASS");
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
