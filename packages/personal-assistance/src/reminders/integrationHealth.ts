import type { ReminderRecord } from "./foundation";
import type { ReminderDeliveryRow } from "./deliveryOutbox";
import type { ReminderDeliveryAttention, ReminderDeliveryPolicy } from "./deliveryGate";
import { assessReminderDeliveryHealth } from "./deliveryHealth";

/** Server-observable evidence only; a paired device is not proof that an
 * Android notification receiver is installed, running, or currently online. */
export type ReminderAndroidTransportEvidence = {
  pairedAndroidDeviceCount: number;
  androidReminderRoutesAvailable: boolean;
};

export type ReminderIntegrationHealth = {
  asOf: string;
  status:
    | "awaiting-android-device"
    | "android-device-paired"
    | "android-delivery-observed"
    | "android-history-only";
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
    /** Null means unknown (not false): the server cannot inspect the phone OS. */
    androidReceiverInstalled: false | null;
    /** Best-effort delivery path eligible under the current server policy. */
    automaticDeliveryEnabled: boolean;
    /** Historical, verified Android-prefixed receipts, not a live connectivity test. */
    remotelyDispatched: boolean;
    androidReminderRoutesAvailable: boolean;
    pairedAndroidDeviceCount: number;
    acknowledgedAndroidDeliveries: number;
    deliveryPolicyPermitsAttempt: boolean;
    androidReceiverInstallationVerified: false;
    androidOnlineNowVerified: false;
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
 * OH-6J4: read-only diagnostic. Reuses authoritative G2 gate/outbox data and
 * G3B Android receipts; no delivery, enrollment, or permission mutation.
 * The optional last argument preserves older G3A verifier/caller compatibility.
 */
export function assessReminderIntegrationHealth(
  reminders: ReadonlyArray<ReminderRecord>,
  outbox: ReadonlyArray<ReminderDeliveryRow>,
  attention: Readonly<ReminderDeliveryAttention>,
  preferences: Readonly<ReminderDeliveryPolicy>,
  now = new Date(),
  limit = 25,
  evidence: Readonly<ReminderAndroidTransportEvidence> = {
    pairedAndroidDeviceCount: 0,
    androidReminderRoutesAvailable: true,
  },
): ReminderIntegrationHealth {
  const pairedAndroidDeviceCount = evidence.pairedAndroidDeviceCount;
  if (!Number.isSafeInteger(pairedAndroidDeviceCount) ||
      pairedAndroidDeviceCount < 0 ||
      typeof evidence.androidReminderRoutesAvailable !== "boolean") {
    throw new Error("Invalid Android transport evidence.");
  }
  const report = assessReminderDeliveryHealth(reminders, outbox, attention, preferences, now, limit);
  const activeIds = new Set(reminders.filter((item) => item.state === "scheduled")
    .map((item) => item.id));
  const unresolvedReservations = outbox.filter((item) =>
    item.state === "reserved" && activeIds.has(item.reminderId)).length;

  // The G3B Android client posts receipt `android:<reminder-id>` only after
  // Android NotificationManager.notify has returned, and ACK is persisted.
  // Require an exact match; arbitrary mock/other transport receipts do not count.
  const acknowledgedAndroidDeliveries = outbox.filter((item) =>
    item.state === "delivered" &&
    item.receipt === `android:${item.reminderId}`).length;
  const deliveryPolicyPermitsAttempt =
    attention.state === "available" && preferences.proactiveAssistanceEnabled;
  const automaticDeliveryEnabled = evidence.androidReminderRoutesAvailable &&
    pairedAndroidDeviceCount > 0 && deliveryPolicyPermitsAttempt;
  const status: ReminderIntegrationHealth["status"] =
    pairedAndroidDeviceCount === 0
      ? acknowledgedAndroidDeliveries > 0
        ? "android-history-only"
        : "awaiting-android-device"
      : acknowledgedAndroidDeliveries > 0
        ? "android-delivery-observed"
        : "android-device-paired";

  return {
    asOf: report.asOf,
    status,
    totalMatching: report.totalMatching,
    returned: report.returned,
    completeCoverage: report.completeCoverage,
    gateCounts: report.gateCounts,
    outboxCounts: report.outboxCounts,
    unresolvedReservations,
    policy: report.policy,
    transport: {
      androidReceiverInstalled: pairedAndroidDeviceCount === 0 ? false : null,
      automaticDeliveryEnabled,
      remotelyDispatched: acknowledgedAndroidDeliveries > 0,
      androidReminderRoutesAvailable: evidence.androidReminderRoutesAvailable,
      pairedAndroidDeviceCount,
      acknowledgedAndroidDeliveries,
      deliveryPolicyPermitsAttempt,
      androidReceiverInstallationVerified: false,
      androidOnlineNowVerified: false,
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
