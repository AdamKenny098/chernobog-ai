export const COGNITIVE_CONTRACT_VERSION = "oh4a.v1" as const;

export type CognitiveContractVersion =
  typeof COGNITIVE_CONTRACT_VERSION;

export type JsonPrimitive =
  | string
  | number
  | boolean
  | null;

export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export type CognitiveTaskSource =
  | "user"
  | "voice"
  | "system"
  | "schedule"
  | "agent"
  | "tool"
  | "recovery";

export interface CognitiveIntent {
  kind: string;
  summary: string;
  domain?: string;
  confidence?: number;
}

export interface CognitiveContextReference {
  kind:
    | "memory"
    | "file"
    | "project"
    | "tool-state"
    | "policy"
    | "conversation"
    | "world-state"
    | "other";
  id: string;
  summary?: string;
  trust?: "authoritative" | "trusted" | "candidate" | "untrusted";
}

export interface CognitiveContext {
  references: CognitiveContextReference[];
  values?: Record<string, JsonValue>;
}

export interface CognitiveConstraint {
  kind:
    | "authority"
    | "safety"
    | "privacy"
    | "cost"
    | "latency"
    | "format"
    | "scope"
    | "user"
    | "other";
  description: string;
  hard: boolean;
}

export interface CognitiveOutcome {
  description: string;
  acceptanceCriteria?: string[];
}

export interface CognitiveAuthorityContext {
  principal?: string;
  responsibilityOwner?: string;
  permissionScope?: string[];
  requiresApproval?: boolean;
  approvalReason?: string;
  metadata?: Record<string, JsonValue>;
}

export interface CognitiveTask {
  contractVersion: CognitiveContractVersion;
  id: string;
  createdAt: string;
  source: CognitiveTaskSource;
  rawInput: string;
  interpretedIntent?: CognitiveIntent;
  context?: CognitiveContext;
  constraints: CognitiveConstraint[];
  requestedOutcome?: CognitiveOutcome;
  authorityContext?: CognitiveAuthorityContext;
}

export type CognitiveResultStatus =
  | "completed"
  | "needs_context"
  | "needs_clarification"
  | "needs_authorization"
  | "uncertain"
  | "failed";

export interface CognitiveConclusion {
  id: string;
  statement: string;
  evidenceIds: string[];
}

export interface CognitiveAssumption {
  id: string;
  statement: string;
  material: boolean;
}

export interface CognitiveUncertainty {
  id: string;
  statement: string;
  impact: "low" | "medium" | "high" | "critical";
}

export interface CognitiveEvidence {
  id: string;
  kind:
    | "context"
    | "tool"
    | "memory"
    | "validation"
    | "model"
    | "user"
    | "other";
  reference?: string;
  statement: string;
  strength?: number;
}

export interface ProposedCognitiveAction {
  id: string;
  actionType: string;
  parameters: Record<string, JsonValue>;
  reason: string;
  expectedOutcome: string;
  risk?: "low" | "medium" | "high" | "critical";
  authorityRequirement?: string;
  reversible?: boolean;

  /**
   * OH-4A invariant:
   * cognition proposes; governance/execution performs.
   */
  executable: false;
}

export interface CognitiveConfidence {
  modelReported?: number;
  systemEstimated?: number;
  validationStrength?: number;
  evidenceCoverage?: number;
  disagreement?: number;
  final?: number;
}

export interface CognitiveProvenance {
  taskId: string;
  generatedAt: string;
  modelRef?: string;
  providerRef?: string;
  strategyRef?: string;
  contextReferenceIds: string[];
  validationIds: string[];
}

export interface CognitiveResult {
  contractVersion: CognitiveContractVersion;
  taskId: string;
  status: CognitiveResultStatus;
  conclusions: CognitiveConclusion[];
  assumptions: CognitiveAssumption[];
  uncertainties: CognitiveUncertainty[];
  proposedActions: ProposedCognitiveAction[];
  evidence: CognitiveEvidence[];
  confidence: CognitiveConfidence;
  provenance: CognitiveProvenance;
  failure?: {
    code: string;
    message: string;
    retryable?: boolean;
  };
}