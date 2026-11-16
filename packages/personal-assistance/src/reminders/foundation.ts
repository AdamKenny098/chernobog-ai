import type { PersonalAttentionSnapshot } from "../types";
import type { PersonalAssistanceProfile } from "../profileTypes";

export type ReminderPriority = "low" | "normal" | "important" | "critical";
export type ReminderState = "scheduled" | "cancelled";
export type ReminderDecision = "candidate" | "deferred" | "queue-only";

export type ReminderRecord = {
  id: string;
  key: string;
  title: string;
  dueAt: string;
  priority: ReminderPriority;
  state: ReminderState;
  createdAt: string;
  cancelledAt: string | null;
};

export type ReminderCreateInput = {
  key: string;
  title: string;
  dueAt: string;
  priority?: ReminderPriority;
};

export type ReminderPreviewItem = {
  id: string;
  title: string;
  dueAt: string;
  priority: ReminderPriority;
  dueState: "due" | "overdue" | "upcoming";
  decision: ReminderDecision;
  reasonCodes: string[];
};

export type ReminderPreview = {
  asOf: string;
  totalMatching: number;
  returned: number;
  completeCoverage: boolean;
  counts: {
    due: number;
    overdue: number;
    upcoming: number;
    candidate: number;
    deferred: number;
    queueOnly: number;
  };
  policy: {
    attentionState: PersonalAttentionSnapshot["state"];
    proactiveAssistanceEnabled: boolean;
    interruptionPreference: PersonalAssistanceProfile["interruptionPreference"];
  };
  items: ReminderPreviewItem[];
  boundaries: {
    readOnly: true;
    sendsMessages: false;
    reservesDeliveries: false;
    marksDelivered: false;
    overridesDoNotDisturb: false;
    changesUserPreferences: false;
    modifiesResponsibilities: false;
    contactsGoogle: false;
    executesTools: false;
  };
};

const PRIORITIES: readonly ReminderPriority[] = ["low", "normal", "important", "critical"];
const RANK: Record<ReminderPriority, number> = {
  low: 0, normal: 1, important: 2, critical: 3,
};
const THRESHOLD: Record<PersonalAssistanceProfile["interruptionPreference"], number> = {
  "critical-only": 3, important: 2, normal: 1, all: 0,
};
const MINUTE_MS = 60_000;

/** Validate an explicit UTC / offset instant; reject ambiguous local clock times. */
export function normalizeReminderInput(input: ReminderCreateInput): Required<ReminderCreateInput> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error("Reminder input must be an object.");
  }
  const key = typeof input.key === "string" ? input.key.trim() : "";
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!/^[A-Za-z0-9][A-Za-z0-9:_./-]{0,119}$/u.test(key)) {
    throw new Error("Reminder key must be 1-120 safe characters; no spaces or secrets.");
  }
  if (title.length === 0 || title.length > 160 || /[\x00-\x1F\x7F]/u.test(title)) {
    throw new Error("Reminder title must be 1-160 printable characters.");
  }
  if (typeof input.dueAt !== "string" ||
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?(?:Z|[+-]\d\d:\d\d)$/u.test(input.dueAt)) {
    throw new Error("Reminder dueAt must be ISO-8601 with Z or a numeric offset.");
  }
  const epoch = Date.parse(input.dueAt);
  if (!Number.isFinite(epoch)) {
    throw new Error("Reminder dueAt is not a valid instant.");
  }
  const priority = input.priority ?? "normal";
  if (!PRIORITIES.includes(priority)) {
    throw new Error("Reminder priority is invalid.");
  }
  return { key, title, dueAt: new Date(epoch).toISOString(), priority };
}

function deriveDueState(dueMs: number, nowMs: number): ReminderPreviewItem["dueState"] {
  if (dueMs > nowMs) return "upcoming";
  return nowMs - dueMs >= MINUTE_MS ? "overdue" : "due";
}

/**
 * G1 only assesses *possible* future delivery. A candidate is NEVER permission
 * to dispatch, send, reserve, interrupt, or bypass a user-set attention mode.
 */
export function previewReminders(
  records: ReadonlyArray<ReminderRecord>,
  attention: Pick<PersonalAttentionSnapshot, "state">,
  preferences: Pick<PersonalAssistanceProfile, "proactiveAssistanceEnabled" | "interruptionPreference">,
  now = new Date(),
  limit = 100,
): ReminderPreview {
  if (!Number.isFinite(now.getTime())) throw new Error("Invalid preview time.");
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("limit must be 1-100.");
  if (typeof preferences.proactiveAssistanceEnabled !== "boolean" ||
      !(preferences.interruptionPreference in THRESHOLD)) {
    throw new Error("Invalid reminder preferences.");
  }
  if (!["available", "busy", "away", "do-not-disturb"].includes(attention.state)) {
    throw new Error("Invalid personal attention state.");
  }

  // Deterministic ordering; no writes, no delivery acknowledgements.
  const active = records.filter((record) => record.state === "scheduled").sort((a, b) =>
    a.dueAt.localeCompare(b.dueAt) || a.id.localeCompare(b.id));
  const all = active.map((record): ReminderPreviewItem => {
    const dueMs = Date.parse(record.dueAt);
    if (!Number.isFinite(dueMs) || !PRIORITIES.includes(record.priority)) {
      throw new Error("Corrupt persisted reminder record.");
    }
    const dueState = deriveDueState(dueMs, now.getTime());
    let decision: ReminderDecision = "queue-only";
    let reasonCodes: string[] = ["not-yet-due"];
    if (dueState !== "upcoming") {
      if (!preferences.proactiveAssistanceEnabled) {
        reasonCodes = ["proactive-assistance-disabled"];
      } else if (RANK[record.priority] < THRESHOLD[preferences.interruptionPreference]) {
        reasonCodes = ["below-interruption-threshold"];
      } else if (attention.state === "do-not-disturb" || attention.state === "busy" || attention.state === "away") {
        decision = "deferred";
        reasonCodes = [`attention-${attention.state}`];
      } else {
        decision = "candidate";
        reasonCodes = ["advisory-due-candidate-only"];
      }
    }
    return {
      id: record.id,
      title: record.title,
      dueAt: record.dueAt,
      priority: record.priority,
      dueState,
      decision,
      reasonCodes,
    };
  });
  const selected = all.slice(0, limit);
  return {
    asOf: now.toISOString(),
    totalMatching: all.length,
    returned: selected.length,
    completeCoverage: selected.length === all.length,
    counts: {
      due: all.filter((item) => item.dueState === "due").length,
      overdue: all.filter((item) => item.dueState === "overdue").length,
      upcoming: all.filter((item) => item.dueState === "upcoming").length,
      candidate: all.filter((item) => item.decision === "candidate").length,
      deferred: all.filter((item) => item.decision === "deferred").length,
      queueOnly: all.filter((item) => item.decision === "queue-only").length,
    },
    policy: {
      attentionState: attention.state,
      proactiveAssistanceEnabled: preferences.proactiveAssistanceEnabled,
      interruptionPreference: preferences.interruptionPreference,
    },
    items: selected,
    boundaries: {
      readOnly: true, sendsMessages: false, reservesDeliveries: false,
      marksDelivered: false, overridesDoNotDisturb: false,
      changesUserPreferences: false, modifiesResponsibilities: false,
      contactsGoogle: false, executesTools: false,
    },
  };
}
