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
  openedApp?: unknown;
  hasSystemStatus: boolean;
  createdFolderPath?: string;
  appendedFilePath?: string;
  renamedTo?: string;
  copiedTo?: string;
  movedTo?: string;
  hasListedDirectory: boolean;
  hasPathInfo: boolean;
  hasOpenedUrl: boolean;
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
        openedApp: task.context.openedApp,
        hasSystemStatus: task.context.systemStatus !== undefined,
        error: task.error,
        createdFolderPath:
        typeof task.context.createdFolderPath === "string"
          ? task.context.createdFolderPath
          : undefined,
          renamedTo:
  typeof task.context.renamedTo === "string"
    ? task.context.renamedTo
    : undefined,

copiedTo:
  typeof task.context.copiedTo === "string"
    ? task.context.copiedTo
    : undefined,

movedTo:
  typeof task.context.movedTo === "string"
    ? task.context.movedTo
    : undefined,

hasListedDirectory: task.context.listedDirectory !== undefined,
hasPathInfo: task.context.pathInfo !== undefined,
hasOpenedUrl: task.context.openedUrl !== undefined,
  };
}