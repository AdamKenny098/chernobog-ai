// lib/chernobog/execution/runExecutionTask.ts

import {
  ExecutionStep,
  ExecutionTask,
} from "./types";

import {
  failExecutionTask,
  getCurrentStep,
  moveToNextStep,
  setStepStatus,
  setTaskStatus,
  updateExecutionTask,
} from "./taskLifecycle";

import { getRiskPolicyForStep } from "./riskPolicy";

export interface ExecutionActionResult {
  success: boolean;
  output?: unknown;
  context?: Record<string, unknown>;
  error?: string;
}

export type ExecutionActionHandler = (
  step: ExecutionStep,
  task: ExecutionTask
) => Promise<ExecutionActionResult>;

export interface RunExecutionTaskOptions {
  handlers: Record<string, ExecutionActionHandler>;

  /**
   * Safety limit so a bad task cannot loop forever.
   */
  maxSteps?: number;
}

function getHandlerKey(step: ExecutionStep) {
  return step.action ?? step.kind;
}

function shouldPauseForApproval(task: ExecutionTask) {
  return task.approval.required && task.approval.approved !== true;
}

export async function runExecutionTask(
  startingTask: ExecutionTask,
  options: RunExecutionTaskOptions
): Promise<ExecutionTask> {
  const maxSteps = options.maxSteps ?? 10;

  let task = startingTask;

  if (task.status === "completed" || task.status === "failed") {
    return task;
  }

  if (task.risk === "blocked") {
    return failExecutionTask(task, "Task is blocked by the risk gate.");
  }

  if (shouldPauseForApproval(task)) {
    return updateExecutionTask(task, {
      status: "waiting_for_approval",
    });
  }

  task = setTaskStatus(task, "running");

  for (let i = 0; i < maxSteps; i++) {
    const step = getCurrentStep(task);

    if (!step) {
      return setTaskStatus(task, "completed");
    }

    const riskPolicy = getRiskPolicyForStep(step);

    if (riskPolicy.mode === "blocked") {
      task = setStepStatus(task, step.id, "blocked", {
        error: riskPolicy.reason ?? "Step is blocked by the risk gate.",
      });

      return failExecutionTask(
        task,
        riskPolicy.reason ?? "Execution stopped because a step is blocked."
      );
    }

    if (riskPolicy.mode === "approval" && task.approval.approved !== true) {
        task = setStepStatus(task, step.id, "blocked", {
          error: riskPolicy.reason ?? "Step requires approval before execution.",
        });
      
        return updateExecutionTask(task, {
          status: "waiting_for_approval",
          error: riskPolicy.reason ?? "Execution paused for approval.",
        });
      }

    const handlerKey = getHandlerKey(step);
    const handler = options.handlers[handlerKey];

    if (!handler) {
      task = setStepStatus(task, step.id, "failed", {
        error: `No execution handler found for "${handlerKey}".`,
      });

      return failExecutionTask(
        task,
        `No execution handler found for "${handlerKey}".`
      );
    }

    task = setStepStatus(task, step.id, "running");

    try {
      const result = await handler(step, task);

      if (!result.success) {
        task = setStepStatus(task, step.id, "failed", {
          error: result.error ?? "Step failed.",
        });

        return failExecutionTask(task, result.error ?? "Execution step failed.");
      }

      task = setStepStatus(task, step.id, "completed", {
        output: result.output,
      });

      task = updateExecutionTask(task, {
        context: {
          lastStepId: step.id,
          lastAction: handlerKey,
          lastOutput: result.output,
          ...(result.context ?? {}),
        },
      });

      task = moveToNextStep(task);

      if (task.status === "completed") {
        return task;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown execution error.";

      task = setStepStatus(task, step.id, "failed", {
        error: message,
      });

      return failExecutionTask(task, message);
    }
  }

  return failExecutionTask(
    task,
    `Execution exceeded max step limit of ${maxSteps}.`
  );
}