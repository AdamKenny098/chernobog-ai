import type { Responsibility } from "../responsibilities/types";
import { assessResponsibility } from "../responsibilityIntelligence/readModel";
import type { ScheduleCalendarDiagnostic } from "../scheduleCalendarAuthority/diagnostics";
import type { ScheduleCalendarFindingCode } from "../scheduleCalendarAuthority/diagnostics";

/**
 * OH-6F1: deterministic presentation of authoritative PA-3A responsibilities
 * and PA-4/PA-5 health findings. This is NOT a second ledger or notification
 * processor. No notification receipt can create a new queue item here.
 */
export type UnifiedAttentionLane = "now" | "upcoming" | "waiting" | "review";
export type UnifiedAttentionOrigin = "responsibility-ledger" | "schedule-calendar-health";
export type UnifiedAttentionPriority = "critical" | "important" | "normal" | "low";

export type UnifiedAttentionItem = {
  id: string;
  origin: UnifiedAttentionOrigin;
  lane: UnifiedAttentionLane;
  priority: UnifiedAttentionPriority;
  title: string;
  actionHint: string;
  dueAt: string | null;
  requiresUser: boolean;
  responsibilityId: string | null;
  reasonCodes: string[];
};

export type UnifiedAttentionQueue = {
  asOf: string;
  totalMatching: number;
  returned: number;
  counts: {
    now: number;
    upcoming: number;
    waiting: number;
    review: number;
    responsibilities: number;
    health: number;
  };
  context: {
    evidenceScope: "local-pa3a-pa4-pa5-only";
    notificationRepresentation: "projected-responsibilities-only";
    rosterReadiness: string;
    calendarReadiness: string;
    diagnosticFindings: number;
    duplicateResponsibilityIdsSuppressed: number;
    secondaryHealthFindingsSuppressed: number;
  };
  items: UnifiedAttentionItem[];
  boundaries: {
    readOnly: true;
    sendsMessages: false;
    executesTools: false;
    updatesResponsibilities: false;
    createsCalendarEvents: false;
    contactsGoogle: false;
    schedulesInterruptions: false;
    overridesDoNotDisturb: false;
    grantsPermissions: false;
    exposesRawNotificationEvidence: false;
    exposesCalendarId: false;
  };
};

export type UnifiedAttentionOptions = {
  limit?: number;
  lane?: UnifiedAttentionLane;
};

const LANE_ORDER: Readonly<Record<UnifiedAttentionLane, number>> = {
  now: 0,
  upcoming: 1,
  review: 2,
  waiting: 3,
};

const PRIORITY_ORDER: Readonly<Record<UnifiedAttentionPriority, number>> = {
  critical: 0,
  important: 1,
  normal: 2,
  low: 3,
};

const ROSTER_FINDINGS: ReadonlySet<ScheduleCalendarFindingCode> = new Set([
  "roster-missing",
  "roster-empty",
  "roster-refresh-pending",
  "roster-stale",
  "roster-future-timestamp",
  "roster-time-zone-invalid",
  "profile-time-zone-unset",
  "profile-time-zone-invalid",
  "roster-profile-time-zone-mismatch",
]);

const CONNECTION_FINDINGS: ReadonlySet<ScheduleCalendarFindingCode> = new Set([
  "calendar-client-unconfigured",
  "calendar-disconnected",
  "calendar-auto-sync-disabled",
]);

const SYNC_FINDINGS: ReadonlySet<ScheduleCalendarFindingCode> = new Set([
  "calendar-never-synced",
  "calendar-sync-failed",
  "calendar-sync-skipped",
  "calendar-snapshot-mismatch",
  "calendar-sync-future-timestamp",
  "calendar-sync-before-roster",
]);

function responsibilityItem(
  responsibility: Readonly<Responsibility>,
  asOf: Date,
): UnifiedAttentionItem | null {
  const assessment = assessResponsibility(responsibility, asOf);
  if (assessment.reviewBucket === "closed") return null;

  // Waiting on a third party is not permission to interrupt the owner.
  // Even if overdue, it remains a monitored waiting item.
  const lane: UnifiedAttentionLane =
    assessment.waitingOn === "external" || assessment.waitingOn === "delegate"
      ? "waiting"
      : assessment.waitingOn === "schedule"
        ? "upcoming"
        : assessment.overdue || assessment.needsUserDecision ||
          assessment.priority === "critical"
          ? "now"
          : assessment.dueSoon
            ? "upcoming"
            : "review";

  return {
    id: `responsibility:${responsibility.id}`,
    origin: "responsibility-ledger",
    lane,
    priority: responsibility.priority,
    title: responsibility.title,
    actionHint: responsibility.suggestedAction ??
      (lane === "waiting" ? "Monitor for a response; do not contact automatically." :
        "Review this existing responsibility."),
    dueAt: responsibility.dueAt ?? null,
    requiresUser: assessment.needsUserDecision,
    responsibilityId: responsibility.id,
    reasonCodes: assessment.reasonCodes,
  };
}

function healthItems(diagnostics: ScheduleCalendarDiagnostic): {
  items: UnifiedAttentionItem[];
  suppressed: number;
} {
  const all = diagnostics.findings;
  const grouped = (codes: ReadonlySet<ScheduleCalendarFindingCode>) =>
    all.filter((finding) => codes.has(finding.code));

  const roster = grouped(ROSTER_FINDINGS);
  const connection = grouped(CONNECTION_FINDINGS);
  const sync = grouped(SYNC_FINDINGS);
  const conflicts = all.filter((finding) => finding.code === "calendar-recorded-conflicts");
  const items: UnifiedAttentionItem[] = [];
  let includedFindings = 0;

  const pushHealth = (
    key: string,
    findings: typeof all,
    lane: UnifiedAttentionLane,
    title: string,
    actionHint: string,
  ) => {
    if (findings.length === 0) return;
    includedFindings += findings.length;
    items.push({
      id: `health:${key}`,
      origin: "schedule-calendar-health",
      lane,
      priority: findings.some((f) => f.severity === "critical") ? "critical" : "important",
      title,
      actionHint,
      dueAt: null,
      requiresUser: true,
      responsibilityId: null,
      reasonCodes: findings.map((f) => f.code).sort(),
    });
  };

  pushHealth(
    "roster",
    roster,
    "now",
    "Review Alkimii schedule authority",
    "Refresh or correct the authoritative Alkimii roster and time zone before relying on shifts.",
  );
  pushHealth(
    "calendar-connection",
    connection,
    "now",
    "Review Google Calendar connection",
    "Check the existing PA-5 connection and auto-sync settings; do not change events from this queue.",
  );

  // A calendar-sync warning is secondary while its prerequisite roster or
  // connection is broken. Don't show multiple cards for one root cause.
  if (roster.length === 0 && connection.length === 0) {
    pushHealth(
      "calendar-sync",
      sync,
      "review",
      "Review recorded calendar synchronization",
      "Check PA-5's last sync and target calendar; this is not a live Google drift check.",
    );
  }
  pushHealth(
    "calendar-conflicts",
    conflicts,
    "review",
    "Review previously recorded calendar conflicts",
    "PA-5 reported overlaps during its last recorded sync; verify in Google Calendar manually.",
  );

  return { items, suppressed: all.length - includedFindings };
}

/** Pure transform. Does not read, mutate, enqueue, connect, or schedule. */
export function buildUnifiedAttentionQueue(
  responsibilities: readonly Responsibility[],
  diagnostics: ScheduleCalendarDiagnostic,
  asOf = new Date(),
  options: UnifiedAttentionOptions = {},
): UnifiedAttentionQueue {
  if (!Number.isFinite(asOf.getTime())) throw new Error("asOf must be a valid date.");
  if (options.limit !== undefined &&
      (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > 100)) {
    throw new Error("limit must be an integer between 1 and 100.");
  }
  if (options.lane !== undefined && !(options.lane in LANE_ORDER)) {
    throw new Error("Unknown attention queue lane.");
  }

  const seen = new Set<string>();
  let duplicates = 0;
  const ledgerItems: UnifiedAttentionItem[] = [];
  for (const responsibility of responsibilities) {
    if (seen.has(responsibility.id)) {
      duplicates++;
      continue;
    }
    seen.add(responsibility.id);
    const item = responsibilityItem(responsibility, asOf);
    if (item) ledgerItems.push(item);
  }
  const health = healthItems(diagnostics);
  const matching = [...ledgerItems, ...health.items]
    .filter((item) => options.lane === undefined || item.lane === options.lane)
    .sort((a, b) =>
      LANE_ORDER[a.lane] - LANE_ORDER[b.lane] ||
      PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
      (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999") ||
      a.id.localeCompare(b.id),
    );
  const shown = matching.slice(0, options.limit ?? 50);

  return {
    asOf: asOf.toISOString(),
    totalMatching: matching.length,
    returned: shown.length,
    counts: {
      now: matching.filter((item) => item.lane === "now").length,
      upcoming: matching.filter((item) => item.lane === "upcoming").length,
      waiting: matching.filter((item) => item.lane === "waiting").length,
      review: matching.filter((item) => item.lane === "review").length,
      responsibilities: matching.filter((item) => item.origin === "responsibility-ledger").length,
      health: matching.filter((item) => item.origin === "schedule-calendar-health").length,
    },
    context: {
      evidenceScope: "local-pa3a-pa4-pa5-only",
      notificationRepresentation: "projected-responsibilities-only",
      rosterReadiness: diagnostics.roster.readiness,
      calendarReadiness: diagnostics.calendar.readiness,
      diagnosticFindings: diagnostics.findings.length,
      duplicateResponsibilityIdsSuppressed: duplicates,
      secondaryHealthFindingsSuppressed: health.suppressed,
    },
    items: shown,
    boundaries: {
      readOnly: true,
      sendsMessages: false,
      executesTools: false,
      updatesResponsibilities: false,
      createsCalendarEvents: false,
      contactsGoogle: false,
      schedulesInterruptions: false,
      overridesDoNotDisturb: false,
      grantsPermissions: false,
      exposesRawNotificationEvidence: false,
      exposesCalendarId: false,
    },
  };
}
