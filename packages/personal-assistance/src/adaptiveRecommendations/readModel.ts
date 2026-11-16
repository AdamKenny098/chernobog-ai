import type {
  UnifiedAttentionItem,
  UnifiedAttentionLane,
  UnifiedAttentionPriority,
  UnifiedAttentionQueue,
} from "../unifiedAttentionQueue/readModel";
import type { PersonalAttentionState } from "../types";
import type { PersonalAssistanceInterruptionPreference } from "../profileTypes";

/**
 * OH-6K2 is a pure, on-demand projection of the existing OH-6F queue.
 * It does not re-score, schedule, persist, notify, or infer missing shifts.
 */
export type RecommendationEvidenceConfidence = "recorded" | "qualified";
export type RecommendationCategory =
  | "user-decision"
  | "responsibility-review"
  | "waiting-on-other"
  | "roster-health"
  | "calendar-health";

export type AdaptiveRecommendation = {
  id: string;
  sourceItemId: string;
  source: UnifiedAttentionItem["origin"];
  rank: number;
  lane: UnifiedAttentionLane;
  priority: UnifiedAttentionPriority;
  category: RecommendationCategory;
  title: string;
  suggestedAction: string;
  dueAt: string | null;
  requiresUser: boolean;
  responsibilityId: string | null;
  reasonCodes: string[];
  evidence: {
    scope: UnifiedAttentionQueue["context"]["evidenceScope"];
    confidence: RecommendationEvidenceConfidence;
    explanation: string;
    caveat: string | null;
  };
};

export type AdaptiveRecommendationPolicy = {
  attentionState: PersonalAttentionState;
  proactiveAssistanceEnabled: boolean;
  interruptionPreference: PersonalAssistanceInterruptionPreference;
  deliveryMode: "on-demand-only";
  pushEnabled: false;
  notificationAttempts: 0;
  reasons: string[];
};

export type AdaptiveRecommendationSnapshot = {
  asOf: string;
  totalMatching: number;
  returned: number;
  source: {
    kind: "unified-attention-queue";
    totalMatching: number;
    returned: number;
    completeCoverage: boolean;
    rosterReadiness: string;
    calendarReadiness: string;
    remoteCalendarVerified: false;
    inferredShiftAvailability: false;
  };
  policy: AdaptiveRecommendationPolicy;
  items: AdaptiveRecommendation[];
  boundaries: {
    readOnly: true;
    onDemandOnly: true;
    writesPreferences: false;
    writesResponsibilities: false;
    writesReminders: false;
    writesCalendar: false;
    sendsMessages: false;
    contactsGoogle: false;
    schedulesWork: false;
    overridesDoNotDisturb: false;
    executesTools: false;
    exposesRawNotificationEvidence: false;
  };
};

export type AdaptiveRecommendationContext = {
  attentionState: PersonalAttentionState;
  proactiveAssistanceEnabled: boolean;
  interruptionPreference: PersonalAssistanceInterruptionPreference;
};

function explain(item: UnifiedAttentionItem, queue: UnifiedAttentionQueue): {
  category: RecommendationCategory;
  confidence: RecommendationEvidenceConfidence;
  explanation: string;
  caveat: string | null;
  action: string;
} {
  const codes = new Set(item.reasonCodes);
  if (item.origin === "schedule-calendar-health") {
    if (codes.has("roster-stale")) {
      return {
        category: "roster-health",
        confidence: "qualified",
        explanation: "The local PA-4 work-roster snapshot is marked stale.",
        caveat: "A stale roster cannot establish current shifts or free time.",
        action: "Refresh the authoritative Alkimii roster before relying on shift-based advice.",
      };
    }
    if (codes.has("calendar-recorded-conflicts")) {
      return {
        category: "calendar-health",
        confidence: "qualified",
        explanation: "PA-5 recorded calendar conflicts during its previous synchronization.",
        caveat: "These are historical records, not verified current Google Calendar conflicts.",
        action: "Review the previously recorded conflicts in Google Calendar manually.",
      };
    }
    if (codes.has("roster-missing") || codes.has("roster-empty")) {
      return {
        category: "roster-health",
        confidence: "qualified",
        explanation: "Local roster diagnostics indicate incomplete schedule evidence.",
        caveat: "Missing or empty roster data does not establish a day off.",
        action: item.actionHint,
      };
    }
    return {
      category: [...codes].some((code) => code.startsWith("roster-") || code.startsWith("profile-time-zone-"))
        ? "roster-health" : "calendar-health",
      confidence: "qualified",
      explanation: "The existing local schedule/calendar health check requires review.",
      caveat: "This is locally recorded health evidence; no live Google Calendar comparison was performed.",
      action: item.actionHint,
    };
  }

  if (item.lane === "waiting") {
    return {
      category: "waiting-on-other",
      confidence: codes.has("limited-confidence") ? "qualified" : "recorded",
      explanation: "The responsibility ledger classifies this item as waiting, not as permission to interrupt someone.",
      caveat: codes.has("limited-confidence") ? "The underlying responsibility assessment reports limited confidence." : null,
      action: "Monitor the existing responsibility; do not contact anyone automatically.",
    };
  }
  if (item.requiresUser || codes.has("user-decision-needed")) {
    return {
      category: "user-decision",
      confidence: codes.has("limited-confidence") ? "qualified" : "recorded",
      explanation: "The responsibility ledger indicates that an owner decision is required.",
      caveat: codes.has("limited-confidence") ? "The underlying responsibility assessment reports limited confidence." : null,
      action: item.actionHint,
    };
  }
  return {
    category: "responsibility-review",
    confidence: codes.has("limited-confidence") || queue.context.rosterReadiness === "stale"
      && codes.has("scheduled") ? "qualified" : "recorded",
    explanation: codes.has("due-passed")
      ? "The existing responsibility ledger marks this due date as passed."
      : "The existing responsibility ledger has queued this item for review.",
    caveat: codes.has("limited-confidence")
      ? "The underlying responsibility assessment reports limited confidence."
      : codes.has("scheduled") && queue.context.rosterReadiness === "stale"
        ? "The work roster is stale; do not infer shift availability."
        : null,
    action: item.actionHint,
  };
}

/**
 * The source queue already determines rank, priority and lane. Never promote a
 * health finding into a reminder or treat a recorded sync as real-time proof.
 */
export function buildAdaptiveRecommendations(
  queue: Readonly<UnifiedAttentionQueue>,
  context: Readonly<AdaptiveRecommendationContext>,
  limit = 25,
): AdaptiveRecommendationSnapshot {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("limit must be an integer between 1 and 100.");
  }
  if (!Number.isFinite(Date.parse(queue.asOf))) {
    throw new Error("Invalid source queue timestamp.");
  }
  if (!["available", "busy", "away", "do-not-disturb"].includes(context.attentionState)) {
    throw new Error("Unrecognized attention state.");
  }
  if (typeof context.proactiveAssistanceEnabled !== "boolean") {
    throw new Error("Proactive assistance preference must be Boolean.");
  }
  if (!["critical-only", "important", "normal", "all"].includes(context.interruptionPreference)) {
    throw new Error("Unrecognized interruption preference.");
  }

  const reasons = ["k2-read-only-on-demand-only"];
  if (!context.proactiveAssistanceEnabled) reasons.push("proactive-assistance-disabled");
  if (context.attentionState === "do-not-disturb") reasons.push("absolute-do-not-disturb");
  if (context.attentionState === "busy" || context.attentionState === "away") {
    reasons.push(`attention-${context.attentionState}`);
  }

  const items = queue.items.slice(0, limit).map((item, index): AdaptiveRecommendation => {
    const rationale = explain(item, queue);
    return {
      id: `recommendation:${item.id}`,
      sourceItemId: item.id,
      source: item.origin,
      rank: index + 1,
      lane: item.lane,
      priority: item.priority,
      category: rationale.category,
      title: item.title,
      suggestedAction: rationale.action,
      dueAt: item.dueAt,
      requiresUser: item.requiresUser,
      responsibilityId: item.responsibilityId,
      reasonCodes: [...item.reasonCodes],
      evidence: {
        scope: queue.context.evidenceScope,
        confidence: rationale.confidence,
        explanation: rationale.explanation,
        caveat: rationale.caveat,
      },
    };
  });

  return {
    asOf: queue.asOf,
    totalMatching: queue.totalMatching,
    returned: items.length,
    source: {
      kind: "unified-attention-queue",
      totalMatching: queue.totalMatching,
      returned: queue.returned,
      completeCoverage: queue.totalMatching <= queue.returned,
      rosterReadiness: queue.context.rosterReadiness,
      calendarReadiness: queue.context.calendarReadiness,
      remoteCalendarVerified: false,
      inferredShiftAvailability: false,
    },
    policy: {
      attentionState: context.attentionState,
      proactiveAssistanceEnabled: context.proactiveAssistanceEnabled,
      interruptionPreference: context.interruptionPreference,
      deliveryMode: "on-demand-only",
      pushEnabled: false,
      notificationAttempts: 0,
      reasons,
    },
    items,
    boundaries: {
      readOnly: true,
      onDemandOnly: true,
      writesPreferences: false,
      writesResponsibilities: false,
      writesReminders: false,
      writesCalendar: false,
      sendsMessages: false,
      contactsGoogle: false,
      schedulesWork: false,
      overridesDoNotDisturb: false,
      executesTools: false,
      exposesRawNotificationEvidence: false,
    },
  };
}
