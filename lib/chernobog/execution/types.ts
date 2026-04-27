// lib/chernobog/execution/types.ts

export type ExecutionTaskStatus =
  | "pending"
  | "planning"
  | "running"
  | "waiting_for_approval"
  | "completed"
  | "failed"
  | "cancelled";

export type ExecutionStepStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "blocked";

export type ExecutionRiskLevel =
  | "safe"
  | "notice"
  | "approval_required"
  | "blocked";

export type ExecutionStepKind =
  | "memory"
  | "planner"
  | "tool"
  | "file"
  | "app"
  | "workflow"
  | "model"
  | "system";

  export type ExecutionTaskCategory =
  | "file_workflow"
  | "follow_up"
  | "approval_flow"
  | "execution_summary"
  | "summarization"
  | "system_operation"
  | "unknown";

export interface ExecutionStep {
  id: string;
  kind: ExecutionStepKind;
  label: string;
  status: ExecutionStepStatus;

  /**
   * Optional internal action name.
   * Examples:
   * - find_files
   * - read_text_file
   * - open_folder
   * - planner.create
   * - memory.remember
   */
  action?: string;

  input?: unknown;
  output?: unknown;

  risk: ExecutionRiskLevel;

  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface ExecutionApproval {
  required: boolean;
  reason?: string;
  approved?: boolean;
  approvedAt?: string;
  deniedAt?: string;
}

export interface ExecutionTask {
    id: string;
  
    category: ExecutionTaskCategory;
  
    /**
     * Original user command.
     */
    input: string;
  
    /**
     * Cleaned up goal Chernobog believes it is trying to complete.
     */
    goal: string;

  status: ExecutionTaskStatus;
  risk: ExecutionRiskLevel;

  steps: ExecutionStep[];
  currentStepId?: string;

  approval: ExecutionApproval;

  /**
   * Useful state carried between steps.
   * Example:
   * - selected file path
   * - search results
   * - last tool result
   * - active plan id
   */
  context: Record<string, unknown>;

  result?: string;
  error?: string;

  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface CreateExecutionTaskInput {
    input: string;
    goal?: string;
    category?: ExecutionTaskCategory;
    steps?: Omit<ExecutionStep, "id" | "status" | "startedAt" | "completedAt">[];
    context?: Record<string, unknown>;
  }

export interface ExecutionTaskUpdate {
  status?: ExecutionTaskStatus;
  risk?: ExecutionRiskLevel;
  currentStepId?: string;
  context?: Record<string, unknown>;
  result?: string;
  error?: string;
}