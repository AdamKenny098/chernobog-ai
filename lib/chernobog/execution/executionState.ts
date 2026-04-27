// lib/chernobog/execution/executionState.ts

import { ExecutionTask } from "./types";

export interface ExecutionState {
  activeTask?: ExecutionTask;
  lastTask?: ExecutionTask;

  selectedFilePath?: string;
  selectedFolderPath?: string;

  lastReadFilePath?: string;
  lastReadText?: unknown;

  lastOpenedFile?: unknown;
  lastOpenedFolder?: unknown;

  lastResult?: string;
  updatedAt: string;
}

function now() {
  return new Date().toISOString();
}

export function createEmptyExecutionState(): ExecutionState {
  return {
    updatedAt: now(),
  };
}

export function deriveExecutionStateFromTask(
  task: ExecutionTask,
  previousState: ExecutionState = createEmptyExecutionState()
): ExecutionState {
  const selectedFilePath =
    typeof task.context.selectedFilePath === "string"
      ? task.context.selectedFilePath
      : previousState.selectedFilePath;

  const selectedFolderPath =
    typeof task.context.selectedFolderPath === "string"
      ? task.context.selectedFolderPath
      : previousState.selectedFolderPath;

  const lastReadFilePath =
    typeof task.context.lastReadFilePath === "string"
      ? task.context.lastReadFilePath
      : previousState.lastReadFilePath;

  const lastReadText =
    task.context.lastReadText !== undefined
      ? task.context.lastReadText
      : previousState.lastReadText;

  const lastOpenedFile =
    task.context.openedFile !== undefined
      ? task.context.openedFile
      : previousState.lastOpenedFile;

  const lastOpenedFolder =
    task.context.openedFolder !== undefined
      ? task.context.openedFolder
      : previousState.lastOpenedFolder;

  return {
    ...previousState,

    activeTask:
      task.status === "running" ||
      task.status === "pending" ||
      task.status === "planning" ||
      task.status === "waiting_for_approval"
        ? task
        : undefined,

    lastTask: task,

    selectedFilePath,
    selectedFolderPath,

    lastReadFilePath,
    lastReadText,

    lastOpenedFile,
    lastOpenedFolder,

    lastResult: task.result ?? previousState.lastResult,

    updatedAt: now(),
  };
}

export function hasSelectedFile(state: ExecutionState): boolean {
  return typeof state.selectedFilePath === "string" && state.selectedFilePath.length > 0;
}

export function hasLastReadText(state: ExecutionState): boolean {
  return state.lastReadText !== undefined && state.lastReadText !== null;
}

export function getExecutionStateSummary(state: ExecutionState): string {
  const lines: string[] = [];

  if (state.activeTask) {
    lines.push(`Active task: ${state.activeTask.goal}`);
    lines.push(`Status: ${state.activeTask.status}`);
  }

  if (state.lastTask) {
    lines.push(`Last task: ${state.lastTask.goal}`);
    lines.push(`Last status: ${state.lastTask.status}`);
  }

  if (state.selectedFilePath) {
    lines.push(`Selected file: ${state.selectedFilePath}`);
  }

  if (state.lastReadFilePath) {
    lines.push(`Last read file: ${state.lastReadFilePath}`);
  }

  if (state.selectedFolderPath) {
    lines.push(`Selected folder: ${state.selectedFolderPath}`);
  }

  if (lines.length === 0) {
    return "No execution state is currently available.";
  }

  return lines.join("\n");
}