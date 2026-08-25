import type {
  CognitiveAttentionSignal,
  CognitiveSalienceBand,
} from "./types";

export type CognitiveGoalStatus =
  | "active"
  | "paused"
  | "completed"
  | "cancelled";

export type CognitiveGoalPriority =
  | "low"
  | "normal"
  | "high"
  | "critical";

export interface CognitiveGoalScope {
  keys?: string[];
  keyPrefixes?: string[];
  namespaces?: string[];
}

export interface CognitiveGoal {
  id: string;
  title: string;
  status: CognitiveGoalStatus;
  priority: CognitiveGoalPriority;
  importance: number;
  urgency: number;
  createdAt: string;
  updatedAt: string;
  scope: CognitiveGoalScope;
  tags: string[];
}

export interface CognitiveGoalInput {
  id: string;
  title: string;
  status?: CognitiveGoalStatus;
  priority?: CognitiveGoalPriority;
  importance?: number;
  urgency?: number;
  createdAt?: string;
  updatedAt?: string;
  scope?: CognitiveGoalScope;
  tags?: string[];
}

export type GoalRelevanceReasonCode =
  | "exact-key"
  | "key-prefix"
  | "namespace";

export interface GoalRelevanceReason {
  code: GoalRelevanceReasonCode;
  weight: number;
  detail: string;
}

export interface GoalRelevanceAssessment {
  goalId: string;
  goalTitle: string;
  goalPriority: CognitiveGoalPriority;
  relevanceScore: number;
  priorityScore: number;
  reasons: GoalRelevanceReason[];
}

export interface GoalPrioritizedAttention {
  signal: CognitiveAttentionSignal;
  baseScore: number;
  goalBoost: number;
  score: number;
  band: CognitiveSalienceBand;
  matchedGoals: GoalRelevanceAssessment[];
}
