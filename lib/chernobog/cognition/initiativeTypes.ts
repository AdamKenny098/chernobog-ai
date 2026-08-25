import type {
  CognitiveActionDecision,
} from "./actionTypes";

export type CognitiveInitiativeDisposition =
  | "interrupt"
  | "surface"
  | "defer"
  | "suppress";

export type CognitiveUserAttentionState =
  | "available"
  | "busy"
  | "away"
  | "do-not-disturb";

export type CognitiveInitiativeReasonCode =
  | "no-focus"
  | "response-ignored"
  | "below-surface-threshold"
  | "critical-attention"
  | "high-attention"
  | "user-busy"
  | "user-away"
  | "do-not-disturb"
  | "cooldown-active"
  | "material-escalation"
  | "confirmation-needed"
  | "action-ready"
  | "advisory-result";

export interface CognitiveInitiativeReason {
  code: CognitiveInitiativeReasonCode;
  detail: string;
}

export interface CognitiveInitiativePolicy {
  surfaceThreshold: number;
  interruptThreshold: number;
  cooldownMs: number;
  escalationDelta: number;
  criticalMayInterruptBusy: boolean;
}

export interface CognitiveInitiativeHistoryEntry {
  key: string;
  surfacedAt: string;
  score: number;
  disposition: CognitiveInitiativeDisposition;
}

export interface CognitiveInitiativeInput {
  decision: CognitiveActionDecision;
  userAttention: CognitiveUserAttentionState;
}

export interface CognitiveInitiativeDecision {
  id: string;
  generatedAt: string;
  focusKey?: string;
  score: number;
  disposition: CognitiveInitiativeDisposition;
  reasons: CognitiveInitiativeReason[];
  decision: CognitiveActionDecision;
}
