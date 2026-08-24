import type {
    ChernobogEvent,
  } from "./types";
  
  export interface ChernobogEventThroughput {
    lastMinute: number;
  
    lastFiveMinutes: number;
  
    lastFifteenMinutes: number;
  
    lastHour: number;
  }
  
  export interface ChernobogEventDiagnostics {
    totalEvents: number;
  
    uniqueEventTypes: number;
  
    uniqueSources: number;
  
    uniqueCorrelations: number;
  
    correlatedEvents: number;
  
    uncorrelatedEvents: number;
  
    oldestReceivedAt?: string;
  
    newestReceivedAt?: string;
  
    eventsByType:
      Record<string, number>;
  
    eventsByDomain:
      Record<string, number>;
  
    eventsBySource:
      Record<string, number>;
  
    eventsBySeverity:
      Record<string, number>;
  
    throughput:
      ChernobogEventThroughput;
  }
  
  function increment(
    target:
      Record<string, number>,
    key: string
  ): void {
    target[key] =
      (target[key] ?? 0) + 1;
  }
  
  function getEventDomain(
    type: string
  ): string {
    const separator =
      type.indexOf(".");
  
    if (
      separator <= 0
    ) {
      return type;
    }
  
    return type.slice(
      0,
      separator
    );
  }
  
  function parseReceivedAt(
    event: ChernobogEvent
  ): number {
    const parsed =
      new Date(
        event.receivedAt
      ).getTime();
  
    if (
      Number.isNaN(parsed)
    ) {
      throw new Error(
        `Event ${event.id} has an invalid receivedAt timestamp.`
      );
    }
  
    return parsed;
  }
  
  function countSince(
    receivedTimes:
      number[],
    cutoff:
      number
  ): number {
    let count =
      0;
  
    for (
      const receivedAt of
      receivedTimes
    ) {
      if (
        receivedAt >= cutoff
      ) {
        count += 1;
      }
    }
  
    return count;
  }
  
  export function buildChernobogEventDiagnostics(
    events: ChernobogEvent[],
    now:
      Date = new Date()
  ): ChernobogEventDiagnostics {
    const nowMs =
      now.getTime();
  
    if (
      Number.isNaN(
        nowMs
      )
    ) {
      throw new Error(
        "Event diagnostics received an invalid current time."
      );
    }
  
    const eventsByType:
      Record<string, number> = {};
  
    const eventsByDomain:
      Record<string, number> = {};
  
    const eventsBySource:
      Record<string, number> = {};
  
    const eventsBySeverity:
      Record<string, number> = {};
  
    const correlationIds =
      new Set<string>();
  
    const receivedTimes:
      number[] = [];
  
    let correlatedEvents =
      0;
  
    let uncorrelatedEvents =
      0;
  
    let oldestReceivedAtMs:
      number | undefined;
  
    let newestReceivedAtMs:
      number | undefined;
  
    for (
      const event of events
    ) {
      increment(
        eventsByType,
        event.type
      );
  
      increment(
        eventsByDomain,
        getEventDomain(
          event.type
        )
      );
  
      increment(
        eventsBySource,
        event.source.subsystem
      );
  
      increment(
        eventsBySeverity,
        event.severity
      );
  
      if (
        event.correlationId
      ) {
        correlatedEvents +=
          1;
  
        correlationIds.add(
          event.correlationId
        );
      } else {
        uncorrelatedEvents +=
          1;
      }
  
      const receivedAtMs =
        parseReceivedAt(
          event
        );
  
      receivedTimes.push(
        receivedAtMs
      );
  
      if (
        oldestReceivedAtMs ===
          undefined ||
        receivedAtMs <
          oldestReceivedAtMs
      ) {
        oldestReceivedAtMs =
          receivedAtMs;
      }
  
      if (
        newestReceivedAtMs ===
          undefined ||
        receivedAtMs >
          newestReceivedAtMs
      ) {
        newestReceivedAtMs =
          receivedAtMs;
      }
    }
  
    const uniqueSources =
      Object.keys(
        eventsBySource
      ).length;
  
    const uniqueEventTypes =
      Object.keys(
        eventsByType
      ).length;
  
    return {
      totalEvents:
        events.length,
  
      uniqueEventTypes,
  
      uniqueSources,
  
      uniqueCorrelations:
        correlationIds.size,
  
      correlatedEvents,
  
      uncorrelatedEvents,
  
      oldestReceivedAt:
        oldestReceivedAtMs !==
        undefined
          ? new Date(
              oldestReceivedAtMs
            ).toISOString()
          : undefined,
  
      newestReceivedAt:
        newestReceivedAtMs !==
        undefined
          ? new Date(
              newestReceivedAtMs
            ).toISOString()
          : undefined,
  
      eventsByType,
  
      eventsByDomain,
  
      eventsBySource,
  
      eventsBySeverity,
  
      throughput: {
        lastMinute:
          countSince(
            receivedTimes,
            nowMs -
              60 * 1000
          ),
  
        lastFiveMinutes:
          countSince(
            receivedTimes,
            nowMs -
              5 *
                60 *
                1000
          ),
  
        lastFifteenMinutes:
          countSince(
            receivedTimes,
            nowMs -
              15 *
                60 *
                1000
          ),
  
        lastHour:
          countSince(
            receivedTimes,
            nowMs -
              60 *
                60 *
                1000
          ),
      },
    };
  }