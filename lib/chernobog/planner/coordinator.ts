import type { SessionContext } from "@/lib/chernobog/session/types";
import {
  appendPlanSteps,
  createPlan,
  formatPlan,
  getActiveStep,
  setStepStatus,
} from "./state";
import type { ParsedPlannerCommand } from "./types";

function splitGoalIntoStarterSteps(goal: string): string[] {
  const cleaned = goal.trim();

  if (!cleaned) {
    return [
      "Clarify the goal",
      "Break the work into concrete steps",
      "Start with the first small action",
    ];
  }

  return [
    `Clarify the outcome for: ${cleaned}`,
    "Identify the required resources or files",
    "Break the work into implementation steps",
    "Execute the first concrete task",
    "Review progress and adjust the plan",
  ];
}

function extractRevisionSteps(revision: string): string[] {
  const cleaned = revision.trim();

  if (!cleaned) {
    return [];
  }

  return [
    `Apply revision: ${cleaned}`,
    "Review whether the new direction changes the next action",
  ];
}

export function runPlannerCommand(
  command: ParsedPlannerCommand,
  session: SessionContext
): string | null {
  if (command.kind === "none") {
    return null;
  }

  if (command.kind === "create_plan") {
    const goal = command.goal?.trim() || "Untitled planning goal";
    const plan = createPlan(goal, splitGoalIntoStarterSteps(goal));

    session.activePlan = plan;

    return [
      "Created a persistent active plan.",
      "",
      formatPlan(plan),
    ].join("\n");
  }

  if (command.kind === "show_plan") {
    return session.activePlan
      ? formatPlan(session.activePlan)
      : "There is no active plan in the current session.";
  }

  if (command.kind === "clear_plan") {
    session.activePlan = null;
    return "Active plan cleared.";
  }

  if (command.kind === "next_step" || command.kind === "continue_plan") {
    if (!session.activePlan) {
      return "There is no active plan to continue.";
    }

    const activeStep = getActiveStep(session.activePlan);

    if (!activeStep) {
      return "The active plan has no remaining steps.";
    }

    return [
      "Next plan step:",
      `${activeStep.index}. ${activeStep.title}`,
      activeStep.detail ? `Detail: ${activeStep.detail}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (command.kind === "complete_step") {
    if (!session.activePlan) {
      return "There is no active plan to update.";
    }

    if (!command.stepIndex) {
      return "Tell me which step number to complete.";
    }

    session.activePlan = setStepStatus(
      session.activePlan,
      command.stepIndex,
      "done"
    );

    return [
      `Marked step ${command.stepIndex} as done.`,
      "",
      formatPlan(session.activePlan),
    ].join("\n");
  }

  if (command.kind === "block_step") {
    if (!session.activePlan) {
      return "There is no active plan to update.";
    }

    if (!command.stepIndex) {
      return "Tell me which step number is blocked.";
    }

    session.activePlan = setStepStatus(
      session.activePlan,
      command.stepIndex,
      "blocked"
    );

    return [
      `Marked step ${command.stepIndex} as blocked.`,
      "",
      formatPlan(session.activePlan),
    ].join("\n");
  }

  if (command.kind === "revise_plan") {
    if (!session.activePlan) {
      return "There is no active plan to revise.";
    }

    const revision = command.revision ?? "";
    const newSteps = extractRevisionSteps(revision);

    if (newSteps.length === 0) {
      return "Tell me how you want to revise the active plan.";
    }

    session.activePlan = appendPlanSteps(session.activePlan, newSteps);

    return [
      "Revised the active plan by appending new coordination steps.",
      "",
      formatPlan(session.activePlan),
    ].join("\n");
  }

  return null;
}