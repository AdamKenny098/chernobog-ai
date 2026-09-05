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

import {
  evaluateStepRuntimeGovernance,
  evaluateTaskRuntimeGovernance,
  getGovernanceDecisionMessage,
} from "../governance/runtimeGovernance";

import type {
  ExecutionGovernanceContext,
  ResolveExecutionStepGovernance,
} from "../governance/runtimeGovernance";

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
   */  maxSteps?: number;

  /**
   * Browser/session correlation for truthful runtime observation.
   */
  sessionId?: string;

  /**
   * Optional 11D cognitive governance context.
   * Omission preserves legacy execution behavior.
   */
  governance?: ExecutionGovernanceContext;

  /**
   * Optional step-specific governance override.
   */
  resolveStepGovernance?: ResolveExecutionStepGovernance;
}

type ExecutionLifecycleEventType =
  | "execution.started"
  | "execution.completed"
  | "execution.failed"
  | "execution.waiting_for_approval";

type ExecutionStepLifecycleEventType =
  | "execution.step.started"
  | "execution.step.completed"
  | "execution.step.failed"
  | "execution.step.blocked";

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

async function publishExecutionStepLifecycleEvent(
  type: ExecutionStepLifecycleEventType,
  task: ExecutionTask,
  stepId: string,
  sessionId?: string,
  actionOverride?: string
): Promise<void> {
  const step =
    task.steps.find(
      (candidate) => candidate.id === stepId
    );

  if (!step) {
    return;
  }

  const stepIndex =
    task.steps.findIndex(
      (candidate) => candidate.id === stepId
    );

  const severity =
    type === "execution.step.failed" ||
    type === "execution.step.blocked"
      ? "warning"
      : "info";

  await publishChernobogEventSafely({
    type,

    source: {
      subsystem: "execution",
      nodeId: "step-runner",
    },

    severity,

    subject: task.id,
    scope: `execution:${task.category}`,
    correlationId: task.id,
    causationId: step.id,

    payload: {
      ...(sessionId
        ? {
            sessionId,
          }
        : {}),

      taskId: task.id,
      category: task.category,
      taskStatus: task.status,

      stepId: step.id,
      stepIndex,
      stepCount: task.steps.length,
      stepKind: step.kind,
      stepLabel: step.label,

      action:
        actionOverride ??
        step.action ??
        step.kind,

      risk: step.risk,
      status: step.status,

      ...(step.error
        ? {
            error: step.error,
          }
        : {}),
    },

    metadata: {
      tags: [
        "execution",
        "execution-step",
        step.kind,
        step.status,
      ],

      sensitive:
        type === "execution.step.failed"
          ? true
          : undefined,
    },
  });
}

async function publishExecutionApprovalRequiredEvent(
  task: ExecutionTask,
  sessionId?: string
): Promise<void> {
  const currentStep =
    task.currentStepId
      ? task.steps.find(
          (step) =>
            step.id === task.currentStepId
        )
      : undefined;

  await publishChernobogEventSafely({
    type: "execution.approval.required",

    source: {
      subsystem: "execution",
      nodeId: "approval-gate",
    },

    severity: "notice",

    subject: task.id,
    scope: `execution:${task.category}`,
    correlationId: task.id,
    causationId: currentStep?.id,

    payload: {
      ...(sessionId
        ? {
            sessionId,
          }
        : {}),

      taskId: task.id,
      category: task.category,
      risk: task.risk,
      status: task.status,

      reason:
        task.approval.reason ??
        task.error ??
        "Execution requires user approval.",

      ...(currentStep
        ? {
            stepId: currentStep.id,
            stepKind: currentStep.kind,
            stepLabel: currentStep.label,
            action:
              currentStep.action ??
              currentStep.kind,
            stepRisk: currentStep.risk,
            stepStatus: currentStep.status,
          }
        : {}),
    },

    metadata: {
      tags: [
        "execution",
        "approval",
        "waiting",
      ],
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
  const taskGovernance =
    evaluateTaskRuntimeGovernance(
      task,
      options.governance,
    );

  if (taskGovernance.disposition === "deny") {
    task = failExecutionTask(
      task,
      getGovernanceDecisionMessage(
        taskGovernance,
        "Task is denied by unified governance.",
      ),
    );

    return finishExecution(
      "execution.failed",
      task,
    );
  }

  const taskNeedsUnifiedConfirmation =
    Boolean(
      options.governance &&
      taskGovernance.disposition === "confirm" &&
      task.approval.approved !== true,
    );

  if (
    shouldPauseForApproval(task) ||
    taskNeedsUnifiedConfirmation
  ) {
    const approvalReason =
      taskNeedsUnifiedConfirmation
        ? getGovernanceDecisionMessage(
            taskGovernance,
            "Task requires confirmation before execution.",
          )
        : task.approval.reason;

    task = {
      ...updateExecutionTask(task, {
        status: "waiting_for_approval",
        ...(approvalReason
          ? { error: approvalReason }
          : {}),
      }),
      approval: {
        ...task.approval,
        required: true,
        ...(approvalReason
          ? { reason: approvalReason }
          : {}),
      },
    };

    await publishExecutionApprovalRequiredEvent(
      task,
      options.sessionId
    );

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

    
    const stepGovernanceContext =
      options.resolveStepGovernance?.(
        step,
        task,
      ) ??
      options.governance;

    const stepGovernance =
      evaluateStepRuntimeGovernance(
        step,
        stepGovernanceContext,
      );
if (
      stepGovernance.disposition ===
      "deny"
    ) {
      task = setStepStatus(
        task,
        step.id,
        "blocked",
        {
          error:
            getGovernanceDecisionMessage(
              stepGovernance,
              riskPolicy.reason ??
                "Step is denied by unified governance.",
            ),
        }
      );

      await publishExecutionStepLifecycleEvent(
        "execution.step.blocked",
        task,
        step.id,
        options.sessionId,
        getHandlerKey(step)
      );

      task = failExecutionTask(
        task,
        getGovernanceDecisionMessage(
          stepGovernance,
          riskPolicy.reason ??
            "Execution stopped because a step was denied.",
        )
      );

      return finishExecution(
        "execution.failed",
        task
      );
    }

    if (
      stepGovernance.disposition ===
        "confirm" &&
      task.approval.approved !== true
    ) {
      task = setStepStatus(
        task,
        step.id,
        "blocked",
        {
          error:
            getGovernanceDecisionMessage(
              stepGovernance,
              riskPolicy.reason ??
                "Step requires approval before execution.",
            ),
        }
      );

      await publishExecutionStepLifecycleEvent(
        "execution.step.blocked",
        task,
        step.id,
        options.sessionId,
        getHandlerKey(step)
      );

      const approvalReason =
        getGovernanceDecisionMessage(
          stepGovernance,
          riskPolicy.reason ??
            "Execution paused for approval.",
        );

      task = {
        ...updateExecutionTask(task, {
          status:
            "waiting_for_approval",
          error:
            approvalReason,
        }),
        approval: {
          ...task.approval,
          required: true,
          reason:
            approvalReason,
        },
      };

      await publishExecutionApprovalRequiredEvent(
        task,
        options.sessionId
      );

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

      await publishExecutionStepLifecycleEvent(
        "execution.step.failed",
        task,
        step.id,
        options.sessionId,
        handlerKey
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

    await publishExecutionStepLifecycleEvent(
      "execution.step.started",
      task,
      step.id,
      options.sessionId,
      handlerKey
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

        await publishExecutionStepLifecycleEvent(
          "execution.step.failed",
          task,
          step.id,
          options.sessionId,
          handlerKey
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

      await publishExecutionStepLifecycleEvent(
        "execution.step.completed",
        task,
        step.id,
        options.sessionId,
        handlerKey
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

      await publishExecutionStepLifecycleEvent(
        "execution.step.failed",
        task,
        step.id,
        options.sessionId,
        handlerKey
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