import type { UnifiedAttentionQueue } from "./readModel";
import type { AttentionQueuePolicyResult } from "./policy";

/**
 * OH-6F3 — independently checks the integrity of a single OH-6F1/OH-6F2
 * read. Does not consult persistence, initiate delivery, or alter authority.
 */
export type UnifiedAttentionAcceptanceStatus = "ready" | "partial" | "inconsistent";

export type UnifiedAttentionAcceptance = {
  asOf: string;
  status: UnifiedAttentionAcceptanceStatus;
  coverage: {
    complete: boolean;
    totalMatching: number;
    evaluated: number;
  };
  queueCounts: UnifiedAttentionQueue["counts"];
  policyCounts: AttentionQueuePolicyResult["counts"];
  policyContext: AttentionQueuePolicyResult["policy"];
  safeguards: {
    mappingConsistent: boolean;
    countsConsistent: boolean;
    noForbiddenCandidates: boolean;
    noDndOverride: boolean;
    readOnlyBoundariesIntact: boolean;
  };
  findings: string[];
  boundaries: {
    readOnly: true;
    advisoryOnly: true;
    sendsMessages: false;
    executesTools: false;
    updatesResponsibilities: false;
    changesUserPreferences: false;
    contactsGoogle: false;
    createsCalendarEvents: false;
    schedulesInterruptions: false;
    overridesDoNotDisturb: false;
    grantsPermissions: false;
    exposesRawNotificationEvidence: false;
    exposesCalendarId: false;
  };
};

const PRIORITY_RANK = { low: 0, normal: 1, important: 2, critical: 3 } as const;
const PREFERENCE_RANK = { all: 0, normal: 1, important: 2, "critical-only": 3 } as const;

const DENIED_QUEUE_BOUNDARIES = [
  "sendsMessages", "executesTools", "updatesResponsibilities", "createsCalendarEvents",
  "contactsGoogle", "schedulesInterruptions", "overridesDoNotDisturb", "grantsPermissions",
  "exposesRawNotificationEvidence", "exposesCalendarId",
] as const;

const DENIED_POLICY_BOUNDARIES = [
  "sendsMessages", "schedulesInterruptions", "overridesDoNotDisturb",
  "changesUserPreferences", "changesResponsibilities", "contactsGoogle",
  "createsCalendarEvents", "executesTools", "grantsPermissions",
] as const;

/**
 * An item may be a candidate ONLY when the user has enabled proactive
 * assistance and is currently available. DND is absolute, including critical.
 * Candidates here are advisory; the future OH-6G dispatcher has separate authority.
 */
function candidateAllowed(
  item: UnifiedAttentionQueue["items"][number],
  policy: AttentionQueuePolicyResult,
): boolean {
  const p = policy.policy;
  if (item.origin !== "responsibility-ledger" || item.lane !== "now" || !item.requiresUser) {
    return false;
  }
  if (!p.proactiveAssistanceEnabled || p.attentionState !== "available") return false;
  return PRIORITY_RANK[item.priority] >= PREFERENCE_RANK[p.interruptionPreference];
}

/** Aggregate checks only. No item names, evidence, notifications, or secrets returned. */
export function evaluateUnifiedAttentionAcceptance(
  queue: Readonly<UnifiedAttentionQueue>,
  policy: Readonly<AttentionQueuePolicyResult>,
): UnifiedAttentionAcceptance {
  const findings: string[] = [];
  const seen = new Set<string>();
  const mapped = queue.items.length === policy.items.length &&
    queue.items.every((item, index) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return policy.items[index]?.itemId === item.id;
    });
  const countValues = [
    queue.returned, queue.totalMatching, policy.evaluated,
    queue.counts.now, queue.counts.upcoming, queue.counts.waiting,
    queue.counts.review, queue.counts.responsibilities, queue.counts.health,
    policy.counts.candidate, policy.counts.deferred, policy.counts.queueOnly,
  ];
  const nonnegativeIntegers = countValues.every(
    (n) => Number.isSafeInteger(n) && n >= 0,
  );
  const countsConsistent = nonnegativeIntegers &&
    queue.returned === queue.items.length &&
    policy.evaluated === policy.items.length &&
    policy.evaluated === queue.returned &&
    queue.returned <= queue.totalMatching &&
    queue.counts.now + queue.counts.upcoming + queue.counts.waiting + queue.counts.review === queue.totalMatching &&
    queue.counts.responsibilities + queue.counts.health === queue.totalMatching &&
    policy.counts.candidate + policy.counts.deferred + policy.counts.queueOnly === policy.evaluated &&
    policy.counts.candidate === policy.items.filter((i) => i.decision === "candidate").length &&
    policy.counts.deferred === policy.items.filter((i) => i.decision === "deferred").length &&
    policy.counts.queueOnly === policy.items.filter((i) => i.decision === "queue-only").length;
  if (!mapped || policy.asOf !== queue.asOf) findings.push("queue-policy-item-mapping-mismatch");
  if (!countsConsistent) findings.push("queue-policy-count-mismatch");

  const noForbiddenCandidates = queue.items.every((item, index) => {
    const decision = policy.items[index]?.decision;
    if (decision !== "candidate") return decision === "deferred" || decision === "queue-only";
    return candidateAllowed(item, policy);
  });
  if (!noForbiddenCandidates) findings.push("forbidden-notification-candidate");

  const noDndOverride = policy.policy.attentionState !== "do-not-disturb" ||
    policy.items.every((item) => item.decision !== "candidate");
  if (!noDndOverride) findings.push("dnd-override-detected");

  const readOnlyBoundariesIntact = queue.boundaries.readOnly === true &&
    policy.boundaries.advisoryOnly === true &&
    DENIED_QUEUE_BOUNDARIES.every((key) => queue.boundaries[key] === false) &&
    DENIED_POLICY_BOUNDARIES.every((key) => policy.boundaries[key] === false);
  if (!readOnlyBoundariesIntact) findings.push("execution-boundary-mismatch");

  const complete = queue.returned === queue.totalMatching &&
    queue.items.length === queue.returned && policy.completeCoverage === true;
  if (policy.completeCoverage !== (queue.returned === queue.totalMatching &&
    queue.items.length === queue.returned)) {
    findings.push("coverage-flag-mismatch");
  }
  if (!complete && findings.length === 0) findings.push("bounded-coverage-partial");

  const status: UnifiedAttentionAcceptanceStatus =
    findings.some((finding) => finding !== "bounded-coverage-partial")
      ? "inconsistent"
      : complete ? "ready" : "partial";

  return {
    asOf: queue.asOf,
    status,
    coverage: { complete, totalMatching: queue.totalMatching, evaluated: policy.evaluated },
    queueCounts: { ...queue.counts },
    policyCounts: { ...policy.counts },
    policyContext: { ...policy.policy },
    safeguards: {
      mappingConsistent: mapped && policy.asOf === queue.asOf,
      countsConsistent,
      noForbiddenCandidates,
      noDndOverride,
      readOnlyBoundariesIntact,
    },
    findings,
    boundaries: {
      readOnly: true,
      advisoryOnly: true,
      sendsMessages: false,
      executesTools: false,
      updatesResponsibilities: false,
      changesUserPreferences: false,
      contactsGoogle: false,
      createsCalendarEvents: false,
      schedulesInterruptions: false,
      overridesDoNotDisturb: false,
      grantsPermissions: false,
      exposesRawNotificationEvidence: false,
      exposesCalendarId: false,
    },
  };
}
