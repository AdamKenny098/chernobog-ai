import type {
  CognitiveAttentionSignal,
} from "./types";
import type {
  GoalPrioritizedAttention,
} from "./goalTypes";

export interface CognitiveFocusPolicy {
  minimumFocusScore: number;
  switchMargin: number;
  maxCandidates: number;
}

export type CognitiveFocusReason =
  | "no-candidates"
  | "below-threshold"
  | "initial-focus"
  | "retained-focus"
  | "switched-focus";

export interface CognitiveFocusCandidate {
  rank: number;
  eligible: boolean;
  signal: CognitiveAttentionSignal;
  prioritized: GoalPrioritizedAttention;
}

export interface CognitiveFocusSelection {
  reason: CognitiveFocusReason;
  changed: boolean;
  previousKey?: string;
  selected?: CognitiveFocusCandidate;
  candidates: CognitiveFocusCandidate[];
}

export interface CognitiveControlSnapshot {
  cycle: number;
  generatedAt: string;
  reason: CognitiveFocusReason;
  changed: boolean;
  previousKey?: string;
  currentKey?: string;
  selected?: CognitiveFocusCandidate;
  candidates: CognitiveFocusCandidate[];
}
