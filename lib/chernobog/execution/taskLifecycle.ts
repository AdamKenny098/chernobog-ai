// lib/chernobog/execution/taskLifecycle.ts

import {
  ExecutionStep,
  ExecutionStepStatus,
  ExecutionTask,
  ExecutionTaskStatus,
  ExecutionTaskUpdate,
} from "./types";

function now() {
  return new Date().toISOString();
}

export function updateExecutionTask(
  task: ExecutionTask,
  update: ExecutionTaskUpdate
): ExecutionTask {
  return {
    ...task,
    ...update,
    context: {
      ...task.context,
      ...(update.context ?? {}),
    },
    updatedAt: now(),
  };
}

export function setTaskStatus(
  task: ExecutionTask,
  status: ExecutionTaskStatus
): ExecutionTask {
  return updateExecutionTask(task, {
    status,
    ...(status === "completed" ? { completedAt: now() } : {}),
  });
}

export function updateExecutionStep(
  task: ExecutionTask,
  stepId: string,
  update: Partial<ExecutionStep>
): ExecutionTask {
  const steps = task.steps.map((step) => {
    if (step.id !== stepId) return step;

    return {
      ...step,
      ...update,
    };
  });

  return {
    ...task,
    steps,
    updatedAt: now(),
  };
}

export function setStepStatus(
  task: ExecutionTask,
  stepId: string,
  status: ExecutionStepStatus,
  extra?: Partial<ExecutionStep>
): ExecutionTask {
  const timestampPatch =
    status === "running"
      ? { startedAt: now() }
      : status === "completed" || status === "failed" || status === "blocked"
        ? { completedAt: now() }
        : {};

  return updateExecutionStep(task, stepId, {
    status,
    ...timestampPatch,
    ...(extra ?? {}),
  });
}

export function getCurrentStep(task: ExecutionTask): ExecutionStep | null {
  if (!task.currentStepId) return null;
  return task.steps.find((step) => step.id === task.currentStepId) ?? null;
}

export function moveToNextStep(task: ExecutionTask): ExecutionTask {
  const currentIndex = task.steps.findIndex(
    (step) => step.id === task.currentStepId
  );

  if (currentIndex === -1) {
    return setTaskStatus(task, "failed");
  }

  const nextStep = task.steps[currentIndex + 1];

  if (!nextStep) {
    return setTaskStatus(task, "completed");
  }

  return updateExecutionTask(task, {
    currentStepId: nextStep.id,
    status: "running",
  });
}

export function failExecutionTask(task: ExecutionTask, error: string): ExecutionTask {
  return updateExecutionTask(task, {
    status: "failed",
    error,
  });
}

export function cancelExecutionTask(task: ExecutionTask): ExecutionTask {
  return updateExecutionTask(task, {
    status: "cancelled",
  });
}