import type {
  Responsibility,
  ResponsibilityAuditEntry,
} from "../responsibilities/types";
import { isClosedResponsibilityState } from "../responsibilities/stateMachine";
import { assessResponsibility } from "./readModel";
import {
  assessResponsibilityLifecycle,
} from "./lifecycle";
import type { LifecycleFinding } from "./lifecycle";

/**
 * OH-6D3: bounded, aggregate-only integration health for the existing ledger.
 * This layer cannot update the ledger, resolve responsibilities, or contact users.
 * Counts describe the scanned subset, not unscanned responsibilities.
 */
export type ResponsibilityIntegrationRecord = {
  responsibility: Readonly<Responsibility>;
  history: readonly ResponsibilityAuditEntry[];
};

export type ResponsibilityIntegrationHealth = {
  asOf: string;
  status: "consistent" | "needs-review" | "partial";
  coverage: {
    totalAvailable: number;
    scanned: number;
    truncated: boolean;
  };
  counts: {
    open: number;
    closed: number;
    overdue: number;
    dueSoon: number;
    highPriority: number;
    waitingOnUser: number;
    waitingExternal: number;
    waitingDelegate: number;
    scheduled: number;
    needsUserDecision: number;
    communicationThreads: number;
    inconsistent: number;
    duplicateLedgerIds: number;
  };
  findings: Partial<Record<LifecycleFinding, number>>;
  boundaries: {
    readOnly: true;
    aggregatesOnly: true;
    rawEvidenceReturned: false;
    rawAuditReasonsReturned: false;
    sendsMessages: false;
    executesTools: false;
    modifiesLedger: false;
    schedulesInterruptions: false;
    grantsPermissions: false;
  };
};

export function buildResponsibilityIntegrationHealth(
  entries: readonly ResponsibilityIntegrationRecord[],
  asOf: Date = new Date(),
  totalAvailable = entries.length,
): ResponsibilityIntegrationHealth {
  if (!Number.isFinite(asOf.getTime())) {
    throw new Error("asOf must be a valid date.");
  }
  if (!Number.isSafeInteger(totalAvailable) || totalAvailable < entries.length) {
    throw new Error("totalAvailable must be a nonnegative integer >= scanned records.");
  }

  const counts: ResponsibilityIntegrationHealth["counts"] = {
    open: 0,
    closed: 0,
    overdue: 0,
    dueSoon: 0,
    highPriority: 0,
    waitingOnUser: 0,
    waitingExternal: 0,
    waitingDelegate: 0,
    scheduled: 0,
    needsUserDecision: 0,
    communicationThreads: 0,
    inconsistent: 0,
    duplicateLedgerIds: 0,
  };
  const findings: ResponsibilityIntegrationHealth["findings"] = {};
  const ids = new Set<string>();

  for (const entry of entries) {
    const responsibility = entry.responsibility;
    if (ids.has(responsibility.id)) {
      counts.duplicateLedgerIds++;
    }
    ids.add(responsibility.id);

    const interpreted = assessResponsibility(responsibility, asOf);
    const lifecycle = assessResponsibilityLifecycle(
      responsibility,
      entry.history,
      asOf,
    );

    if (isClosedResponsibilityState(responsibility.state)) counts.closed++;
    else counts.open++;
    if (interpreted.overdue) counts.overdue++;
    if (interpreted.dueSoon) counts.dueSoon++;
    if (!isClosedResponsibilityState(responsibility.state) &&
      (responsibility.priority === "important" || responsibility.priority === "critical")) {
      counts.highPriority++;
    }
    if (interpreted.waitingOn === "user") counts.waitingOnUser++;
    if (interpreted.waitingOn === "external") counts.waitingExternal++;
    if (interpreted.waitingOn === "delegate") counts.waitingDelegate++;
    if (interpreted.waitingOn === "schedule") counts.scheduled++;
    if (interpreted.needsUserDecision) counts.needsUserDecision++;
    if (lifecycle.followUp.communicationThread) counts.communicationThreads++;
    if (lifecycle.integrity.status === "needs-review") counts.inconsistent++;
    for (const finding of lifecycle.integrity.findings) {
      findings[finding] = (findings[finding] ?? 0) + 1;
    }
  }

  const truncated = totalAvailable > entries.length;
  const hasIssues = counts.inconsistent > 0 || counts.duplicateLedgerIds > 0;
  return {
    asOf: asOf.toISOString(),
    status: hasIssues ? "needs-review" : truncated ? "partial" : "consistent",
    coverage: {
      totalAvailable,
      scanned: entries.length,
      truncated,
    },
    counts,
    findings,
    boundaries: {
      readOnly: true,
      aggregatesOnly: true,
      rawEvidenceReturned: false,
      rawAuditReasonsReturned: false,
      sendsMessages: false,
      executesTools: false,
      modifiesLedger: false,
      schedulesInterruptions: false,
      grantsPermissions: false,
    },
  };
}
