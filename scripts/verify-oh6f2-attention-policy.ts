import assert from "node:assert/strict";
import type { PersonalAttentionSnapshot } from "../packages/personal-assistance/src/types";
import type { PersonalAssistanceProfile } from "../packages/personal-assistance/src/profileTypes";
import type { UnifiedAttentionQueue, UnifiedAttentionItem } from "../packages/personal-assistance/src/unifiedAttentionQueue/readModel";
import { assessUnifiedAttentionPolicy } from "../packages/personal-assistance/src/unifiedAttentionQueue/policy";

const asOf = "2026-11-11T15:00:00.000Z";
const item = (id: string, patch: Partial<UnifiedAttentionItem> = {}): UnifiedAttentionItem => ({
  id, origin: "responsibility-ledger", lane: "now", priority: "important",
  title: `Review ${id}`, actionHint: "Review.", dueAt: null,
  requiresUser: true, responsibilityId: id, reasonCodes: ["user-decision-needed"],
  ...patch,
});
const items: UnifiedAttentionItem[] = [
  item("important"),
  item("critical", { priority: "critical" }),
  item("low", { priority: "low" }),
  item("health", { origin: "schedule-calendar-health", priority: "critical", responsibilityId: null }),
  item("waiting", { lane: "waiting", priority: "critical" }),
  item("upcoming", { lane: "upcoming", priority: "critical" }),
  item("non-user", { requiresUser: false, priority: "critical" }),
  item("review", { lane: "review", priority: "critical" }),
];
const queue: UnifiedAttentionQueue = {
  asOf, totalMatching: items.length, returned: items.length,
  counts: { now: 5, upcoming: 1, waiting: 1, review: 1, responsibilities: 7, health: 1 },
  context: {
    evidenceScope: "local-pa3a-pa4-pa5-only",
    notificationRepresentation: "projected-responsibilities-only",
    rosterReadiness: "current", calendarReadiness: "recorded-synced", diagnosticFindings: 0,
    duplicateResponsibilityIdsSuppressed: 0, secondaryHealthFindingsSuppressed: 0,
  },
  items,
  boundaries: {
    readOnly: true, sendsMessages: false, executesTools: false,
    updatesResponsibilities: false, createsCalendarEvents: false,
    contactsGoogle: false, schedulesInterruptions: false,
    overridesDoNotDisturb: false, grantsPermissions: false,
    exposesRawNotificationEvidence: false, exposesCalendarId: false,
  },
};
const attention = (state: PersonalAttentionSnapshot["state"] = "available"): PersonalAttentionSnapshot => ({
  state, source: "explicit-user", confidence: 1, explicit: true,
  setAt: asOf, expiresAt: null, reason: null, revision: 1,
});
const prefs = (
  interruptionPreference: PersonalAssistanceProfile["interruptionPreference"] = "all",
  proactiveAssistanceEnabled = true,
) => ({ interruptionPreference, proactiveAssistanceEnabled });
const result = assessUnifiedAttentionPolicy(queue, attention(), prefs());
const decisions = Object.fromEntries(result.items.map((x) => [x.itemId, x.decision]));
assert.equal(decisions.important, "candidate");
assert.equal(decisions.critical, "candidate");
assert.equal(decisions.low, "candidate");
assert.equal(decisions.health, "queue-only");
assert.equal(decisions.waiting, "queue-only");
assert.equal(decisions.upcoming, "queue-only");
assert.equal(decisions["non-user"], "queue-only");
assert.equal(decisions.review, "queue-only");
assert.equal(result.counts.candidate, 3);
console.log("PASS only actionable now-lane ledger entries can become advisory candidates");

const dnd = assessUnifiedAttentionPolicy(queue, attention("do-not-disturb"), prefs());
assert.equal(dnd.counts.candidate, 0);
assert.equal(dnd.counts.deferred, 3);
assert.equal(dnd.items.find((x) => x.itemId === "critical")?.decision, "deferred");
assert.equal(dnd.boundaries.overridesDoNotDisturb, false);
for (const state of ["busy", "away"] as const) {
  const result = assessUnifiedAttentionPolicy(queue, attention(state), prefs());
  assert.equal(result.counts.candidate, 0);
  assert.equal(result.counts.deferred, 3);
}
console.log("PASS DND, busy, and away defer candidates without overriding attention authority");

const onlyCritical = assessUnifiedAttentionPolicy(queue, attention(), prefs("critical-only"));
assert.equal(onlyCritical.counts.candidate, 1);
assert.equal(onlyCritical.items.find((x) => x.itemId === "important")?.decision, "queue-only");
const important = assessUnifiedAttentionPolicy(queue, attention(), prefs("important"));
assert.equal(important.counts.candidate, 2);
const normal = assessUnifiedAttentionPolicy(queue, attention(), prefs("normal"));
assert.equal(normal.counts.candidate, 2);
const off = assessUnifiedAttentionPolicy(queue, attention(), prefs("all", false));
assert.equal(off.counts.candidate, 0);
assert.equal(off.counts.queueOnly, items.length);
console.log("PASS explicit preference thresholds and disabled proactive assistance gate delivery candidates");

const limited = assessUnifiedAttentionPolicy({ ...queue, returned: 2, items: items.slice(0, 2) }, attention(), prefs());
assert.equal(limited.completeCoverage, false);
assert.equal(limited.evaluated, 2);
const original = JSON.stringify(queue);
const first = assessUnifiedAttentionPolicy(queue, attention(), prefs());
assert.deepEqual(first, assessUnifiedAttentionPolicy(queue, attention(), prefs()));
assert.equal(JSON.stringify(queue), original);
assert.throws(() => assessUnifiedAttentionPolicy(queue, attention(), {
  interruptionPreference: "wrong" as "all", proactiveAssistanceEnabled: true,
}));
assert.equal(first.boundaries.advisoryOnly, true);
assert.equal(first.boundaries.schedulesInterruptions, false);
console.log("PASS deterministic, bounded, non-mutating policy with complete-coverage flag");
console.log("OH-6F2 ATTENTION PRIORITY/DND POLICY: PASS");
