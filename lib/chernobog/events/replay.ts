import type {
    ChernobogEvent,
    ChernobogEventQuery,
  } from "./types";
  
  export interface ChernobogEventReplayContext {
    index: number;
  
    total: number;
  
    replayedAt: string;
  }
  
  export type ChernobogEventReplayHandler =
    (
      event: ChernobogEvent,
      context: ChernobogEventReplayContext
    ) =>
      | void
      | Promise<void>;
  
  export interface ChernobogEventReplayOptions {
    /*
     * Optional filtering of the retained
     * history before replay.
     *
     * Replay itself always runs in canonical
     * oldest → newest order.
     */
    query?: Omit<
      ChernobogEventQuery,
      "newestFirst" | "limit"
    >;
  
    /*
     * If false, replay stops immediately
     * when a consumer fails.
     *
     * If true, failures are recorded and
     * replay continues with later events.
     */
    continueOnError?: boolean;
  }
  
  export interface ChernobogEventReplayError {
    eventId: string;
  
    eventType: string;
  
    index: number;
  
    message: string;
  }
  
  export interface ChernobogEventReplayResult {
    totalEvents: number;
  
    replayedEvents: number;
  
    failedEvents: number;
  
    startedAt: string;
  
    completedAt: string;
  
    errors: ChernobogEventReplayError[];
  }
  
  export function describeReplayError(
    error: unknown
  ): string {
    return error instanceof Error
      ? error.message
      : String(error);
  }