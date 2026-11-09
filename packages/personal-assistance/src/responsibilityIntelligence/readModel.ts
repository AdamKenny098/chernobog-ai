import type {
  Responsibility,
  ResponsibilityPriority,
  ResponsibilitySourceType,
} from "../responsibilities/types";
import {
  isClosedResponsibilityState,
} from "../responsibilities/stateMachine";

/** OH-6D1: deterministic, read-only interpretation of the existing PA-3A ledger. */
export type ResponsibilityReviewBucket =
  | "overdue"
  | "due-soon"
  | "high-priority"
  | "standard"
  | "waiting"
  | "closed";

export type ResponsibilityWaitingOn =
  | "user"
  | "external"
  | "delegate"
  | "schedule"
  | "none";

export type ResponsibilityAssessment = {
  id: string;
  title: string;
  summary: string;
  state: Responsibility["state"];
  priority: ResponsibilityPriority;
  sourceType: ResponsibilitySourceType;
  sourceApplication?: string;
  suggestedAction?: string;
  dueAt?: string;
  updatedAt: string;
  revision: number;
  confidence: number;
  evidenceCount: number;
  reviewBucket: ResponsibilityReviewBucket;
  waitingOn: ResponsibilityWaitingOn;
  needsUserDecision: boolean;
  overdue: boolean;
  dueSoon: boolean;
  reasonCodes: string[];
};

export type ResponsibilityIntelligenceOptions = {
  includeClosed?: boolean;
  sourceType?: ResponsibilitySourceType;
  bucket?: ResponsibilityReviewBucket;
  limit?: number;
};

export type ResponsibilityIntelligenceSnapshot = {
  asOf: string;
  totalMatching: number;
  returned: number;
  counts: {
    open: number;
    overdue: number;
    dueSoon: number;
    highPriority: number;
    waitingExternal: number;
    needsUserDecision: number;
  };
  responsibilities: ResponsibilityAssessment[];
  boundaries: {
    readOnly: true;
    sendsMessages: false;
    executesTools: false;
    changesResponsibilityState: false;
    schedulesInterruptions: false;
    grantsPermissions: false;
  };
};

const BUCKET_ORDER: Readonly<Record<ResponsibilityReviewBucket, number>> = {
  overdue: 0,
  "due-soon": 1,
  "high-priority": 2,
  standard: 3,
  waiting: 4,
  closed: 5,
};

const PRIORITY_ORDER: Readonly<Record<ResponsibilityPriority, number>> = {
  critical: 0,
  important: 1,
  normal: 2,
  low: 3,
};

const SOON_WINDOW_MS = 24 * 60 * 60 * 1000;

export function assessResponsibility(
  responsibility: Readonly<Responsibility>,
  asOf: Date,
): ResponsibilityAssessment {
  if (!Number.isFinite(asOf.getTime())) {
    throw new Error("asOf must be a valid date.");
  }

  const closed = isClosedResponsibilityState(responsibility.state);
  const waitingOn: ResponsibilityWaitingOn = closed
    ? "none"
    : responsibility.state === "waiting-user"
      ? "user"
      : responsibility.state === "waiting-external"
        ? "external"
        : responsibility.state === "delegated"
          ? "delegate"
          : responsibility.state === "scheduled"
            ? "schedule"
            : "none";

  const dueMs = responsibility.dueAt
    ? Date.parse(responsibility.dueAt)
    : Number.NaN;
  const hasDueDate = Number.isFinite(dueMs);
  const remainingMs = dueMs - asOf.getTime();
  const overdue = !closed && hasDueDate && remainingMs < 0;
  const dueSoon =
    !closed && hasDueDate && remainingMs >= 0 && remainingMs <= SOON_WINDOW_MS;
  const highPriority =
    responsibility.priority === "critical" || responsibility.priority === "important";
  const waiting = waitingOn === "external" || waitingOn === "delegate" || waitingOn === "schedule";
  const needsUserDecision =
    !closed && !waiting &&
    (waitingOn === "user" || responsibility.requiresHuman);

  const reviewBucket: ResponsibilityReviewBucket = closed
    ? "closed"
    : overdue
      ? "overdue"
      : dueSoon
        ? "due-soon"
        : waiting
          ? "waiting"
          : highPriority
            ? "high-priority"
            : "standard";

  const reasonCodes: string[] = [];
  if (overdue) reasonCodes.push("due-passed");
  if (dueSoon) reasonCodes.push("due-within-24h");
  if (highPriority) reasonCodes.push("priority-elevated");
  if (needsUserDecision) reasonCodes.push("user-decision-needed");
  if (waitingOn === "external") reasonCodes.push("waiting-external");
  if (waitingOn === "delegate") reasonCodes.push("delegated");
  if (waitingOn === "schedule") reasonCodes.push("scheduled");
  if (closed) reasonCodes.push("closed");
  if (responsibility.confidence < 0.7) reasonCodes.push("limited-confidence");
  if (responsibility.dueAt && !hasDueDate) reasonCodes.push("invalid-due-date");

  // Deliberately exclude source IDs, merge keys, and evidence contents.
  return {
    id: responsibility.id,
    title: responsibility.title,
    summary: responsibility.summary,
    state: responsibility.state,
    priority: responsibility.priority,
    sourceType: responsibility.source.type,
    sourceApplication: responsibility.source.application,
    suggestedAction: responsibility.suggestedAction,
    dueAt: responsibility.dueAt,
    updatedAt: responsibility.updatedAt,
    revision: responsibility.revision,
    confidence: responsibility.confidence,
    evidenceCount: responsibility.evidence.length,
    reviewBucket,
    waitingOn,
    needsUserDecision,
    overdue,
    dueSoon,
    reasonCodes,
  };
}

export function buildResponsibilityIntelligenceSnapshot(
  responsibilities: readonly Responsibility[],
  asOf: Date = new Date(),
  options: ResponsibilityIntelligenceOptions = {},
): ResponsibilityIntelligenceSnapshot {
  if (!Number.isFinite(asOf.getTime())) {
    throw new Error("asOf must be a valid date.");
  }
  if (
    options.limit !== undefined &&
    (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > 200)
  ) {
    throw new Error("limit must be an integer between 1 and 200.");
  }

  const matching = responsibilities
    .filter((item) =>
      (options.includeClosed === true || !isClosedResponsibilityState(item.state)) &&
      (options.sourceType === undefined || item.source.type === options.sourceType),
    )
    .map((item) => assessResponsibility(item, asOf))
    .filter((item) => options.bucket === undefined || item.reviewBucket === options.bucket)
    .sort((a, b) =>
      BUCKET_ORDER[a.reviewBucket] - BUCKET_ORDER[b.reviewBucket] ||
      PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
      (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999") ||
      b.updatedAt.localeCompare(a.updatedAt) ||
      a.id.localeCompare(b.id),
    );

  const counts = {
    open: matching.filter((item) => item.reviewBucket !== "closed").length,
    overdue: matching.filter((item) => item.overdue).length,
    dueSoon: matching.filter((item) => item.dueSoon).length,
    highPriority: matching.filter((item) => item.reviewBucket !== "closed" && (item.priority === "critical" || item.priority === "important")).length,
    waitingExternal: matching.filter((item) => item.waitingOn === "external").length,
    needsUserDecision: matching.filter((item) => item.needsUserDecision).length,
  };
  const limited = matching.slice(0, options.limit ?? 100);

  return {
    asOf: asOf.toISOString(),
    totalMatching: matching.length,
    returned: limited.length,
    counts,
    responsibilities: limited,
    boundaries: {
      readOnly: true,
      sendsMessages: false,
      executesTools: false,
      changesResponsibilityState: false,
      schedulesInterruptions: false,
      grantsPermissions: false,
    },
  };
}
