import type {
  EventEnvelope,
  EventPublisher,
} from "@chernobog/contracts/events";

import {
  publishChernobogEventSafely as publishEventSpineEventSafely,
} from "@chernobog/events";

type PersonalAssistanceEventInput =
  Parameters<typeof publishEventSpineEventSafely>[0];

export const personalAssistanceEventPublisher:
  EventPublisher = {
    async publish<TPayload = unknown>(
      event: EventEnvelope<TPayload>,
    ): Promise<unknown> {
      return publishEventSpineEventSafely(
        event as unknown as PersonalAssistanceEventInput,
      );
    },
  };

/**
 * Compatibility helper retaining the accepted PA publishing call shape while
 * routing all PA publication through the public EventPublisher boundary.
 */
export async function publishChernobogEventSafely(
  event: PersonalAssistanceEventInput,
): Promise<unknown> {
  return personalAssistanceEventPublisher.publish(
    event as unknown as EventEnvelope,
  );
}
