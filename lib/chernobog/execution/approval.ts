// lib/chernobog/execution/approval.ts

import { updateExecutionTask } from "./taskLifecycle";
import { ExecutionTask } from "./types";

function now() {
  return new Date().toISOString();
}

export function approveExecutionTask(task: ExecutionTask): ExecutionTask {
  if (!task.approval.required) {
    return task;
  }

  return updateExecutionTask(task, {
    status: "running",
    error: undefined,
    context: {
      approvalResolvedAt: now(),
      approvalResult: "approved",
    },
  });
}

export function denyExecutionTask(
  task: ExecutionTask,
  reason = "Approval denied."
): ExecutionTask {
  if (!task.approval.required) {
    return task;
  }

  return updateExecutionTask(task, {
    status: "cancelled",
    error: reason,
    context: {
      approvalResolvedAt: now(),
      approvalResult: "denied",
      approvalDeniedReason: reason,
    },
  });
}

export function markExecutionTaskApproved(task: ExecutionTask): ExecutionTask {
  return {
    ...approveExecutionTask(task),
    approval: {
      ...task.approval,
      required: false,
      approved: true,
      approvedAt: now(),
    },
  };
}

export function markExecutionTaskDenied(
  task: ExecutionTask,
  reason = "Approval denied."
): ExecutionTask {
  return {
    ...denyExecutionTask(task, reason),
    approval: {
      ...task.approval,
      approved: false,
      deniedAt: now(),
    },
  };
}