// lib/chernobog/execution/formatExecutionResponse.ts

import { ExecutionStep, ExecutionTask } from "./types";

function formatStepLine(step: ExecutionStep) {
  const statusLabel = step.status.replaceAll("_", " ");

  if (step.error) {
    return `- ${step.label}: ${statusLabel} — ${step.error}`;
  }

  return `- ${step.label}: ${statusLabel}`;
}

function getCompletedSteps(task: ExecutionTask) {
  return task.steps.filter((step) => step.status === "completed");
}

function getFailedStep(task: ExecutionTask) {
  return task.steps.find(
    (step) =>
      step.status === "failed" ||
      step.status === "blocked"
  );
}

function getReadableResult(task: ExecutionTask) {
  const summary = stringifyReadableValue(task.context.summary);

  if (summary) {
    return summary;
  }

  const lastReadText = stringifyReadableValue(task.context.lastReadText);

  if (lastReadText) {
    return lastReadText;
  }

  const lastOutput = stringifyReadableValue(task.context.lastOutput);

  if (lastOutput) {
    return lastOutput;
  }

  return null;
}

function stringifyReadableValue(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const possibleKeys = ["text", "content", "contents", "body", "data"];

  for (const key of possibleKeys) {
    if (
      key in value &&
      typeof value[key as keyof typeof value] === "string" &&
      (value[key as keyof typeof value] as string).trim().length > 0
    ) {
      return value[key as keyof typeof value] as string;
    }
  }

  return null;
}

export function formatExecutionResponse(task: ExecutionTask): string {
  if (task.status === "completed") {
    const readableResult = getReadableResult(task);

    if (readableResult) {
      return readableResult;
    }

    return `Completed: ${task.goal}`;
  }

  if (task.status === "waiting_for_approval") {
    const blockedStep =
      task.steps.find((step) => step.risk === "approval_required") ??
      task.steps.find((step) => step.status === "blocked");

    return [
      `Approval required: ${task.goal}`,
      blockedStep ? `Next action: ${blockedStep.label}` : null,
      task.error ? `Reason: ${task.error}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (task.status === "failed") {
    const failedStep = getFailedStep(task);

    return [
      `Failed: ${task.goal}`,
      failedStep ? `Problem step: ${failedStep.label}` : null,
      failedStep?.error ? `Reason: ${failedStep.error}` : task.error ? `Reason: ${task.error}` : null,
      "",
      "Execution trace:",
      ...task.steps.map(formatStepLine),
    ]
      .filter((line) => line !== null)
      .join("\n");
  }

  if (task.status === "cancelled") {
    return `Cancelled: ${task.goal}`;
  }

  const completedSteps = getCompletedSteps(task);

  return [
    `In progress: ${task.goal}`,
    completedSteps.length > 0 ? "Completed steps:" : null,
    ...completedSteps.map(formatStepLine),
  ]
    .filter(Boolean)
    .join("\n");
}