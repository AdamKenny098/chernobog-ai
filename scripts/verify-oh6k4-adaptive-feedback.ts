import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Database from "better-sqlite3";
import { buildAdaptiveRecommendations } from "../packages/personal-assistance/src/adaptiveRecommendations/readModel";
import type { UnifiedAttentionQueue } from "../packages/personal-assistance/src/unifiedAttentionQueue/readModel";
import {
  AdaptiveFeedbackStore,
  applyAdaptiveFeedback,
  recommendationEvidenceSignature,
} from "../packages/personal-assistance/src/adaptiveRecommendations/feedback";

const now = new Date("2026-11-16T01:00:00.000Z");
const queue = {
  asOf: now.toISOString(),
  totalMatching: 4,
  returned: 4,
  context: { evidenceScope: "local-pa3a-pa4-pa5-only", rosterReadiness: "stale", calendarReadiness: "recorded-synced" },
  items: [
    { id: "health:roster", origin: "schedule-calendar-health", lane: "now", priority: "important",
      title: "Private synthetic work schedule", actionHint: "Refresh", dueAt: null,
      requiresUser: true, responsibilityId: null, reasonCodes: ["roster-stale"] },
    { id: "responsibility:resp_one", origin: "responsibility-ledger", lane: "now", priority: "important",
      title: "Private synthetic responsibility 1", actionHint: "Review", dueAt: null,
      requiresUser: true, responsibilityId: "resp_one", reasonCodes: ["priority-elevated", "user-decision-needed"] },
    { id: "responsibility:resp_two", origin: "responsibility-ledger", lane: "now", priority: "important",
      title: "Private synthetic responsibility 2", actionHint: "Review", dueAt: null,
      requiresUser: true, responsibilityId: "resp_two", reasonCodes: ["priority-elevated", "user-decision-needed"] },
    { id: "health:calendar-conflicts", origin: "schedule-calendar-health", lane: "review", priority: "critical",
      title: "Private synthetic conflict", actionHint: "Review recorded conflicts", dueAt: null,
      requiresUser: true, responsibilityId: null, reasonCodes: ["calendar-recorded-conflicts"] },
  ],
} as unknown as UnifiedAttentionQueue;
const policy = { attentionState: "do-not-disturb", proactiveAssistanceEnabled: false, interruptionPreference: "critical-only" } as const;
const snapshot = buildAdaptiveRecommendations(queue, policy, 100);
const [roster, first, second, critical] = snapshot.items;
const db = new Database(":memory:");
try {
  const store = new AdaptiveFeedbackStore(db);
  const frozen = JSON.stringify(snapshot);
  function feedback() { return store.listFor(snapshot.items.map((item) => item.id)); }
  const useful = store.record(first, { actionKey: "owner:k4:1", recommendationId: first.id,
    verdict: "useful", expectedRevision: 0 }, now);
  assert.equal(useful.disposition, "recorded");
  assert.equal(useful.feedback.revision, 1);
  assert.equal(store.record(first, { actionKey: "owner:k4:1", recommendationId: first.id,
    verdict: "useful", expectedRevision: 0 }, now).disposition, "replayed");
  assert.equal(store.history(first.id).length, 1);
  assert.throws(() => store.record(first, { actionKey: "owner:k4:1", recommendationId: first.id,
    verdict: "clear", expectedRevision: 1 }, now), /action key reused/u);
  assert.throws(() => store.record(first, { actionKey: "owner:k4:2", recommendationId: first.id,
    verdict: "irrelevant", expectedRevision: 0 }, now), /revision conflict/u);
  assert.equal(applyAdaptiveFeedback(snapshot, feedback(), now).items[1].feedback.state, "useful");
  console.log("PASS useful verdict, transaction idempotency, revision conflicts and bounded audit");

  store.record(roster, { actionKey: "owner:k4:3", recommendationId: roster.id,
    verdict: "irrelevant", expectedRevision: 0 }, now);
  store.record(second, { actionKey: "owner:k4:4", recommendationId: second.id,
    verdict: "revisit-later", revisitAt: "2026-11-17T01:00:00Z", expectedRevision: 0 }, now);
  const applied = applyAdaptiveFeedback(snapshot, feedback(), now);
  assert.equal(applied.returned, 2);
  assert.deepEqual(applied.items.map((item) => item.id), [first.id, critical.id]);
  assert.equal(applied.feedbackSummary.hiddenIrrelevant, 1);
  assert.equal(applied.feedbackSummary.hiddenRevisit, 1);
  assert.equal(applied.source.totalMatching, 4);
  assert.equal(applied.totalMatching, 4);
  assert.deepEqual(applied.items.map((item) => item.rank), [2, 4]);
  assert.deepEqual(applyAdaptiveFeedback(snapshot, feedback(), now, 100, true).items.map((item) => item.id),
    snapshot.items.map((item) => item.id));
  console.log("PASS explicit suppression, show-hidden recovery, source ranking and truthful totals");

  assert.equal(applyAdaptiveFeedback(snapshot, feedback(), new Date("2026-11-18T01:00:00Z"))
    .items.some((item) => item.id === second.id), true);
  assert.equal(applyAdaptiveFeedback(snapshot, feedback(), new Date("2026-12-17T01:00:00Z"))
    .items.some((item) => item.id === roster.id), true);
  store.record(critical, { actionKey: "owner:k4:5", recommendationId: critical.id,
    verdict: "irrelevant", expectedRevision: 0 }, now);
  assert.equal(applyAdaptiveFeedback(snapshot, feedback(), now).items.find((item) => item.id === critical.id)
    ?.feedback.state, "visible-critical");
  const revisedSnapshot = { ...snapshot, items: snapshot.items.map((item) =>
    item.id === roster.id ? { ...item, reasonCodes: [...item.reasonCodes, "roster-refresh-pending"] } : item) };
  const revised = applyAdaptiveFeedback(revisedSnapshot, feedback(), now);
  assert.equal(revised.feedbackSummary.staleEvidenceIgnored, 1);
  assert.equal(revised.items.some((item) => item.id === roster.id), true);
  assert.notEqual(recommendationEvidenceSignature(roster),
    recommendationEvidenceSignature(revisedSnapshot.items[0]));
  const renamedSnapshot = { ...snapshot, items: snapshot.items.map((item) =>
    item.id === roster.id ? { ...item, title: "Changed title after feedback" } : item) };
  assert.equal(applyAdaptiveFeedback(renamedSnapshot, feedback(), now).items.some((item) => item.id === roster.id), true);
  console.log("PASS future revisit, expiring dismissals, critical visibility and evidence-change invalidation");

  store.record(first, { actionKey: "owner:k4:6", recommendationId: first.id,
    verdict: "clear", expectedRevision: 1 }, now);
  assert.equal(store.get(first.id)?.revision, 2);
  assert.equal(applyAdaptiveFeedback(snapshot, feedback(), now).items.find((item) => item.id === first.id)
    ?.feedback.state, "cleared");
  assert.equal(store.history(first.id).length, 2);
  for (const input of [
    { actionKey: "", recommendationId: first.id, verdict: "useful" as const, expectedRevision: 2 },
    { actionKey: "bad key", recommendationId: first.id, verdict: "useful" as const, expectedRevision: 2 },
    { actionKey: "owner:k4:7", recommendationId: "unknown", verdict: "useful" as const, expectedRevision: 2 },
    { actionKey: "owner:k4:7", recommendationId: first.id, verdict: "revisit-later" as const,
      expectedRevision: 2, revisitAt: "2026-11-17T12:00:00" },
    { actionKey: "owner:k4:7", recommendationId: first.id, verdict: "revisit-later" as const,
      expectedRevision: 2, revisitAt: "2027-01-17T12:00:00Z" },
    { actionKey: "owner:k4:7", recommendationId: first.id, verdict: "useful" as const,
      expectedRevision: 2, revisitAt: "2026-11-17T12:00:00Z" },
  ]) assert.throws(() => store.record(first, input, now));
  assert.throws(() => store.listFor([first.id, first.id]), /selection/u);
  assert.throws(() => store.history(first.id, 101));
  assert.throws(() => applyAdaptiveFeedback(snapshot, feedback(), now, 0));
  assert.equal(JSON.stringify(snapshot), frozen);
  assert.deepEqual(snapshot.policy, policy && {
    attentionState: policy.attentionState, proactiveAssistanceEnabled: false,
    interruptionPreference: "critical-only", deliveryMode: "on-demand-only", pushEnabled: false,
    notificationAttempts: 0, reasons: ["k2-read-only-on-demand-only", "proactive-assistance-disabled", "absolute-do-not-disturb"],
  });
  console.log("PASS clear/undo, strict offset bounds, immutability, DND and preference noninterference");

  const persisted = JSON.stringify(db.prepare("SELECT * FROM personal_assistance_adaptive_feedback_v1").all()) +
    JSON.stringify(db.prepare("SELECT * FROM personal_assistance_adaptive_feedback_action_v1").all());
  assert.ok(!persisted.includes("Private synthetic"));
  assert.ok(!persisted.includes("Refresh recorded conflicts"));
  assert.ok(!persisted.includes("title"));
  const route = readFileSync("app/api/personal-assistance/adaptive-feedback/route.ts", "utf8");
  const k2Route = readFileSync("app/api/personal-assistance/adaptive-recommendations/route.ts", "utf8");
  assert.match(route, /export async function POST\(/u);
  assert.match(route, /origin !== url\.origin/u);
  assert.match(route, /sec-fetch-site/u);
  assert.match(route, /REQUEST_FIELDS/u);
  assert.match(route, /recommendation_stale_or_unknown/u);
  assert.match(k2Route, /applyAdaptiveFeedback\(/u);
  assert.doesNotMatch(route, /patchPersonalAssistanceProfile|setPersonalAttention|dispatchOne|\.claim\(/u);
  assert.equal(snapshot.boundaries.sendsMessages, false);
  assert.equal(snapshot.boundaries.overridesDoNotDisturb, false);
  console.log("PASS privacy-minimized SQLite, guarded explicit API and unchanged push/DND boundaries");
} finally { db.close(); }
console.log("OH-6K4 EXPLICIT ADAPTIVE FEEDBACK: PASS");
