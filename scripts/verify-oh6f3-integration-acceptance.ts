import assert from "node:assert/strict";
import type { UnifiedAttentionItem, UnifiedAttentionQueue } from "../packages/personal-assistance/src/unifiedAttentionQueue/readModel";
import type { PersonalAttentionSnapshot } from "../packages/personal-assistance/src/types";
import type { PersonalAssistanceProfile } from "../packages/personal-assistance/src/profileTypes";
import { assessUnifiedAttentionPolicy } from "../packages/personal-assistance/src/unifiedAttentionQueue/policy";
import { evaluateUnifiedAttentionAcceptance } from "../packages/personal-assistance/src/unifiedAttentionQueue/acceptance";

const at = "2026-11-12T17:00:00.000Z";
const item = (id: string, patch: Partial<UnifiedAttentionItem> = {}): UnifiedAttentionItem => ({
  id, origin: "responsibility-ledger", lane: "now", priority: "important",
  title: "Synthetic item; must not appear in acceptance response.",
  actionHint: "Synthetic action; must not appear in acceptance response.",
  dueAt: null, requiresUser: true, responsibilityId: id,
  reasonCodes: ["synthetic-test"], ...patch,
});
const items: UnifiedAttentionItem[] = [
  item("critical", { priority: "critical" }),
  item("important"),
  item("waiting", { lane: "waiting", priority: "critical", requiresUser: false }),
  item("health", { origin: "schedule-calendar-health", lane: "review", priority: "critical", responsibilityId: null }),
];
const queue: UnifiedAttentionQueue = {
  asOf: at, totalMatching: 4, returned: 4,
  counts: { now: 2, upcoming: 0, waiting: 1, review: 1, responsibilities: 3, health: 1 },
  context: {
    evidenceScope: "local-pa3a-pa4-pa5-only", notificationRepresentation: "projected-responsibilities-only",
    rosterReadiness: "current", calendarReadiness: "recorded-synced", diagnosticFindings: 1,
    duplicateResponsibilityIdsSuppressed: 0, secondaryHealthFindingsSuppressed: 0,
  },
  items,
  boundaries: {
    readOnly: true, sendsMessages: false, executesTools: false,
    updatesResponsibilities: false, createsCalendarEvents: false, contactsGoogle: false,
    schedulesInterruptions: false, overridesDoNotDisturb: false, grantsPermissions: false,
    exposesRawNotificationEvidence: false, exposesCalendarId: false,
  },
};
const attention = (state: PersonalAttentionSnapshot["state"] = "available"): PersonalAttentionSnapshot => ({
  state, source: "explicit-user", confidence: 1, explicit: true,
  setAt: at, expiresAt: null, reason: null, revision: 1,
});
const preference = (
  proactiveAssistanceEnabled: boolean,
  interruptionPreference: PersonalAssistanceProfile["interruptionPreference"] = "all",
) => ({ proactiveAssistanceEnabled, interruptionPreference });

const snapshot = JSON.stringify(queue);
const disabled = assessUnifiedAttentionPolicy(queue, attention(), preference(false));
const disabledResult = evaluateUnifiedAttentionAcceptance(queue, disabled);
assert.equal(disabledResult.status, "ready");
assert.equal(disabledResult.policyCounts.queueOnly, 4);
assert.equal(disabledResult.policyCounts.candidate, 0);
assert.equal(disabledResult.coverage.complete, true);
assert.deepEqual(disabledResult.findings, []);
assert.equal(disabledResult.safeguards.mappingConsistent, true);
assert.equal(disabledResult.safeguards.readOnlyBoundariesIntact, true);
assert.equal(disabledResult.boundaries.sendsMessages, false);
assert.equal(disabledResult.boundaries.schedulesInterruptions, false);
assert.equal(JSON.stringify(queue), snapshot);
assert.equal(JSON.stringify(disabledResult).includes("Synthetic item"), false);
assert.equal(JSON.stringify(disabledResult).includes("Synthetic action"), false);
assert.deepEqual(disabledResult, evaluateUnifiedAttentionAcceptance(queue, disabled));
console.log("PASS existing disabled-proactive live posture accepted without changing user preferences");

for (const state of ["do-not-disturb", "busy", "away"] as const) {
  const assessment = assessUnifiedAttentionPolicy(queue, attention(state), preference(true));
  const result = evaluateUnifiedAttentionAcceptance(queue, assessment);
  assert.equal(result.status, "ready");
  assert.equal(result.policyCounts.candidate, 0);
  assert.equal(result.policyCounts.deferred, 2);
  assert.equal(result.safeguards.noDndOverride, true);
}
const criticalOnly = evaluateUnifiedAttentionAcceptance(
  queue, assessUnifiedAttentionPolicy(queue, attention(), preference(true, "critical-only")),
);
assert.equal(criticalOnly.status, "ready");
assert.equal(criticalOnly.policyCounts.candidate, 1);
assert.equal(criticalOnly.policyCounts.queueOnly, 3);
console.log("PASS critical never overrides DND, busy or away; preference thresholds enforced");

const dnd = assessUnifiedAttentionPolicy(queue, attention("do-not-disturb"), preference(true));
const forbidden = { ...dnd, items: dnd.items.map((p, i) => i === 0 ? { ...p, decision: "candidate" as const } : p),
  counts: { candidate: 1, deferred: 1, queueOnly: 2 } };
const forbiddenResult = evaluateUnifiedAttentionAcceptance(queue, forbidden);
assert.equal(forbiddenResult.status, "inconsistent");
assert.equal(forbiddenResult.safeguards.noDndOverride, false);
assert.equal(forbiddenResult.safeguards.noForbiddenCandidates, false);
assert.ok(forbiddenResult.findings.includes("dnd-override-detected"));
const mismatch = { ...disabled, items: [...disabled.items].reverse() };
const mismatchResult = evaluateUnifiedAttentionAcceptance(queue, mismatch);
assert.equal(mismatchResult.status, "inconsistent");
assert.ok(mismatchResult.findings.includes("queue-policy-item-mapping-mismatch"));
const tamperedBoundary = { ...disabled, boundaries: { ...disabled.boundaries, executesTools: true as false } };
assert.equal(evaluateUnifiedAttentionAcceptance(queue, tamperedBoundary).status, "inconsistent");
const inconsistentCount = { ...disabled, counts: { ...disabled.counts, queueOnly: 3 } };
assert.equal(evaluateUnifiedAttentionAcceptance(queue, inconsistentCount).status, "inconsistent");
console.log("PASS mismatched IDs, policy counts, forbidden candidates and execution boundaries fail closed");

const limitedQueue: UnifiedAttentionQueue = { ...queue, returned: 2, items: items.slice(0, 2) };
const limitedPolicy = assessUnifiedAttentionPolicy(limitedQueue, attention(), preference(false));
const limitedResult = evaluateUnifiedAttentionAcceptance(limitedQueue, limitedPolicy);
assert.equal(limitedResult.status, "partial");
assert.equal(limitedResult.coverage.complete, false);
assert.equal(limitedResult.coverage.totalMatching, 4);
assert.equal(limitedResult.coverage.evaluated, 2);
assert.deepEqual(limitedResult.findings, ["bounded-coverage-partial"]);
const tamperedCoverage = { ...limitedPolicy, completeCoverage: true };
assert.equal(evaluateUnifiedAttentionAcceptance(limitedQueue, tamperedCoverage).status, "inconsistent");
console.log("PASS bounded pagination is clearly partial, never silently reported as full coverage");
console.log("OH-6F3 INTEGRATION & ACCEPTANCE: PASS");
