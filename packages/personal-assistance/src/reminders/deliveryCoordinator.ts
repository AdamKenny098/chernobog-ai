import type { ReminderRecord } from "./foundation";
import type {
  ReminderDeliveryAttention,
  ReminderDeliveryGate,
  ReminderDeliveryPolicy,
} from "./deliveryGate";
import { ReminderDeliveryOutbox } from "./deliveryOutbox";
import { ReminderStore } from "./store";

/**
 * OH-6G3A transport contract. The real Android channel is NOT installed here.
 * A transport must deduplicate by the reminder's STABLE id across expired
 * reservations, crashes and replays, and return a durable receipt ONLY after
 * the remote display layer has accepted the notification.
 */
export interface ReminderTransport {
  readonly idempotency: "stable-reminder-id";
  send(notification: Readonly<{
    idempotencyKey: string;
    reminderId: string;
    title: string;
    dueAt: string;
    priority: ReminderRecord["priority"];
  }>): Promise<{ receipt: string }>;
}

export type ReminderCoordinatorContext = {
  readAttention: () => ReminderDeliveryAttention;
  readPreferences: () => ReminderDeliveryPolicy;
  now?: () => Date;
};

export type ReminderDispatchResult = {
  reminderId: string;
  disposition:
    | "not-eligible"
    | "already-reserved"
    | "already-delivered"
    | "deferred-after-recheck"
    | "delivered"
    | "transport-failed";
  gate: ReminderDeliveryGate;
  attempts: number | null;
};

/**
 * Integrates G1 persistence and G2 reservation safety. No worker, automatic
 * polling or externally reachable write route is introduced by this module.
 * Explicitly supplied transports only; never creates a network client.
 */
export class ReminderDeliveryCoordinator {
  constructor(
    private readonly reminders: ReminderStore,
    private readonly outbox: ReminderDeliveryOutbox,
  ) {}

  async dispatchOne(
    reminderId: string,
    context: ReminderCoordinatorContext,
    transport: ReminderTransport,
  ): Promise<ReminderDispatchResult> {
    if (transport?.idempotency !== "stable-reminder-id" ||
        typeof transport.send !== "function") {
      throw new Error("A stable-idempotent reminder transport is required.");
    }
    if (typeof context?.readAttention !== "function" ||
        typeof context.readPreferences !== "function") {
      throw new Error("Fresh authority readers are required.");
    }
    const now = context.now ?? (() => new Date());
    const checkedAt = now();
    if (!(checkedAt instanceof Date) || !Number.isFinite(checkedAt.getTime())) {
      throw new Error("Invalid delivery coordinator time.");
    }

    // Read authority at reservation; G2 will block DND, disabled proactive,
    // not-due, cancelled, and below-threshold reminders.
    const reserved = this.outbox.reserve(
      reminderId,
      context.readAttention(),
      context.readPreferences(),
      checkedAt,
    );
    const attempts = reserved.reservation?.attempts ?? null;
    if (reserved.disposition !== "reserved") {
      return {
        reminderId,
        disposition: reserved.disposition,
        gate: reserved.gate,
        attempts,
      };
    }

    if (!reserved.reservation) {
      throw new Error("Reserved reminder missing durable claim.");
    }

    const freshAt = now();
    if (!(freshAt instanceof Date) || !Number.isFinite(freshAt.getTime())) {
      throw new Error("Invalid revalidation time.");
    }
    // Fresh reads are mandatory; neither a reservation nor the first policy
    // evaluation gives continuing permission to interrupt the owner.
    const freshAttention = context.readAttention();
    const freshPreferences = context.readPreferences();
    const gate = this.outbox.revalidate(
      reminderId,
      reserved.reservation.reservationId,
      freshAttention,
      freshPreferences,
      freshAt,
    );
    if (gate.decision !== "eligible") {
      return { reminderId, disposition: "deferred-after-recheck", gate, attempts };
    }

    const reminder = this.reminders.list().find((item) => item.id === reminderId);
    if (!reminder || reminder.state !== "scheduled") {
      return {
        reminderId, disposition: "deferred-after-recheck",
        gate: { reminderId, decision: "blocked", reasonCodes: ["reminder-no-longer-active"] },
        attempts,
      };
    }

    let receipt: string;
    try {
      const result = await transport.send({
        reminderId,
        idempotencyKey: reminderId, // NEVER reservationId: changes across retry.
        title: reminder.title,
        dueAt: reminder.dueAt,
        priority: reminder.priority,
      });
      receipt = result.receipt;
    } catch {
      // Keep the durable reservation for lease recovery. Never fabricate ACKs.
      return { reminderId, disposition: "transport-failed", gate, attempts };
    }

    // An invalid or conflicting receipt is an integrity failure. Do not mark
    // delivered or suppress safe replays. Transport MUST be idempotent.
    this.outbox.acknowledgeTransportSuccess(
      reminderId,
      reserved.reservation.reservationId,
      receipt,
      now(),
    );
    return { reminderId, disposition: "delivered", gate, attempts };
  }
}
