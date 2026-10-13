import { createChernobogEvent } from "./schema";
import { ChernobogEventStore } from "./store";
import {
  ChernobogEvent,
  ChernobogEventHandler,
  ChernobogEventInput,
  ChernobogEventPublishResult,
  ChernobogEventQuery,
  ChernobogEventSubscriptionFilter,
} from "./types";

import type {
  ChernobogEventRetentionPolicy,
  ChernobogEventRetentionResult,
} from "./retention";

import {
  describeReplayError,
  type ChernobogEventReplayHandler,
  type ChernobogEventReplayOptions,
  type ChernobogEventReplayResult,
} from "./replay";

import {
  buildChernobogEventDiagnostics,
  type ChernobogEventDiagnostics,
} from "./diagnostics";

import type {
  ChernobogEventCorruptionRecoveryResult,
} from "./store";

interface Subscription {
  id: number;
  filter: ChernobogEventSubscriptionFilter;
  handler: ChernobogEventHandler;
}

export interface ChernobogEventBusOptions {
  store: ChernobogEventStore;
  dedupeWindowMs?: number;
  clock?: () => Date;
}

function matchesSubscription(
  event: ChernobogEvent,
  filter: ChernobogEventSubscriptionFilter,
): boolean {
  if (filter.types?.length && !filter.types.includes(event.type)) {
    return false;
  }
  if (
    filter.typePrefixes?.length &&
    !filter.typePrefixes.some((prefix) => event.type.startsWith(prefix))
  ) {
    return false;
  }
  if (filter.sources?.length && !filter.sources.includes(event.source.subsystem)) {
    return false;
  }
  if (filter.severities?.length && !filter.severities.includes(event.severity)) {
    return false;
  }
  if (filter.correlationId && event.correlationId !== filter.correlationId) {
    return false;
  }
  return true;
}

function describeHandlerError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class ChernobogEventBus {
  private readonly store: ChernobogEventStore;
  private readonly dedupeWindowMs: number;
  private readonly clock: () => Date;
  private readonly subscriptions = new Map<number, Subscription>();
  private readonly recentDedupe = new Map<string, number>();
  private nextSubscriptionId = 1;

  constructor(options: ChernobogEventBusOptions) {
    this.store = options.store;
    this.dedupeWindowMs = Math.max(0, options.dedupeWindowMs ?? 30_000);
    this.clock = options.clock ?? (() => new Date());
  }

  subscribe(
    filter: ChernobogEventSubscriptionFilter,
    handler: ChernobogEventHandler,
  ): () => void {
    const id = this.nextSubscriptionId++;
    this.subscriptions.set(id, { id, filter, handler });
    return () => {
      this.subscriptions.delete(id);
    };
  }

  async publish<TPayload>(
    input: ChernobogEventInput<TPayload>,
  ): Promise<ChernobogEventPublishResult> {
    const now = this.clock();
    const nowMs = now.getTime();
    const event = createChernobogEvent(input, now);

    this.pruneDedupeCache(nowMs);

    if (event.dedupeKey) {
      const lastSeen = this.recentDedupe.get(event.dedupeKey);
      if (lastSeen !== undefined && nowMs - lastSeen <= this.dedupeWindowMs) {
        return {
          event,
          deduplicated: true,
          delivered: 0,
          handlerErrors: [],
        };
      }
      this.recentDedupe.set(event.dedupeKey, nowMs);
    }

    try {
      await this.store.append(event);
    } catch (error) {
      if (event.dedupeKey) {
        this.recentDedupe.delete(event.dedupeKey);
      }
      throw error;
    }

    let delivered = 0;
    const handlerErrors: string[] = [];

    for (const subscription of this.subscriptions.values()) {
      if (!matchesSubscription(event, subscription.filter)) {
        continue;
      }

      try {
        await subscription.handler(event);
        delivered += 1;
      } catch (error) {
        handlerErrors.push(describeHandlerError(error));
      }
    }

    return {
      event,
      deduplicated: false,
      delivered,
      handlerErrors,
    };
  }

  async getDiagnostics(
    now?: Date
  ): Promise<ChernobogEventDiagnostics> {
    const events =
      await this.store.readAll();
  
    return buildChernobogEventDiagnostics(
      events,
      now ?? this.clock()
    );
  }

  compactHistory(
    policy?: ChernobogEventRetentionPolicy,
    now?: Date
  ): Promise<ChernobogEventRetentionResult> {
    return this.store.compact(
      policy,
      now
    );
  }

  recoverHistoryCorruption():
  Promise<ChernobogEventCorruptionRecoveryResult> {
  return this.store
    .recoverCorruption();
}

  async replay(
    handler: ChernobogEventReplayHandler,
    options:
      ChernobogEventReplayOptions = {}
  ): Promise<ChernobogEventReplayResult> {
    const startedAt =
      this.clock();
  
    /*
     * readAll() deliberately returns the
     * complete matching retained history in
     * canonical oldest → newest order.
     *
     * Replay must never use normal query(),
     * because query() is intentionally capped.
     */
    const events =
      await this.store.readAll(
        options.query
      );
  
    const errors:
      ChernobogEventReplayResult["errors"] =
        [];
  
    let replayedEvents =
      0;
  
    for (
      let index = 0;
      index < events.length;
      index += 1
    ) {
      const event =
        events[index];
  
      try {
        await handler(
          event,
          {
            index,
  
            total:
              events.length,
  
            replayedAt:
              this.clock()
                .toISOString(),
          }
        );
  
        replayedEvents += 1;
      } catch (error) {
        errors.push({
          eventId:
            event.id,
  
          eventType:
            event.type,
  
          index,
  
          message:
            describeReplayError(
              error
            ),
        });
  
        /*
         * Strict replay is the default.
         *
         * Once reconstruction encounters a
         * failed reducer/consumer, later state
         * can no longer be assumed correct.
         */
        if (
          options.continueOnError !==
          true
        ) {
          break;
        }
      }
    }
  
    return {
      totalEvents:
        events.length,
  
      replayedEvents,
  
      failedEvents:
        errors.length,
  
      startedAt:
        startedAt.toISOString(),
  
      completedAt:
        this.clock()
          .toISOString(),
  
      errors,
    };
  }

  query(query?: ChernobogEventQuery): Promise<ChernobogEvent[]> {
    return this.store.query(query);
  }

  private pruneDedupeCache(nowMs: number): void {
    if (this.dedupeWindowMs === 0) {
      this.recentDedupe.clear();
      return;
    }

    for (const [key, seenAt] of this.recentDedupe) {
      if (nowMs - seenAt > this.dedupeWindowMs) {
        this.recentDedupe.delete(key);
      }
    }
  }
}
