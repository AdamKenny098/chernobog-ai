import assert from "node:assert/strict";
import {
  buildScheduleCalendarAuthority,
} from "../packages/personal-assistance/src/scheduleCalendarAuthority/readModel";
import type {
  WorkScheduleStatus,
} from "../packages/personal-assistance/src/workSchedule/types";
import type {
  GoogleCalendarStatus,
} from "../packages/personal-assistance/src/calendar/types";

const FIXED = new Date("2026-11-09T18:00:00.000Z");

function baseSchedule(): WorkScheduleStatus {
  const startAt = "2026-11-10T14:00:00.000Z";
  const endAt = "2026-11-10T23:00:00.000Z";
  const shift = {
    id: "shift-1",
    source: "alkimii" as const,
    date: "2026-11-10",
    startAt,
    endAt,
    status: "scheduled" as const,
    fingerprint: "fixture-fingerprint",
    role: "private-role-must-not-leak",
    location: "private-location-must-not-leak",
  };
  return {
    source: "alkimii",
    preferredSource: "alkimii",
    staleAfterMinutes: 1440,
    isStale: false,
    pendingRefresh: false,
    lastImportedAt: "2026-11-09T17:50:00.000Z",
    latestSignal: null,
    latestChanges: [],
    snapshot: {
      schemaVersion: 1,
      snapshotId: "snapshot-123",
      source: "alkimii",
      observedAt: "2026-11-09T17:48:00.000Z",
      importedAt: "2026-11-09T17:50:00.000Z",
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

function baseCalendar(): GoogleCalendarStatus {
  return {
    provider: "google-calendar",
    clientConfigured: true,
    connected: true,
    redirectUri: "https://private.example/callback",
    calendarId: "private-calendar-id",
    autoSyncWorkSchedule: true,
    eventTitle: "Work",
    lastSync: {
      disposition: "synced",
      snapshotId: "snapshot-123",
      created: 1,
      updated: 0,
      deleted: 0,
      unchanged: 0,
      conflictCount: 0,
      attemptedAt: "2026-11-09T17:51:00.000Z",
      completedAt: "2026-11-09T17:52:00.000Z",
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

function assess(
  mutateSchedule?: (s: WorkScheduleStatus) => void,
  mutateCalendar?: (c: GoogleCalendarStatus) => void,
) {
  const schedule = baseSchedule();
  const calendar = baseCalendar();
  mutateSchedule?.(schedule);
  mutateCalendar?.(calendar);
  const before = JSON.stringify({ schedule, calendar });
  const result = buildScheduleCalendarAuthority(
    schedule,
    calendar,
    FIXED,
  );
  assert.equal(JSON.stringify({ schedule, calendar }), before);
  return result;
}

function pass(message: string) {
  console.log(`PASS ${message}`);
}

async function main() {
  const aligned = assess();
  assert.equal(aligned.assessment, "recorded-aligned");
  assert.equal(aligned.roster.source, "alkimii");
  assert.equal(aligned.roster.timeZone, "Europe/Dublin");
  assert.equal(aligned.roster.shiftCount, 1);
  assert.equal(aligned.roster.nextShift?.startAt, "2026-11-10T14:00:00.000Z");
  assert.equal(aligned.calendar.lastRecordedSyncMatchesRoster, true);
  assert.equal(aligned.boundaries.syncEvidence, "last-recorded-pa5-summary");
  pass("PA-4 authoritative roster and recorded PA-5 snapshot match");

  const missing = assess((s) => {
    s.snapshot = null;
    s.lastImportedAt = null;
    s.nextShift = null;
    s.isStale = true;
  });
  assert.equal(missing.assessment, "needs-roster");
  assert.equal(missing.roster.readiness, "missing");
  assert.equal(missing.calendar.lastRecordedSyncMatchesRoster, false);

  const stale = assess((s) => {
    s.isStale = true;
  });
  assert.equal(stale.roster.readiness, "stale");
  assert.equal(stale.assessment, "needs-roster");

  const pending = assess((s) => {
    s.pendingRefresh = true;
  });
  assert.equal(pending.roster.readiness, "refresh-pending");
  assert.equal(pending.assessment, "needs-roster");

  const empty = assess((s) => {
    if (s.snapshot) s.snapshot.shifts = [];
    s.nextShift = null;
  });
  assert.equal(empty.roster.readiness, "empty");
  pass("missing, stale, pending, or empty roster cannot be treated as current");

  const disconnected = assess(undefined, (c) => {
    c.connected = false;
  });
  assert.equal(disconnected.calendar.readiness, "disconnected");
  assert.equal(disconnected.assessment, "needs-calendar");

  const disabled = assess(undefined, (c) => {
    c.autoSyncWorkSchedule = false;
  });
  assert.equal(disabled.calendar.readiness, "auto-sync-disabled");
  assert.equal(disabled.assessment, "needs-calendar");

  const noSync = assess(undefined, (c) => {
    c.lastSync = null;
  });
  assert.equal(noSync.calendar.readiness, "never-synced");
  assert.equal(noSync.assessment, "needs-sync-review");

  const mismatch = assess(undefined, (c) => {
    if (c.lastSync) c.lastSync.snapshotId = "older-snapshot";
  });
  assert.equal(mismatch.calendar.readiness, "snapshot-mismatch");
  assert.equal(mismatch.assessment, "needs-sync-review");
  assert.equal(mismatch.calendar.lastRecordedSyncMatchesRoster, false);

  const failed = assess(undefined, (c) => {
    if (c.lastSync) {
      c.lastSync.disposition = "failed";
      c.lastSync.error = "private oauth details must not leak";
    }
  });
  assert.equal(failed.calendar.readiness, "sync-failed");
  assert.equal(failed.calendar.lastSync?.errorRecorded, true);
  pass("connection, settings, missing sync, mismatched snapshot, and failures identified");

  const conflicts = assess(undefined, (c) => {
    if (c.lastSync) c.lastSync.conflictCount = 2;
  });
  assert.equal(conflicts.assessment, "review-conflicts");
  assert.equal(conflicts.calendar.lastSync?.conflictCount, 2);
  pass("recorded PA-5 conflicts result in manual review, not calendar mutation");

  const serialized = JSON.stringify(aligned) + JSON.stringify(failed);
  for (const forbidden of [
    "private-calendar-id",
    "private-role-must-not-leak",
    "private-location-must-not-leak",
    "private oauth details must not leak",
    "private.example",
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
  assert.equal(aligned.boundaries.createsEvents, false);
  assert.equal(aligned.boundaries.updatesEvents, false);
  assert.equal(aligned.boundaries.deletesEvents, false);
  assert.equal(aligned.boundaries.exposesCredentials, false);
  pass("assessment is non-mutating and excludes secrets and raw shift metadata");

  console.log("OH-6E1 SCHEDULE/CALENDAR AUTHORITY: PASS");
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
