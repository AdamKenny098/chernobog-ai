import type { ReminderRecord } from "./foundation";
import {
  assessReminderDeliveryGate,
  type ReminderDeliveryAttention,
  type ReminderDeliveryGateDecision,
  type ReminderDeliveryPolicy,
} from "./deliveryGate";
import type { ReminderDeliveryRow } from "./deliveryOutbox";

export type ReminderDeliveryHealth = {
  asOf: string;
  totalMatching: number;
  returned: number;
  completeCoverage: boolean;
  gateCounts: Record<ReminderDeliveryGateDecision, number>;
  outboxCounts: { reserved: number; delivered: number };
  policy: {
    attentionState: ReminderDeliveryAttention["state"];
    proactiveAssistanceEnabled: boolean;
    interruptionPreference: ReminderDeliveryPolicy["interruptionPreference"];
  };
  items: Array<{
    reminderId: string;
    dueAt: string;
    priority: ReminderRecord["priority"];
    gate: ReminderDeliveryGateDecision;
    reasonCodes: string[];
    reservationState: ReminderDeliveryRow["state"] | null;
    eligibleToReserve: boolean;
  }>;
  boundaries: {
    readOnly: true;
    sendsMessages: false;
    reservesDeliveries: false;
    recordsTransportReceipts: false;
    overridesDoNotDisturb: false;
    changesUserPreferences: false;
    exposesReminderTitles: false;
    executesTools: false;
  };
};

/** Read-only reporting. Totals apply to ALL active reminders, not just the page. */
export function assessReminderDeliveryHealth(
  reminders: ReadonlyArray<ReminderRecord>,
  outbox: ReadonlyArray<ReminderDeliveryRow>,
  attention: Readonly<ReminderDeliveryAttention>,
  preferences: Readonly<ReminderDeliveryPolicy>,
  now = new Date(),
  limit = 25,
): ReminderDeliveryHealth {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("limit must be 1-100");
  }
  if (!Number.isFinite(now.getTime())) throw new Error("Invalid health timestamp.");
  const rows = new Map(outbox.map((row) => [row.reminderId, row]));
  if (rows.size !== outbox.length) throw new Error("Duplicate persisted delivery rows.");
  const all = reminders
    .filter((reminder) => reminder.state === "scheduled")
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt) || a.id.localeCompare(b.id))
    .map((reminder) => {
      const gate = assessReminderDeliveryGate(reminder, attention, preferences, now);
      const reservation = rows.get(reminder.id);
      const reservationState = reservation?.state ?? null;
      const activeLease = reservation?.state === "reserved" &&
        Date.parse(reservation.leaseExpiresAt) > now.getTime();
      const eligibleToReserve = gate.decision === "eligible" &&
        reservationState !== "delivered" && !activeLease;
      return {
        reminderId: reminder.id,
        dueAt: reminder.dueAt,
        priority: reminder.priority,
        gate: gate.decision,
        reasonCodes: gate.reasonCodes,
        reservationState,
        eligibleToReserve,
      };
    });
  const gateCounts: ReminderDeliveryHealth["gateCounts"] = {
    eligible: 0, blocked: 0, deferred: 0, "not-due": 0,
  };
  const outboxCounts = { reserved: 0, delivered: 0 };
  for (const row of all) {
    gateCounts[row.gate] += 1;
    if (row.reservationState === "reserved") outboxCounts.reserved += 1;
    if (row.reservationState === "delivered") outboxCounts.delivered += 1;
  }
  return {
    asOf: now.toISOString(),
    totalMatching: all.length,
    returned: Math.min(all.length, limit),
    completeCoverage: all.length <= limit,
    gateCounts,
    outboxCounts,
    policy: {
      attentionState: attention.state,
      proactiveAssistanceEnabled: preferences.proactiveAssistanceEnabled,
      interruptionPreference: preferences.interruptionPreference,
    },
    items: all.slice(0, limit),
    boundaries: {
      readOnly: true,
      sendsMessages: false,
      reservesDeliveries: false,
      recordsTransportReceipts: false,
      overridesDoNotDisturb: false,
      changesUserPreferences: false,
      exposesReminderTitles: false,
      executesTools: false,
    },
  };
}
