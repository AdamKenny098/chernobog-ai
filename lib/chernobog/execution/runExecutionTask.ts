// lib/chernobog/execution/runExecutionTask.ts

import {
  runWithChernobogEventContext,
} from "../events/eventContext";

import {
  publishChernobogEventSafely,
} from "../events/publishers";

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

type ExecutionLifecycleEventType =
  | "execution.started"
  | "execution.completed"
  | "execution.failed"
  | "execution.waiting_for_approval";

function getHandlerKey(step: ExecutionStep) {
  return step.action ?? step.kind;
}

function shouldPauseForApproval(task: ExecutionTask) {
  return (
    task.approval.required &&
    task.approval.approved !== true
  );
}

async function publishExecutionLifecycleEvent(
  type: ExecutionLifecycleEventType,
  task: ExecutionTask
): Promise<void> {
  const severity =
    type === "execution.failed"
      ? "warning"
      : type === "execution.waiting_for_approval"
        ? "notice"
        : "info";

  await publishChernobogEventSafely({
    type,

    source: {
      subsystem: "execution",
    },

    severity,

    subject: task.id,

    scope: `execution:${task.category}`,

    correlationId: task.id,

    payload: {
      taskId: task.id,
      category: task.category,
      risk: task.risk,
      status: task.status,
      stepCount: task.steps.length,
      currentStepId: task.currentStepId,

      ...(task.error
        ? {
            error: task.error,
          }
        : {}),
    },

    metadata: {
      tags: [
        "execution",
        task.category,
      ],

      sensitive:
        type === "execution.failed"
          ? true
          : undefined,
    },
  });
}

async function finishExecution(
  type:
    | "execution.completed"
    | "execution.failed"
    | "execution.waiting_for_approval",
  task: ExecutionTask
): Promise<ExecutionTask> {
  await publishExecutionLifecycleEvent(
    type,
    task
  );

  return task;
}

export async function runExecutionTask(
  startingTask: ExecutionTask,
  options: RunExecutionTaskOptions
): Promise<ExecutionTask> {
  const maxSteps =
    options.maxSteps ?? 10;

  let task = startingTask;

  /*
   * A task that has already finished is simply returned.
   *
   * We do not emit another lifecycle event for an
   * execution that is not actually being resumed.
   */
  if (
    task.status === "completed" ||
    task.status === "failed"
  ) {
    return task;
  }

  await publishExecutionLifecycleEvent(
    "execution.started",
    task
  );

  if (task.risk === "blocked") {
    task = failExecutionTask(
      task,
      "Task is blocked by the risk gate."
    );

    return finishExecution(
      "execution.failed",
      task
    );
  }

  if (shouldPauseForApproval(task)) {
    task = updateExecutionTask(task, {
      status: "waiting_for_approval",
    });

    return finishExecution(
      "execution.waiting_for_approval",
      task
    );
  }

  task = setTaskStatus(
    task,
    "running"
  );

  for (
    let i = 0;
    i < maxSteps;
    i++
  ) {
    const step =
      getCurrentStep(task);

    if (!step) {
      task = setTaskStatus(
        task,
        "completed"
      );

      return finishExecution(
        "execution.completed",
        task
      );
    }

    const riskPolicy =
      getRiskPolicyForStep(step);

    if (
      riskPolicy.mode === "blocked"
    ) {
      task = setStepStatus(
        task,
        step.id,
        "blocked",
        {
          error:
            riskPolicy.reason ??
            "Step is blocked by the risk gate.",
        }
      );

      task = failExecutionTask(
        task,
        riskPolicy.reason ??
          "Execution stopped because a step is blocked."
      );

      return finishExecution(
        "execution.failed",
        task
      );
    }

    if (
      riskPolicy.mode === "approval" &&
      task.approval.approved !== true
    ) {
      task = setStepStatus(
        task,
        step.id,
        "blocked",
        {
          error:
            riskPolicy.reason ??
            "Step requires approval before execution.",
        }
      );

      task = updateExecutionTask(task, {
        status:
          "waiting_for_approval",

        error:
          riskPolicy.reason ??
          "Execution paused for approval.",
      });

      return finishExecution(
        "execution.waiting_for_approval",
        task
      );
    }

    const handlerKey =
      getHandlerKey(step);

    const handler =
      options.handlers[handlerKey];

    if (!handler) {
      task = setStepStatus(
        task,
        step.id,
        "failed",
        {
          error:
            `No execution handler found for "${handlerKey}".`,
        }
      );

      task = failExecutionTask(
        task,
        `No execution handler found for "${handlerKey}".`
      );

      return finishExecution(
        "execution.failed",
        task
      );
    }

    task = setStepStatus(
      task,
      step.id,
      "running"
    );

    try {
      /*
       * Everything executed by this handler now inherits:
       *
       * correlationId = execution task
       * causationId   = execution step
       *
       * Tool and model publishers therefore know
       * which task and step caused them without
       * needing extra function parameters.
       */
      const result =
        await runWithChernobogEventContext(
          {
            correlationId:
              task.id,

            causationId:
              step.id,

            subject:
              task.id,

            scope:
              `execution:${task.category}`,

            tags: [
              "execution-step",
              step.kind,
            ],
          },

          () =>
            handler(
              step,
              task
            )
        );

      if (!result.success) {
        task = setStepStatus(
          task,
          step.id,
          "failed",
          {
            error:
              result.error ??
              "Step failed.",
          }
        );

        task = failExecutionTask(
          task,
          result.error ??
            "Execution step failed."
        );

        return finishExecution(
          "execution.failed",
          task
        );
      }

      task = setStepStatus(
        task,
        step.id,
        "completed",
        {
          output:
            result.output,
        }
      );

      task = updateExecutionTask(
        task,
        {
          context: {
            lastStepId:
              step.id,

            lastAction:
              handlerKey,

            lastOutput:
              result.output,

            ...(result.context ?? {}),
          },
        }
      );

      task = moveToNextStep(
        task
      );

      if (
        task.status ===
        "completed"
      ) {
        return finishExecution(
          "execution.completed",
          task
        );
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown execution error.";

      task = setStepStatus(
        task,
        step.id,
        "failed",
        {
          error: message,
        }
      );

      task = failExecutionTask(
        task,
        message
      );

      return finishExecution(
        "execution.failed",
        task
      );
    }
  }

  task = failExecutionTask(
    task,
    `Execution exceeded max step limit of ${maxSteps}.`
  );

  return finishExecution(
    "execution.failed",
    task
  );
}