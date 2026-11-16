import assert from "node:assert/strict";
import type { Responsibility } from "../packages/personal-assistance/src/responsibilities/types";
import type { ScheduleCalendarDiagnostic } from "../packages/personal-assistance/src/scheduleCalendarAuthority/diagnostics";
import { buildUnifiedAttentionQueue } from "../packages/personal-assistance/src/unifiedAttentionQueue/readModel";

const asOf = new Date("2026-11-11T15:00:00.000Z");

function responsibility(
  id: string,
  overrides: Partial<Responsibility> = {},
): Responsibility {
  return {
    id,
    title: `Responsibility ${id}`,
    summary: "Do not leak this summary to the queue.",
    source: { type: "notification", sourceId: `sensitive-${id}`, application: "WhatsApp" },
    state: "detected",
    priority: "normal",
    requiresHuman: false,
    createdAt: "2026-11-11T11:00:00.000Z",
    updatedAt: "2026-11-11T12:00:00.000Z",
    confidence: 0.92,
    evidence: [{ id: `ev-${id}`, source: { type: "notification", sourceId: `secret-${id}` }, observedAt: asOf.toISOString() }],
    relatedResponsibilityIds: [],
    mergeKey: `private-thread-${id}`,
    revision: 1,
    ...overrides,
  };
}

function diagnostic(
  findings: ScheduleCalendarDiagnostic["findings"] = [],
): ScheduleCalendarDiagnostic {
  return {
    asOf: asOf.toISOString(),
    assessment: findings.length ? "needs-review" : "recorded-aligned",
    evidenceScope: "local-pa4-pa5-records-only",
    roster: {
      readiness: "current",
      shiftCount: 5,
      ageMinutes: 1,
      staleAfterMinutes: 240,
      hasUpcomingShiftInSnapshot: true,
      timeZone: "Europe/Dublin",
      profileTimeZoneConfigured: true,
    },
    calendar: {
      readiness: "recorded-synced",
      connected: true,
      automaticSyncEnabled: true,
      recordedSnapshotMatches: true,
      lastSyncAgeMinutes: 1,
      lastSyncDisposition: "synced",
      lastRecordedConflictCount: 0,
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

const ledger = [
  responsibility("overdue", {
    priority: "critical", requiresHuman: true,
    dueAt: "2026-11-11T13:00:00.000Z", state: "waiting-user",
  }),
  responsibility("waiting", {
    state: "waiting-external", dueAt: "2026-11-10T13:00:00.000Z",
    requiresHuman: true,
  }),
  responsibility("upcoming", {
    state: "scheduled", dueAt: "2026-11-11T18:00:00.000Z",
  }),
  responsibility("closed", {
    state: "resolved", requiresHuman: false,
  }),
  responsibility("low", { state: "detected", priority: "low" }),
];
const frozen = JSON.stringify(ledger);
const actual = buildUnifiedAttentionQueue(ledger, diagnostic(), asOf);
assert.equal(actual.totalMatching, 4);
assert.deepEqual(actual.items.map((item) => item.id), [
  "responsibility:overdue", "responsibility:upcoming", "responsibility:low", "responsibility:waiting",
]);
assert.equal(actual.counts.now, 1);
assert.equal(actual.counts.upcoming, 1);
assert.equal(actual.counts.waiting, 1);
assert.equal(actual.counts.review, 1);
assert.equal(actual.items.find((item) => item.id === "responsibility:waiting")?.requiresUser, false);
assert.equal(actual.items.find((item) => item.id === "responsibility:waiting")?.lane, "waiting");
assert.equal(JSON.stringify(ledger), frozen);
console.log("PASS existing PA-3A responsibility states, ordering and waiting boundaries");

const findings: ScheduleCalendarDiagnostic["findings"] = [
  { code: "roster-stale", severity: "warning", recommendation: "Refresh." },
  { code: "profile-time-zone-unset", severity: "warning", recommendation: "Configure." },
  { code: "calendar-disconnected", severity: "critical", recommendation: "Reconnect." },
  { code: "calendar-sync-skipped", severity: "warning", recommendation: "Sync." },
  { code: "calendar-recorded-conflicts", severity: "warning", recommendation: "Review." },
];
const health = buildUnifiedAttentionQueue([], diagnostic(findings), asOf);
assert.deepEqual(health.items.map((item) => item.id), [
  "health:calendar-connection", "health:roster", "health:calendar-conflicts",
]);
assert.equal(health.counts.health, 3);
assert.equal(health.context.diagnosticFindings, 5);
assert.equal(health.context.secondaryHealthFindingsSuppressed, 1);
assert.deepEqual(health.items.find((item) => item.id === "health:roster")?.reasonCodes, [
  "profile-time-zone-unset", "roster-stale",
]);
console.log("PASS grouped roster/calendar findings without secondary sync duplication");

const syncOnly = buildUnifiedAttentionQueue([], diagnostic([
  { code: "calendar-snapshot-mismatch", severity: "warning", recommendation: "Review." },
]), asOf);
assert.equal(syncOnly.items[0].id, "health:calendar-sync");
assert.equal(syncOnly.items[0].lane, "review");
assert.equal(syncOnly.boundaries.contactsGoogle, false);
console.log("PASS sync drift remains read-only and only recorded local evidence");

const duplicate = buildUnifiedAttentionQueue([ledger[0], ledger[0]], diagnostic(), asOf);
assert.equal(duplicate.totalMatching, 1);
assert.equal(duplicate.context.duplicateResponsibilityIdsSuppressed, 1);
const page = buildUnifiedAttentionQueue(ledger, diagnostic(), asOf, { limit: 2 });
assert.equal(page.totalMatching, 4);
assert.equal(page.returned, 2);
assert.deepEqual(page.items, actual.items.slice(0, 2));
const waitingOnly = buildUnifiedAttentionQueue(ledger, diagnostic(), asOf, { lane: "waiting" });
assert.equal(waitingOnly.totalMatching, 1);
assert.equal(waitingOnly.items[0].id, "responsibility:waiting");
assert.throws(() => buildUnifiedAttentionQueue([], diagnostic(), asOf, { limit: 0 }));
assert.throws(() => buildUnifiedAttentionQueue([], diagnostic(), asOf, { limit: 101 }));
console.log("PASS stable IDs, idempotent reads, bounded pagination and lane filtering");

const serialized = JSON.stringify(actual);
for (const secret of ["Do not leak this summary", "sensitive-overdue", "secret-overdue", "private-thread-overdue"]) {
  assert.equal(serialized.includes(secret), false);
}
assert.equal(actual.boundaries.readOnly, true);
assert.equal(actual.boundaries.sendsMessages, false);
assert.equal(actual.boundaries.schedulesInterruptions, false);
assert.equal(actual.boundaries.overridesDoNotDisturb, false);
assert.equal(actual.context.notificationRepresentation, "projected-responsibilities-only");
console.log("PASS sensitive source metadata omission; no authority to act or interrupt");

console.log("OH-6F1 UNIFIED ATTENTION QUEUE: PASS");
