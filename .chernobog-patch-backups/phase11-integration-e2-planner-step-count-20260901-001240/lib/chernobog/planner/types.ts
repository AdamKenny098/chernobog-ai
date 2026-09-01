export type PlanStepStatus = "pending" | "active" | "done" | "blocked";

export type PlanStep = {
  id: string;
  index: number;
  title: string;
  detail?: string;
  status: PlanStepStatus;
  createdAt: string;
  updatedAt: string;
};

export type ActivePlan = {
  id: string;
  title: string;
  goal: string;
  status: "active" | "completed" | "archived";
  steps: PlanStep[];
  createdAt: string;
  updatedAt: string;
};

export type PlannerCommandKind =
  | "none"
  | "create_plan"
  | "show_plan"
  | "continue_plan"
  | "revise_plan"
  | "complete_step"
  | "block_step"
  | "clear_plan"
  | "next_step";

export type ParsedPlannerCommand = {
  kind: PlannerCommandKind;
  goal?: string;
  stepIndex?: number;
  revision?: string;
};