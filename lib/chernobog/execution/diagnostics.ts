// lib/chernobog/execution/diagnostics.ts

import { ExecutionTask } from "./types";

export interface ExecutionDiagnostics {
  taskId: string;
  category: string;
  goal: string;
  status: string;
  risk: string;
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  blockedSteps: number;
  currentStepId?: string;
  selectedFilePath?: string;
  lastReadFilePath?: string;
  hasLastReadText: boolean;
  error?: string;
}

export function buildExecutionDiagnostics(task: ExecutionTask): ExecutionDiagnostics {
  const completedSteps = task.steps.filter((step) => step.status === "completed").length;
  const failedSteps = task.steps.filter((step) => step.status === "failed").length;
  const blockedSteps = task.steps.filter((step) => step.status === "blocked").length;

  return {
    taskId: task.id,
    category: task.category,
    goal: task.goal,
    status: task.status,
    risk: task.risk,
    totalSteps: task.steps.length,
    completedSteps,
    failedSteps,
    blockedSteps,
    currentStepId: task.currentStepId,
    selectedFilePath:
      typeof task.context.selectedFilePath === "string"
        ? task.context.selectedFilePath
        : undefined,
    lastReadFilePath:
      typeof task.context.lastReadFilePath === "string"
        ? task.context.lastReadFilePath
        : undefined,
    hasLastReadText: task.context.lastReadText !== undefined,
    error: task.error,
  };
}