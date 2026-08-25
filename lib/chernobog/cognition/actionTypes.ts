import type {
  CognitiveControlSnapshot,
} from "./focusTypes";

export type CognitiveResponseMode =
  | "act"
  | "ask"
  | "suggest"
  | "wait"
  | "ignore";

export type CognitiveActionRisk =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type CognitiveActionEffect =
  | "observe"
  | "read"
  | "write"
  | "external";

export type CognitivePermissionState =
  | "allow"
  | "confirm"
  | "deny";

export type CognitiveAutonomyMode =
  | "disabled"
  | "advisory"
  | "bounded";

export interface CognitiveActionOpportunity {
  id: string;
  description: string;
  capability?: string;
  effect: CognitiveActionEffect;
  risk: CognitiveActionRisk;
  reversible: boolean;
  requiresUserInput?: boolean;
}

export interface CognitiveGovernanceSnapshot {
  permission: CognitivePermissionState;
  autonomy: CognitiveAutonomyMode;
  userInteractionAvailable: boolean;
}

export type CognitiveDecisionReasonCode =
  | "no-focus"
  | "low-attention"
  | "insufficient-evidence"
  | "stale-evidence"
  | "no-action-opportunity"
  | "requires-user-input"
  | "permission-denied"
  | "confirmation-required"
  | "autonomy-disabled"
  | "advisory-only"
  | "risk-too-high"
  | "irreversible-change"
  | "bounded-action-allowed";

export interface CognitiveDecisionReason {
  code: CognitiveDecisionReasonCode;
  detail: string;
}

export interface CognitiveActionDecision {
  id: string;
  generatedAt: string;
  focusKey?: string;
  requestedMode: CognitiveResponseMode;
  mode: CognitiveResponseMode;
  permittedToExecute: boolean;
  opportunity?: CognitiveActionOpportunity;
  governance: CognitiveGovernanceSnapshot;
  reasons: CognitiveDecisionReason[];
  focus: CognitiveControlSnapshot;
}

export interface CognitiveActionDecisionInput {
  focus: CognitiveControlSnapshot;
  opportunity?: CognitiveActionOpportunity;
  governance: CognitiveGovernanceSnapshot;
}
