import type { ChernobogEvent } from "../events/types";
import type {
  WorldStateJsonValue,
  WorldStateRecordInput,
} from "./types";

export interface WorldStateProjection<
  TValue extends WorldStateJsonValue = WorldStateJsonValue,
> extends Omit<
    WorldStateRecordInput<TValue>,
    | "observedAt"
    | "confidence"
    | "confidenceBasis"
    | "expiresAt"
    | "freshnessBasis"
    | "freshnessTtlMs"
    | "provenance"
  > {
  observedAt?: string;
  confidence?: number;
  expiresAt?: string;
  ttlMs?: number;
}

export interface WorldStateProjector {
  id: string;
  eventTypes?: readonly string[];
  eventTypePrefixes?: readonly string[];
  project(
    event: ChernobogEvent,
  ):
    | WorldStateProjection
    | readonly WorldStateProjection[]
    | undefined;
}

export interface WorldStateProjectionResult {
  eventId: string;
  eventType: string;
  matchedProjectors: number;
  emittedProjections: number;
  appliedProjections: number;
  ignoredProjections: number;
  projectorIds: string[];
}
