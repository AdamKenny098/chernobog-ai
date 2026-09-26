import type {
    ChernobogEvent,
  } from "./types";
  
  const DEFAULT_RETENTION_DAYS =
    30;
  
  const DEFAULT_MAX_EVENTS =
    100_000;
  
  const DAY_MS =
    24 * 60 * 60 * 1000;
  
  export interface ChernobogEventRetentionPolicy {
    maxAgeMs: number;
  
    maxEvents: number;
  }
  
  export interface ChernobogEventRetentionResult {
    retained:
      ChernobogEvent[];
  
    removed:
      ChernobogEvent[];
  
    removedByAge:
      number;
  
    removedByCount:
      number;
  
    originalCount:
      number;
  
    retainedCount:
      number;
  
    removedCount:
      number;
  
    cutoffTime:
      string;
  }
  
  function readPositiveInteger(
    name: string,
    fallback: number
  ): number {
    const raw =
      process.env[name]?.trim();
  
    if (!raw) {
      return fallback;
    }
  
    const parsed =
      Number(raw);
  
    if (
      !Number.isInteger(parsed) ||
      parsed <= 0
    ) {
      throw new Error(
        `${name} must be a positive integer.`
      );
    }
  
    return parsed;
  }
  
  export function resolveChernobogEventRetentionPolicy():
    ChernobogEventRetentionPolicy {
    const retentionDays =
      readPositiveInteger(
        "CHERNOBOG_EVENT_RETENTION_DAYS",
        DEFAULT_RETENTION_DAYS
      );
  
    const maxEvents =
      readPositiveInteger(
        "CHERNOBOG_EVENT_RETENTION_MAX_EVENTS",
        DEFAULT_MAX_EVENTS
      );
  
    return {
      maxAgeMs:
        retentionDays *
        DAY_MS,
  
      maxEvents,
    };
  }
  
  function getReceivedAtMs(
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
  
  export function applyChernobogEventRetention(
    events: ChernobogEvent[],
    policy:
      ChernobogEventRetentionPolicy =
        resolveChernobogEventRetentionPolicy(),
    now:
      Date = new Date()
  ): ChernobogEventRetentionResult {
    if (
      !Number.isFinite(
        policy.maxAgeMs
      ) ||
      policy.maxAgeMs <= 0
    ) {
      throw new Error(
        "Event retention maxAgeMs must be greater than zero."
      );
    }
  
    if (
      !Number.isInteger(
        policy.maxEvents
      ) ||
      policy.maxEvents <= 0
    ) {
      throw new Error(
        "Event retention maxEvents must be a positive integer."
      );
    }
  
    const nowMs =
      now.getTime();
  
    if (
      Number.isNaN(nowMs)
    ) {
      throw new Error(
        "Event retention received an invalid current time."
      );
    }
  
    const cutoffMs =
      nowMs -
      policy.maxAgeMs;
  
    /*
     * First remove events that have aged
     * beyond the retention window.
     */
    const ageEligible:
      ChernobogEvent[] = [];
  
    const removedByAgeEvents:
      ChernobogEvent[] = [];
  
    for (
      const event of events
    ) {
      const receivedAtMs =
        getReceivedAtMs(
          event
        );
  
      if (
        receivedAtMs <
        cutoffMs
      ) {
        removedByAgeEvents.push(
          event
        );
  
        continue;
      }
  
      ageEligible.push(
        event
      );
    }
  
    /*
     * Then enforce the hard event-count
     * ceiling.
     *
     * Event logs are written oldest → newest,
     * so if the remaining history is still too
     * large we keep the newest maxEvents.
     */
    const overflow =
      Math.max(
        0,
        ageEligible.length -
          policy.maxEvents
      );
  
    const removedByCountEvents =
      overflow > 0
        ? ageEligible.slice(
            0,
            overflow
          )
        : [];
  
    const retained =
      overflow > 0
        ? ageEligible.slice(
            overflow
          )
        : ageEligible;
  
    const removed = [
      ...removedByAgeEvents,
      ...removedByCountEvents,
    ];
  
    return {
      retained,
      removed,
  
      removedByAge:
        removedByAgeEvents.length,
  
      removedByCount:
        removedByCountEvents.length,
  
      originalCount:
        events.length,
  
      retainedCount:
        retained.length,
  
      removedCount:
        removed.length,
  
      cutoffTime:
        new Date(
          cutoffMs
        ).toISOString(),
    };
  }