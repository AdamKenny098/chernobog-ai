import type { PersonalAttentionSnapshot } from "../types";
import type { PersonalAssistanceProfile } from "../profileTypes";
import type { UnifiedAttentionQueue } from "./readModel";

/**
 * OH-6F2: pure and advisory decision support for the future OH-6G
 * interruption dispatcher. "candidate" NEVER authorizes delivery.
 */
export type AttentionQueueDecision = "candidate" | "deferred" | "queue-only";

export type AttentionQueuePolicyItem = {
  itemId: string;
  decision: AttentionQueueDecision;
  reasonCodes: string[];
};

export type AttentionQueuePolicyResult = {
  asOf: string;
  evaluated: number;
  completeCoverage: boolean;
  counts: {
    candidate: number;
    deferred: number;
    queueOnly: number;
  };
  policy: {
    attentionState: PersonalAttentionSnapshot["state"];
    attentionExplicit: boolean;
    proactiveAssistanceEnabled: boolean;
    interruptionPreference: PersonalAssistanceProfile["interruptionPreference"];
  };
  items: AttentionQueuePolicyItem[];
  boundaries: {
    advisoryOnly: true;
    sendsMessages: false;
    schedulesInterruptions: false;
    overridesDoNotDisturb: false;
    changesUserPreferences: false;
    changesResponsibilities: false;
    contactsGoogle: false;
    createsCalendarEvents: false;
    executesTools: false;
    grantsPermissions: false;
  };
};

const MINIMUM_PRIORITY: Readonly<Record<
  PersonalAssistanceProfile["interruptionPreference"],
  number
>> = {
  "critical-only": 3,
  important: 2,
  normal: 1,
  all: 0,
};

const PRIORITY: Readonly<Record<
  UnifiedAttentionQueue["items"][number]["priority"],
  number
>> = {
  low: 0,
  normal: 1,
  important: 2,
  critical: 3,
};

/**
 * Pure policy assessment over items already selected by OH-6F1.
 * Waiting/review/upcoming and health cards can be viewed but cannot be
 * interpreted as permission to interrupt the owner. No persistence.
 */
export function assessUnifiedAttentionPolicy(
  queue: Readonly<UnifiedAttentionQueue>,
  attention: Readonly<PersonalAttentionSnapshot>,
  preferences: Pick<
    PersonalAssistanceProfile,
    "proactiveAssistanceEnabled" | "interruptionPreference"
  >,
): AttentionQueuePolicyResult {
  if (!Number.isFinite(Date.parse(queue.asOf))) {
    throw new Error("Attention queue asOf must be a valid date.");
  }
  if (!(preferences.interruptionPreference in MINIMUM_PRIORITY)) {
    throw new Error("Unknown interruption preference.");
  }
  if (typeof preferences.proactiveAssistanceEnabled !== "boolean") {
    throw new Error("proactiveAssistanceEnabled must be boolean.");
  }

  const items = queue.items.map((item): AttentionQueuePolicyItem => {
    const base = { itemId: item.id };
    // All schedule/calendar health findings require manual inspection.
    if (item.origin !== "responsibility-ledger") {
      return { ...base, decision: "queue-only", reasonCodes: ["health-advisory-only"] };
    }
    if (item.lane === "waiting") {
      return { ...base, decision: "queue-only", reasonCodes: ["waiting-on-external-or-delegate"] };
    }
    if (item.lane === "upcoming") {
      return { ...base, decision: "queue-only", reasonCodes: ["not-yet-actionable"] };
    }
    if (item.lane !== "now") {
      return { ...base, decision: "queue-only", reasonCodes: ["review-lane"] };
    }
    if (!item.requiresUser) {
      return { ...base, decision: "queue-only", reasonCodes: ["no-explicit-user-action"] };
    }
    if (!preferences.proactiveAssistanceEnabled) {
      return { ...base, decision: "queue-only", reasonCodes: ["proactive-assistance-disabled"] };
    }
    if (PRIORITY[item.priority] < MINIMUM_PRIORITY[preferences.interruptionPreference]) {
      return { ...base, decision: "queue-only", reasonCodes: ["below-preference-threshold"] };
    }
    if (attention.state === "do-not-disturb") {
      return { ...base, decision: "deferred", reasonCodes: ["explicit-attention-do-not-disturb"] };
    }
    if (attention.state === "busy" || attention.state === "away") {
      return { ...base, decision: "deferred", reasonCodes: [`attention-${attention.state}`] };
    }
    if (attention.state !== "available") {
      throw new Error("Unrecognized personal attention state.");
    }
    return { ...base, decision: "candidate", reasonCodes: ["eligible-for-future-policy-review"] };
  });

  return {
    asOf: queue.asOf,
    evaluated: items.length,
    completeCoverage: queue.returned === queue.totalMatching && queue.items.length === queue.returned,
    counts: {
      candidate: items.filter((item) => item.decision === "candidate").length,
      deferred: items.filter((item) => item.decision === "deferred").length,
      queueOnly: items.filter((item) => item.decision === "queue-only").length,
    },
    policy: {
      attentionState: attention.state,
      attentionExplicit: attention.explicit,
      proactiveAssistanceEnabled: preferences.proactiveAssistanceEnabled,
      interruptionPreference: preferences.interruptionPreference,
    },
    items,
    boundaries: {
      advisoryOnly: true,
      sendsMessages: false,
      schedulesInterruptions: false,
      overridesDoNotDisturb: false,
      changesUserPreferences: false,
      changesResponsibilities: false,
      contactsGoogle: false,
      createsCalendarEvents: false,
      executesTools: false,
      grantsPermissions: false,
    },
  };
}
