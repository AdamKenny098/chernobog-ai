import { getChernobogEventBus } from "./index";
import { getChernobogEventContext } from "./eventContext";
import {
  ChernobogEventInput,
  ChernobogEventPublishResult,
} from "./types";

export interface ChernobogEventPublisher {
  publish(
    input: ChernobogEventInput<unknown>
  ): Promise<ChernobogEventPublishResult>;
}

function mergeTags(
  inherited: string[] | undefined,
  direct: string[] | undefined
): string[] | undefined {
  const tags = [
    ...new Set([
      ...(inherited ?? []),
      ...(direct ?? []),
    ]),
  ];

  return tags.length > 0 ? tags : undefined;
}

export async function publishChernobogEventSafely<TPayload>(
  input: ChernobogEventInput<TPayload>,
  publisher?: ChernobogEventPublisher
): Promise<ChernobogEventPublishResult | null> {
  const context = getChernobogEventContext();

  const enrichedInput: ChernobogEventInput<unknown> = {
    ...input,

    subject:
      input.subject ??
      context?.subject,

    scope:
      input.scope ??
      context?.scope,

    correlationId:
      input.correlationId ??
      context?.correlationId,

    causationId:
      input.causationId ??
      context?.causationId,

    metadata: {
      ...input.metadata,

      tags: mergeTags(
        context?.tags,
        input.metadata?.tags
      ),
    },
  };

  try {
    return await (
      publisher ??
      getChernobogEventBus()
    ).publish(enrichedInput);
  } catch {
    /*
     * Telemetry is observational infrastructure.
     *
     * An event-store failure must never make the
     * operation being observed fail as well.
     */
    return null;
  }
}