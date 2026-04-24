import crypto from "node:crypto";
import type { ActivePlan, PlanStep, PlanStepStatus } from "./types";

function nowIso() {
  return new Date().toISOString();
}

export function createPlan(goal: string, stepTitles: string[]): ActivePlan {
  const createdAt = nowIso();

  const steps: PlanStep[] = stepTitles.map((title, index) => ({
    id: crypto.randomUUID(),
    index: index + 1,
    title: title.trim(),
    status: index === 0 ? "active" : "pending",
    createdAt,
    updatedAt: createdAt,
  }));

  return {
    id: crypto.randomUUID(),
    title: inferPlanTitle(goal),
    goal,
    status: "active",
    steps,
    createdAt,
    updatedAt: createdAt,
  };
}

export function inferPlanTitle(goal: string): string {
  const cleaned = goal
    .replace(/^(make|create|build|give me|write|plan)\s+/i, "")
    .trim();

  if (!cleaned) {
    return "Untitled Plan";
  }

  return cleaned.length > 60 ? `${cleaned.slice(0, 57)}...` : cleaned;
}

export function formatPlan(plan: ActivePlan): string {
  const lines = [
    `Active plan: ${plan.title}`,
    `Goal: ${plan.goal}`,
    "",
    "Steps:",
    ...plan.steps.map((step) => {
      const marker =
        step.status === "done"
          ? "[x]"
          : step.status === "active"
            ? "[>]"
            : step.status === "blocked"
              ? "[!]"
              : "[ ]";

      return `${marker} ${step.index}. ${step.title}`;
    }),
  ];

  return lines.join("\n");
}

export function getActiveStep(plan: ActivePlan): PlanStep | null {
  return (
    plan.steps.find((step) => step.status === "active") ??
    plan.steps.find((step) => step.status === "pending") ??
    null
  );
}

export function setStepStatus(
  plan: ActivePlan,
  stepIndex: number,
  status: PlanStepStatus
): ActivePlan {
  const updatedAt = nowIso();

  const nextSteps = plan.steps.map((step) =>
    step.index === stepIndex
      ? {
          ...step,
          status,
          updatedAt,
        }
      : step
  );

  const hasActive = nextSteps.some((step) => step.status === "active");

  const repairedSteps =
    hasActive || status !== "done"
      ? nextSteps
      : activateNextPendingStep(nextSteps, updatedAt);

  return {
    ...plan,
    steps: repairedSteps,
    status: repairedSteps.every((step) => step.status === "done")
      ? "completed"
      : plan.status,
    updatedAt,
  };
}

function activateNextPendingStep(
  steps: PlanStep[],
  updatedAt: string
): PlanStep[] {
  let activated = false;

  return steps.map((step) => {
    if (!activated && step.status === "pending") {
      activated = true;

      return {
        ...step,
        status: "active",
        updatedAt,
      };
    }

    return step;
  });
}

export function appendPlanSteps(
  plan: ActivePlan,
  stepTitles: string[]
): ActivePlan {
  const updatedAt = nowIso();
  const startIndex = plan.steps.length + 1;

  const newSteps: PlanStep[] = stepTitles.map((title, offset) => ({
    id: crypto.randomUUID(),
    index: startIndex + offset,
    title: title.trim(),
    status: "pending",
    createdAt: updatedAt,
    updatedAt,
  }));

  return {
    ...plan,
    steps: [...plan.steps, ...newSteps],
    status: "active",
    updatedAt,
  };
}