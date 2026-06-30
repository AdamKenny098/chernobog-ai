import type { ChernobogIncDepartment, ChernobogWorkerRole } from "./chernobogMissionTypes";
import type { TrustActionType, TrustDecision } from "./trustActionTypes";

export const CONTROLLED_EXECUTION_PLAN_STATUSES = [
  "draft",
  "pending_approval",
  "approved",
  "dry_run_ready",
  "in_progress",
  "needs_review",
  "completed",
  "blocked",
  "rejected",
] as const;

export type ControlledExecutionPlanStatus =
  (typeof CONTROLLED_EXECUTION_PLAN_STATUSES)[number];

export const CONTROLLED_EXECUTION_STEP_STATUSES = [
  "planned",
  "ready_for_review",
  "approved",
  "rejected",
  "skipped",
  "completed",
  "blocked",
] as const;

export type ControlledExecutionStepStatus =
  (typeof CONTROLLED_EXECUTION_STEP_STATUSES)[number];

export const CONTROLLED_EXECUTION_CHECKPOINT_STATUSES = [
  "pending",
  "approved",
  "rejected",
] as const;

export type ControlledExecutionCheckpointStatus =
  (typeof CONTROLLED_EXECUTION_CHECKPOINT_STATUSES)[number];

export type ControlledExecutionMode = "dry-run" | "checkpointed";

export type ControlledExecutionStepDraft = {
  title: string;
  description: string;
  actionType: TrustActionType;
  department?: ChernobogIncDepartment;
  workerRole?: ChernobogWorkerRole;
  requestedTool?: string;
  target?: string;
  expectedChange?: string;
  rollbackNote?: string;
  securityReviewRequired?: boolean;
};

export type ControlledExecutionStep = ControlledExecutionStepDraft & {
  id: string;
  status: ControlledExecutionStepStatus;
  trustDecision: TrustDecision;
  checkpointRequired: boolean;
  checkpointId?: string;
  createdAt: string;
  updatedAt: string;
};

export type ControlledExecutionCheckpoint = {
  id: string;
  title: string;
  description: string;
  required: boolean;
  status: ControlledExecutionCheckpointStatus;
  stepId?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  notes?: string;
};

export type ControlledExecutionPlan = {
  id: string;
  missionId: string;
  title: string;
  objective: string;
  status: ControlledExecutionPlanStatus;
  mode: ControlledExecutionMode;
  projectId: string;
  version?: string;
  departments: ChernobogIncDepartment[];
  steps: ControlledExecutionStep[];
  checkpoints: ControlledExecutionCheckpoint[];
  executionAllowed: false;
  toolExecutionAllowed: false;
  autonomousExecutionAllowed: false;
  dryRunOnly: true;
  governanceEvaluated: boolean;
  securityReviewRequired: boolean;
  rollbackNotes: string[];
  createdBy: "ceo" | "executive-core" | "system";
  createdAt: string;
  updatedAt: string;
};

export type ControlledExecutionDryRunStep = {
  stepId: string;
  title: string;
  actionType: TrustActionType;
  requestedTool?: string;
  target?: string;
  wouldExecute: false;
  decisionStatus: TrustDecision["status"];
  risk: TrustDecision["risk"];
  reason: string;
};

export type ControlledExecutionDryRunRecord = {
  id: string;
  planId: string;
  missionId: string;
  createdAt: string;
  wouldExecute: false;
  steps: ControlledExecutionDryRunStep[];
  notes: string[];
};

export type ControlledExecutionAuditAction =
  | "plan-created"
  | "checkpoint-approved"
  | "checkpoint-rejected"
  | "plan-approved"
  | "dry-run-created"
  | "read"
  | "verification";

export type ControlledExecutionAuditEvent = {
  id: string;
  planId?: string;
  missionId?: string;
  action: ControlledExecutionAuditAction;
  summary: string;
  createdAt: string;
};

export type CreateControlledExecutionPlanInput = {
  missionId: string;
  title?: string;
  objective?: string;
  projectId?: string;
  version?: string;
  departments?: string[];
  steps?: ControlledExecutionStepDraft[];
  createdBy?: "ceo" | "executive-core" | "system";
};

export type ControlledExecutionStoreSnapshot = {
  plans: ControlledExecutionPlan[];
  dryRuns: ControlledExecutionDryRunRecord[];
  auditLog: ControlledExecutionAuditEvent[];
};

export function isControlledExecutionPlanStatus(
  value: string
): value is ControlledExecutionPlanStatus {
  return CONTROLLED_EXECUTION_PLAN_STATUSES.includes(
    value as ControlledExecutionPlanStatus
  );
}

export function isControlledExecutionStepStatus(
  value: string
): value is ControlledExecutionStepStatus {
  return CONTROLLED_EXECUTION_STEP_STATUSES.includes(
    value as ControlledExecutionStepStatus
  );
}

export function controlledExecutionBoundaryText(): string[] {
  return [
    "Controlled execution is planning and dry-run only in V5.9.5.",
    "This layer does not execute tools.",
    "Execution plans do not execute tools.",
    "Dry runs do not execute tools.",
    "Autonomous execution remains blocked.",
    "Governance decisions are recorded before later execution work is considered.",
  ];
}
