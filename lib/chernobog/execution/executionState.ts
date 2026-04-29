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
    lastOpenedApp?: unknown;
  
    lastSystemStatus?: unknown;
  
    lastResult?: string;
    updatedAt: string;

    lastCreatedFolderPath?: string;
    lastCreatedFilePath?: string;
    lastAppendedFilePath?: string;

    lastRenamedFilePath?: string;
    lastRenamedFolderPath?: string;
    lastCopiedFilePath?: string;
    lastCopiedFolderPath?: string;
    lastMovedFilePath?: string;
    lastMovedFolderPath?: string;
    lastListedDirectory?: unknown;
    lastPathInfo?: unknown;
    lastOpenedUrl?: unknown;
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
  if (task.context.resetExecutionState === true) {
    return {
      lastTask: task,
      lastResult: "Execution state reset.",
      updatedAt: now(),
    };
  }
  
  const selectedFilePath =
  typeof task.context.selectedFilePath === "string"
    ? task.context.selectedFilePath
    : typeof task.context.createdFilePath === "string"
      ? task.context.createdFilePath
      : typeof task.context.appendedFilePath === "string"
        ? task.context.appendedFilePath
        : typeof task.context.lastRenamedFilePath === "string"
          ? task.context.lastRenamedFilePath
          : typeof task.context.lastCopiedFilePath === "string"
            ? task.context.lastCopiedFilePath
            : typeof task.context.lastMovedFilePath === "string"
              ? task.context.lastMovedFilePath
              : previousState.selectedFilePath ?? previousState.lastReadFilePath;
  
              const selectedFolderPath =
              typeof task.context.selectedFolderPath === "string"
                ? task.context.selectedFolderPath
                : typeof task.context.createdFolderPath === "string"
                  ? task.context.createdFolderPath
                  : typeof task.context.lastRenamedFolderPath === "string"
                    ? task.context.lastRenamedFolderPath
                    : typeof task.context.lastCopiedFolderPath === "string"
                      ? task.context.lastCopiedFolderPath
                      : typeof task.context.lastMovedFolderPath === "string"
                        ? task.context.lastMovedFolderPath
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

      const lastOpenedApp =
      task.context.openedApp !== undefined
        ? task.context.openedApp
        : previousState.lastOpenedApp;
    
    const lastSystemStatus =
      task.context.systemStatus !== undefined
        ? task.context.systemStatus
        : previousState.lastSystemStatus;

        const lastCreatedFolderPath =
  typeof task.context.createdFolderPath === "string"
    ? task.context.createdFolderPath
    : previousState.lastCreatedFolderPath;

const lastCreatedFilePath =
  typeof task.context.createdFilePath === "string"
    ? task.context.createdFilePath
    : previousState.lastCreatedFilePath;

const lastAppendedFilePath =
  typeof task.context.appendedFilePath === "string"
    ? task.context.appendedFilePath
    : previousState.lastAppendedFilePath;

    const lastRenamedFilePath =
  typeof task.context.lastRenamedFilePath === "string"
    ? task.context.lastRenamedFilePath
    : previousState.lastRenamedFilePath;

const lastRenamedFolderPath =
  typeof task.context.lastRenamedFolderPath === "string"
    ? task.context.lastRenamedFolderPath
    : previousState.lastRenamedFolderPath;

const lastCopiedFilePath =
  typeof task.context.lastCopiedFilePath === "string"
    ? task.context.lastCopiedFilePath
    : previousState.lastCopiedFilePath;

const lastCopiedFolderPath =
  typeof task.context.lastCopiedFolderPath === "string"
    ? task.context.lastCopiedFolderPath
    : previousState.lastCopiedFolderPath;

const lastMovedFilePath =
  typeof task.context.lastMovedFilePath === "string"
    ? task.context.lastMovedFilePath
    : previousState.lastMovedFilePath;

const lastMovedFolderPath =
  typeof task.context.lastMovedFolderPath === "string"
    ? task.context.lastMovedFolderPath
    : previousState.lastMovedFolderPath;

const lastListedDirectory =
  task.context.listedDirectory !== undefined
    ? task.context.listedDirectory
    : previousState.lastListedDirectory;

const lastPathInfo =
  task.context.pathInfo !== undefined
    ? task.context.pathInfo
    : previousState.lastPathInfo;

const lastOpenedUrl =
  task.context.openedUrl !== undefined
    ? task.context.openedUrl
    : previousState.lastOpenedUrl;

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
    lastOpenedApp,

    lastSystemStatus,
    lastCreatedFolderPath,
    lastCreatedFilePath,
    lastAppendedFilePath,

    lastRenamedFilePath,
    lastRenamedFolderPath,
    lastCopiedFilePath,
    lastCopiedFolderPath,
    lastMovedFilePath,
    lastMovedFolderPath,
    lastListedDirectory,
    lastPathInfo,
    lastOpenedUrl,

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
  
  if (state.lastCreatedFilePath) {
    lines.push(`Last created file: ${state.lastCreatedFilePath}`);
  }
  
  if (state.selectedFolderPath) {
    lines.push(`Selected folder: ${state.selectedFolderPath}`);
  }

  if (state.lastOpenedApp) {
    lines.push(`Last opened app: ${JSON.stringify(state.lastOpenedApp)}`);
  }
  
  if (state.lastSystemStatus) {
    lines.push("Last system status: available");
  }

  if (state.lastCreatedFolderPath) {
    lines.push(`Last created folder: ${state.lastCreatedFolderPath}`);
  }

  if (state.lastAppendedFilePath) {
    lines.push(`Last appended file: ${state.lastAppendedFilePath}`);
  }

  if (state.lastRenamedFilePath) {
    lines.push(`Last renamed file: ${state.lastRenamedFilePath}`);
  }
  
  if (state.lastRenamedFolderPath) {
    lines.push(`Last renamed folder: ${state.lastRenamedFolderPath}`);
  }
  
  if (state.lastCopiedFilePath) {
    lines.push(`Last copied file: ${state.lastCopiedFilePath}`);
  }
  
  if (state.lastCopiedFolderPath) {
    lines.push(`Last copied folder: ${state.lastCopiedFolderPath}`);
  }
  
  if (state.lastMovedFilePath) {
    lines.push(`Last moved file: ${state.lastMovedFilePath}`);
  }
  
  if (state.lastMovedFolderPath) {
    lines.push(`Last moved folder: ${state.lastMovedFolderPath}`);
  }
  
  if (state.lastListedDirectory) {
    lines.push("Last listed directory: available");
  }
  
  if (state.lastPathInfo) {
    lines.push("Last path info: available");
  }
  
  if (state.lastOpenedUrl) {
    lines.push(`Last opened URL: ${JSON.stringify(state.lastOpenedUrl)}`);
  }

  if (lines.length === 0) {
    return "No execution state is currently available.";
  }

  return lines.join("\n");
}