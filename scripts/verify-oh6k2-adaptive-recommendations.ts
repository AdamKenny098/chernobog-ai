import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { UnifiedAttentionItem, UnifiedAttentionQueue } from "../packages/personal-assistance/src/unifiedAttentionQueue/readModel";
import { buildAdaptiveRecommendations } from "../packages/personal-assistance/src/adaptiveRecommendations/readModel";

const item = (id: string, overrides: Partial<UnifiedAttentionItem> = {}): UnifiedAttentionItem => ({
  id,
  origin: "responsibility-ledger",
  lane: "now",
  priority: "important",
  title: `Responsibility ${id}`,
  actionHint: `Review responsibility ${id} manually.`,
  dueAt: null,
  requiresUser: true,
  responsibilityId: id,
  reasonCodes: ["priority-elevated", "user-decision-needed"],
  ...overrides,
});
const queue: UnifiedAttentionQueue = {
  asOf: "2026-11-16T00:00:00.000Z",
  totalMatching: 4,
  returned: 4,
  counts: { now: 3, upcoming: 0, waiting: 0, review: 1, responsibilities: 2, health: 2 },
  context: {
    evidenceScope: "local-pa3a-pa4-pa5-only",
    notificationRepresentation: "projected-responsibilities-only",
    rosterReadiness: "stale",
    calendarReadiness: "recorded-synced",
    diagnosticFindings: 2,
    duplicateResponsibilityIdsSuppressed: 0,
    secondaryHealthFindingsSuppressed: 0,
  },
  items: [
    item("health:roster", { origin: "schedule-calendar-health", responsibilityId: null,
      title: "Review Alkimii schedule authority", actionHint: "Check roster.", reasonCodes: ["roster-stale"] }),
    item("responsibility:one", { responsibilityId: "one" }),
    item("responsibility:two", { responsibilityId: "two" }),
    item("health:calendar-conflicts", { origin: "schedule-calendar-health", lane: "review",
      responsibilityId: null, title: "Review recorded conflicts", reasonCodes: ["calendar-recorded-conflicts"] }),
  ],
  boundaries: { readOnly: true, sendsMessages: false, executesTools: false, updatesResponsibilities: false,
    createsCalendarEvents: false, contactsGoogle: false, schedulesInterruptions: false,
    overridesDoNotDisturb: false, grantsPermissions: false, exposesRawNotificationEvidence: false, exposesCalendarId: false },
};
const policy = { attentionState: "available" as const, proactiveAssistanceEnabled: false,
  interruptionPreference: "critical-only" as const };
const before = JSON.stringify({ queue, policy });
const result = buildAdaptiveRecommendations(queue, policy);
assert.equal(result.totalMatching, 4);
assert.equal(result.returned, 4);
assert.deepEqual(result.items.map((x) => x.sourceItemId), queue.items.map((x) => x.id));
assert.deepEqual(result.items.map((x) => x.rank), [1, 2, 3, 4]);
assert.notEqual(result.items[1].id, result.items[2].id);
assert.equal(JSON.stringify({ queue, policy }), before);
console.log("PASS preserves OH-6F ranking, stable IDs, separate responsibilities and input immutability");

assert.equal(result.items[0].category, "roster-health");
assert.equal(result.items[0].evidence.confidence, "qualified");
assert.match(result.items[0].evidence.caveat ?? "", /cannot establish current shifts/i);
assert.equal(result.source.inferredShiftAvailability, false);
assert.equal(result.items[3].category, "calendar-health");
assert.match(result.items[3].evidence.caveat ?? "", /historical records/i);
assert.equal(result.source.remoteCalendarVerified, false);
console.log("PASS stale roster and historical calendar evidence never become inferred live availability");

for (const rec of result.items.slice(1, 3)) {
  assert.equal(rec.category, "user-decision");
  assert.match(rec.evidence.explanation, /owner decision/i);
  assert.deepEqual(rec.reasonCodes, ["priority-elevated", "user-decision-needed"]);
}
const waiting = buildAdaptiveRecommendations({ ...queue, totalMatching: 1, returned: 1,
  items: [item("responsibility:wait", { lane: "waiting", requiresUser: false, reasonCodes: ["waiting-external"] })] }, policy);
assert.equal(waiting.items[0].category, "waiting-on-other");
assert.match(waiting.items[0].suggestedAction, /do not contact anyone/i);
console.log("PASS reason codes explained without inventing outreach or creating new duties");

const dnd = buildAdaptiveRecommendations(queue, { ...policy, attentionState: "do-not-disturb",
  proactiveAssistanceEnabled: true });
assert.equal(dnd.policy.pushEnabled, false);
assert.equal(dnd.policy.notificationAttempts, 0);
assert.ok(dnd.policy.reasons.includes("absolute-do-not-disturb"));
const availableOptIn = buildAdaptiveRecommendations(queue, { ...policy,
  proactiveAssistanceEnabled: true, interruptionPreference: "all" });
assert.equal(availableOptIn.policy.pushEnabled, false);
assert.equal(result.policy.proactiveAssistanceEnabled, false);
assert.ok(result.policy.reasons.includes("proactive-assistance-disabled"));
assert.equal(result.boundaries.overridesDoNotDisturb, false);
assert.equal(result.boundaries.writesReminders, false);
assert.equal(result.boundaries.writesCalendar, false);
assert.equal(result.boundaries.writesResponsibilities, false);
console.log("PASS absolute DND and opt-out respected; even opt-in cannot enable K2 push");

const page = buildAdaptiveRecommendations(queue, policy, 2);
assert.equal(page.returned, 2);
assert.equal(page.totalMatching, 4);
assert.equal(page.source.completeCoverage, true);
const truncated = buildAdaptiveRecommendations({ ...queue, totalMatching: 105 }, policy);
assert.equal(truncated.source.completeCoverage, false);
for (const invalid of [0, 101, 1.5, NaN]) {
  assert.throws(() => buildAdaptiveRecommendations(queue, policy, invalid));
}
console.log("PASS bounded display, truthful source truncation and invalid limit rejection");

const route = readFileSync(join(process.cwd(), "app/api/personal-assistance/adaptive-recommendations/route.ts"), "utf8");
assert.match(route, /export async function GET\(/);
assert.doesNotMatch(route, /export async function (POST|PATCH|PUT|DELETE)\(/);
// K2's original GET path was extracted into a shared read-only snapshot in K4.
// Verify BOTH the public route and its delegated source, rather than pinning
// the implementation to one file and producing a false regression failure.
let authoritySource = route;
if (route.includes("readLiveAdaptiveRecommendations(")) {
  assert.match(route, /readLiveAdaptiveRecommendations\(url\.origin, now\)/);
  assert.match(route, /applyAdaptiveFeedback\(/);
  assert.match(route, /from ["']@chernobog\/personal-assistance\/adaptiveRecommendations\/liveSnapshot["']/);
  authoritySource = readFileSync(join(process.cwd(),
    "packages/personal-assistance/src/adaptiveRecommendations/liveSnapshot.ts"), "utf8");
  assert.match(authoritySource, /export async function readLiveAdaptiveRecommendations\(/);
}
assert.match(authoritySource, /buildUnifiedAttentionQueue\(responsibilities, diagnostics, now, \{ limit: 100 \}\)/);
assert.match(authoritySource, /getPersonalAssistanceProfile\(/);
assert.match(authoritySource, /getPersonalAttentionSnapshot\(/);
assert.match(route, /Cache-Control.*no-store/);
assert.doesNotMatch(route + authoritySource,
  /sendNotification|createReminder|reserveDelivery|patchPersonalAssistanceProfile|setPersonalAttention\(/);
console.log("PASS GET-only route, 100-item input, delegated live read-only context and no delivery effects");
console.log("OH-6K2 ADAPTIVE RECOMMENDATIONS: PASS");
