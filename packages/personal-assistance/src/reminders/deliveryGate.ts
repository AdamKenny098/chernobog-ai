import type { PersonalAttentionSnapshot } from "../types";
import type { PersonalAssistanceProfile } from "../profileTypes";
import type { ReminderRecord, ReminderPriority } from "./foundation";

export type ReminderDeliveryPolicy = Pick<
  PersonalAssistanceProfile,
  "proactiveAssistanceEnabled" | "interruptionPreference"
>;
export type ReminderDeliveryAttention = Pick<PersonalAttentionSnapshot, "state">;
export type ReminderDeliveryGateDecision = "eligible" | "blocked" | "deferred" | "not-due";
export type ReminderDeliveryGate = {
  reminderId: string;
  decision: ReminderDeliveryGateDecision;
  reasonCodes: string[];
};

const RANK: Readonly<Record<ReminderPriority, number>> = {
  low: 0,
  normal: 1,
  important: 2,
  critical: 3,
};
const THRESHOLD: Readonly<Record<
  PersonalAssistanceProfile["interruptionPreference"], number
>> = {
  "critical-only": 3,
  important: 2,
  normal: 1,
  all: 0,
};

/**
 * OH-6G2 policy gate. This is not authorization to send a notification.
 * The eventual transport MUST re-check live attention and preferences
 * immediately before sending, including after a reservation is acquired.
 */
export function assessReminderDeliveryGate(
  reminder: Readonly<ReminderRecord>,
  attention: Readonly<ReminderDeliveryAttention>,
  preferences: Readonly<ReminderDeliveryPolicy>,
  now = new Date(),
): ReminderDeliveryGate {
  const nowMs = now.getTime();
  const dueMs = Date.parse(reminder.dueAt);
  if (!Number.isFinite(nowMs) || !Number.isFinite(dueMs)) {
    throw new Error("Reminder delivery gate requires valid timestamps.");
  }
  if (!Object.hasOwn(RANK, reminder.priority) ||
      !["scheduled", "cancelled"].includes(reminder.state) ||
      !Object.hasOwn(THRESHOLD, preferences.interruptionPreference) ||
      typeof preferences.proactiveAssistanceEnabled !== "boolean" ||
      !["available", "busy", "away", "do-not-disturb"].includes(attention.state)) {
    throw new Error("Reminder delivery gate received invalid authoritative state.");
  }
  const result = (
    decision: ReminderDeliveryGateDecision,
    reason: string,
  ): ReminderDeliveryGate => ({
    reminderId: reminder.id,
    decision,
    reasonCodes: [reason],
  });

  if (reminder.state === "cancelled") return result("blocked", "reminder-cancelled");
  if (dueMs > nowMs) return result("not-due", "not-yet-due");
  // Absolute DND applies to critical items too, regardless of other settings.
  if (attention.state === "do-not-disturb") {
    return result("deferred", "attention-do-not-disturb");
  }
  if (attention.state === "busy" || attention.state === "away") {
    return result("deferred", `attention-${attention.state}`);
  }
  if (!preferences.proactiveAssistanceEnabled) {
    return result("blocked", "proactive-assistance-disabled");
  }
  if (RANK[reminder.priority] < THRESHOLD[preferences.interruptionPreference]) {
    return result("blocked", "below-interruption-threshold");
  }
  return result("eligible", "eligible-for-reservation-only");
}
