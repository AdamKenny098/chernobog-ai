import type {
  Responsibility,
  ResponsibilityAuditEntry,
  ResponsibilityState,
} from "../responsibilities/types";
import {
  canTransitionResponsibility,
  isClosedResponsibilityState,
} from "../responsibilities/stateMachine";
import {
  assessResponsibility,
} from "./readModel";

/**
 * OH-6D2 - Reconcile an existing responsibility and its audit trail.
 * Produces read-only diagnostic metadata. Does not infer a completed action.
 */
export type LifecycleFinding =
  | "missing-created-audit"
  | "multiple-created-audits"
  | "revision-audit-count-mismatch"
  | "duplicate-audit-id"
  | "audit-for-another-responsibility"
  | "invalid-audit-timestamp"
  | "audit-timestamps-out-of-order"
  | "invalid-transition"
  | "transition-chain-gap"
  | "last-recorded-state-mismatch"
  | "duplicate-evidence-source"
  | "missing-evidence";

export type LifecycleFollowUp =
  | "closed"
  | "awaiting-user"
  | "awaiting-external"
  | "awaiting-delegate"
  | "scheduled"
  | "unassigned";

export type ResponsibilityLifecycleSnapshot = {
  responsibilityId: string;
  asOf: string;
  state: ResponsibilityState;
  revision: number;
  sourceType: Responsibility["source"]["type"];
  evidence: {
    total: number;
    distinctSources: number;
    duplicateSources: number;
  };
  audit: {
    totalEvents: number;
    sourceReplays: number;
    evidenceMerges: number;
    stateChanges: number;
    reopened: number;
    lastEventAt: string | null;
  };
  followUp: {
    communicationThread: boolean;
    status: LifecycleFollowUp;
    overdue: boolean;
    dueSoon: boolean;
    needsUserDecision: boolean;
    // A past due date never authorizes unsolicited contact or actions.
    allowsAutomaticContact: false;
  };
  integrity: {
    status: "consistent" | "needs-review";
    findings: LifecycleFinding[];
  };
  boundaries: {
    readOnly: true;
    rawEvidenceReturned: false;
    rawAuditReasonsReturned: false;
    sendsMessages: false;
    modifiesLedger: false;
    schedulesInterruptions: false;
    grantsPermissions: false;
  };
};

function followUpState(state: ResponsibilityState): LifecycleFollowUp {
  if (isClosedResponsibilityState(state)) return "closed";
  if (state === "waiting-user") return "awaiting-user";
  if (state === "waiting-external") return "awaiting-external";
  if (state === "delegated") return "awaiting-delegate";
  if (state === "scheduled") return "scheduled";
  return "unassigned";
}

export function assessResponsibilityLifecycle(
  responsibility: Readonly<Responsibility>,
  history: readonly ResponsibilityAuditEntry[],
  asOf: Date = new Date(),
): ResponsibilityLifecycleSnapshot {
  if (!Number.isFinite(asOf.getTime())) {
    throw new Error("asOf must be a valid date.");
  }

  const findings = new Set<LifecycleFinding>();
  const createdCount = history.filter((entry) => entry.event === "created").length;
  if (createdCount === 0) findings.add("missing-created-audit");
  if (createdCount > 1) findings.add("multiple-created-audits");
  if (history.length !== responsibility.revision) {
    findings.add("revision-audit-count-mismatch");
  }

  const auditIds = new Set<string>();
  let lastTimestamp = Number.NEGATIVE_INFINITY;
  let recordedState: ResponsibilityState | undefined;
  for (const entry of history) {
    if (auditIds.has(entry.id)) findings.add("duplicate-audit-id");
    auditIds.add(entry.id);
    if (entry.responsibilityId !== responsibility.id) {
      findings.add("audit-for-another-responsibility");
    }

    const at = Date.parse(entry.timestamp);
    if (!Number.isFinite(at)) {
      findings.add("invalid-audit-timestamp");
    } else {
      if (at < lastTimestamp) findings.add("audit-timestamps-out-of-order");
      lastTimestamp = at;
    }

    if (entry.event === "created") {
      if (recordedState && recordedState !== entry.toState) {
        findings.add("transition-chain-gap");
      }
      recordedState = entry.toState;
    } else if (entry.event === "state-changed" || entry.event === "reopened") {
      if (!entry.fromState || !entry.toState ||
          !canTransitionResponsibility(entry.fromState, entry.toState)) {
        findings.add("invalid-transition");
      }
      if (recordedState && entry.fromState !== recordedState) {
        findings.add("transition-chain-gap");
      }
      if (!recordedState && entry.fromState) {
        findings.add("transition-chain-gap");
      }
      recordedState = entry.toState;
    }
  }
  if (recordedState && recordedState !== responsibility.state) {
    findings.add("last-recorded-state-mismatch");
  }

  const evidenceSources = new Set<string>();
  let duplicates = 0;
  for (const entry of responsibility.evidence) {
    // Evidence with no sourceId is not assumed to represent the same event.
    const identity = entry.source.sourceId
      ? JSON.stringify([entry.source.type, entry.source.sourceId])
      : `evidence:${entry.id}`;
    if (evidenceSources.has(identity)) duplicates++;
    evidenceSources.add(identity);
  }
  if (duplicates) findings.add("duplicate-evidence-source");
  if (!responsibility.evidence.length) findings.add("missing-evidence");

  const assessment = assessResponsibility(responsibility, asOf);
  return {
    responsibilityId: responsibility.id,
    asOf: asOf.toISOString(),
    state: responsibility.state,
    revision: responsibility.revision,
    sourceType: responsibility.source.type,
    evidence: {
      total: responsibility.evidence.length,
      distinctSources: evidenceSources.size,
      duplicateSources: duplicates,
    },
    audit: {
      totalEvents: history.length,
      sourceReplays: history.filter((entry) => entry.event === "source-replayed").length,
      evidenceMerges: history.filter((entry) => entry.event === "evidence-merged").length,
      stateChanges: history.filter((entry) => entry.event === "state-changed").length,
      reopened: history.filter((entry) => entry.event === "reopened").length,
      lastEventAt: history.length ? history[history.length - 1].timestamp : null,
    },
    followUp: {
      communicationThread: responsibility.mergeKey?.startsWith("notification-thread:") === true,
      status: followUpState(responsibility.state),
      overdue: assessment.overdue,
      dueSoon: assessment.dueSoon,
      needsUserDecision: assessment.needsUserDecision,
      allowsAutomaticContact: false,
    },
    integrity: {
      status: findings.size === 0 ? "consistent" : "needs-review",
      findings: [...findings].sort(),
    },
    boundaries: {
      readOnly: true,
      rawEvidenceReturned: false,
      rawAuditReasonsReturned: false,
      sendsMessages: false,
      modifiesLedger: false,
      schedulesInterruptions: false,
      grantsPermissions: false,
    },
  };
}
