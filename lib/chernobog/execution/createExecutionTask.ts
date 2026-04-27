import {
  CreateExecutionTaskInput,
  ExecutionRiskLevel,
  ExecutionTask,
} from "./types";

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getHighestRisk(risks: ExecutionRiskLevel[]): ExecutionRiskLevel {
  if (risks.includes("blocked")) return "blocked";
  if (risks.includes("approval_required")) return "approval_required";
  if (risks.includes("notice")) return "notice";
  return "safe";
}

export function createExecutionTask(input: CreateExecutionTaskInput): ExecutionTask {
  const now = new Date().toISOString();

  const steps = (input.steps ?? []).map((step) => ({
    ...step,
    id: createId("step"),
    status: "pending" as const,
  }));

  const risk = getHighestRisk(steps.map((step) => step.risk));

  return {
    id: createId("task"),
    category: input.category ?? "unknown",
    input: input.input,
    goal: input.goal ?? input.input,
    status: risk === "blocked" ? "failed" : "pending",
    risk,
    steps,
    currentStepId: steps[0]?.id,
    approval: {
      required: risk === "approval_required",
    },
    context: input.context ?? {},
    error: risk === "blocked" ? "Task contains a blocked action." : undefined,
    createdAt: now,
    updatedAt: now,
  };
}