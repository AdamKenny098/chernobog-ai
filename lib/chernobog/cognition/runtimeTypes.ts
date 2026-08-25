import type {
  WorldStateRecord,
} from "../worldState";
import type {
  CognitiveActionDecision,
  CognitiveActionOpportunity,
  CognitiveGovernanceSnapshot,
} from "./actionTypes";
import type {
  CognitiveControlSnapshot,
} from "./focusTypes";
import type {
  CognitiveGoalInput,
} from "./goalTypes";
import type {
  CognitiveInitiativeDecision,
  CognitiveUserAttentionState,
} from "./initiativeTypes";

export type CognitiveActionOpportunityResolver =
  (
    focus: CognitiveControlSnapshot,
  ) =>
    | CognitiveActionOpportunity
    | undefined
    | Promise<
        CognitiveActionOpportunity
        | undefined
      >;

export type CognitiveGovernanceResolver =
  (
    focus: CognitiveControlSnapshot,
    opportunity:
      | CognitiveActionOpportunity
      | undefined,
  ) =>
    | CognitiveGovernanceSnapshot
    | Promise<CognitiveGovernanceSnapshot>;

export type CognitiveUserAttentionResolver =
  () =>
    | CognitiveUserAttentionState
    | Promise<CognitiveUserAttentionState>;

export interface ChernobogCognitiveRuntimeOptions {
  readWorldState:
    () =>
      | WorldStateRecord[]
      | Promise<WorldStateRecord[]>;
  resolveOpportunity?:
    CognitiveActionOpportunityResolver;
  resolveGovernance?:
    CognitiveGovernanceResolver;
  resolveUserAttention?:
    CognitiveUserAttentionResolver;
  clock?: () => Date;
}

export interface CognitiveRuntimeCycle {
  cycle: number;
  generatedAt: string;
  observedRecords: number;
  focus: CognitiveControlSnapshot;
  action: CognitiveActionDecision;
  initiative: CognitiveInitiativeDecision;
}

export interface CognitiveRuntimeSnapshot {
  generatedAt: string;
  cycle: number;
  activeGoals:
    ReturnType<
      import("./goalRegistry")
        .ChernobogGoalRegistry["list"]
    >;
  attention:
    ReturnType<
      import("./attentionQueue")
        .ChernobogAttentionQueue["list"]
    >;
  deferredInitiative:
    ReturnType<
      import("./initiativeQueue")
        .ChernobogInitiativeQueue["list"]
    >;
  lastCycle?:
    CognitiveRuntimeCycle;
}

export interface CognitiveGoalMutation {
  goal: CognitiveGoalInput;
}
