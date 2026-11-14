import type { ReminderRecord } from "./foundation";
import type { ReminderDeliveryRow } from "./deliveryOutbox";
import type { ReminderDeliveryAttention, ReminderDeliveryPolicy } from "./deliveryGate";
import { assessReminderDeliveryHealth } from "./deliveryHealth";

export type ReminderIntegrationHealth = {
  asOf: string;
  status: "awaiting-android-transport";
  totalMatching: number;
  returned: number;
  completeCoverage: boolean;
  gateCounts: Record<"eligible" | "blocked" | "deferred" | "not-due", number>;
  outboxCounts: { reserved: number; delivered: number };
  unresolvedReservations: number;
  policy: {
    attentionState: ReminderDeliveryAttention["state"];
    proactiveAssistanceEnabled: boolean;
    interruptionPreference: ReminderDeliveryPolicy["interruptionPreference"];
  };
  transport: {
    androidReceiverInstalled: false;
    automaticDeliveryEnabled: false;
    remotelyDispatched: false;
  };
  boundaries: {
    readOnly: true;
    storesReceipts: false;
    sendsMessages: false;
    reservesDeliveries: false;
    overridesDoNotDisturb: false;
    changesUserPreferences: false;
    exposesReminderTitles: false;
    executesTools: false;
  };
};

/**
 * Inspect the integration boundary without granting it transport authority.
 * Counts include every active reminder even when the diagnostic page is short.
 */
export function assessReminderIntegrationHealth(
  reminders: ReadonlyArray<ReminderRecord>,
  outbox: ReadonlyArray<ReminderDeliveryRow>,
  attention: Readonly<ReminderDeliveryAttention>,
  preferences: Readonly<ReminderDeliveryPolicy>,
  now = new Date(),
  limit = 25,
): ReminderIntegrationHealth {
  const report = assessReminderDeliveryHealth(reminders, outbox, attention, preferences, now, limit);
  const activeIds = new Set(reminders.filter((item) => item.state === "scheduled")
    .map((item) => item.id));
  const unresolvedReservations = outbox.filter((item) =>
    item.state === "reserved" && activeIds.has(item.reminderId)).length;
  return {
    asOf: report.asOf,
    status: "awaiting-android-transport",
    totalMatching: report.totalMatching,
    returned: report.returned,
    completeCoverage: report.completeCoverage,
    gateCounts: report.gateCounts,
    outboxCounts: report.outboxCounts,
    unresolvedReservations,
    policy: report.policy,
    transport: {
      androidReceiverInstalled: false,
      automaticDeliveryEnabled: false,
      remotelyDispatched: false,
    },
    boundaries: {
      readOnly: true,
      storesReceipts: false,
      sendsMessages: false,
      reservesDeliveries: false,
      overridesDoNotDisturb: false,
      changesUserPreferences: false,
      exposesReminderTitles: false,
      executesTools: false,
    },
  };
}
