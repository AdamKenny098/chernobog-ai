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

  activeDevTarget?: string;
  activeDevFiles?: string[];
  lastDevSummary?: string;
  lastDevProposal?: string;
  lastProjectWritePath?: string;
  lastProjectCommand?: string;
  lastProjectCommandOutput?: string;

  preparedPatchTargetFile?: string;
  preparedPatchSummary?: string;
  preparedPatchReason?: string;
  preparedPatchValidationCommand?: string;

  preparedPatchContent?: string;
  lastAppliedPatchFile?: string;
  lastAppliedPatchSummary?: string;

  lastRejectedPatchReason?: string;
  lastRejectedPatchFile?: string;

  lastProjectNoteName?: string;
  lastProjectNotePath?: string;
  lastProjectNoteContent?: string;
  lastProjectNoteSearch?: unknown;
  lastProjectNoteSearchMatches?: unknown;

  lastDevProposalRisk?: "low" | "medium" | "high";
  lastDevProposalRiskReason?: string;
  lastDevProposalRecommendation?: string;
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

  const activeDevTarget =
    typeof task.context.activeDevTarget === "string"
      ? task.context.activeDevTarget
      : previousState.activeDevTarget;

  const activeDevFiles =
    Array.isArray(task.context.activeDevFiles)
      ? task.context.activeDevFiles.filter(
          (file): file is string => typeof file === "string"
        )
      : previousState.activeDevFiles;

  const lastDevSummary =
    typeof task.context.lastDevSummary === "string"
      ? task.context.lastDevSummary
      : previousState.lastDevSummary;

  const lastDevProposal =
    typeof task.context.lastDevProposal === "string"
      ? task.context.lastDevProposal
      : previousState.lastDevProposal;

  const lastProjectWritePath =
    typeof task.context.lastProjectWritePath === "string"
      ? task.context.lastProjectWritePath
      : previousState.lastProjectWritePath;

  const lastProjectCommand =
    typeof task.context.lastProjectCommand === "string"
      ? task.context.lastProjectCommand
      : previousState.lastProjectCommand;

  const lastProjectCommandOutput =
    typeof task.context.lastProjectCommandOutput === "string"
      ? task.context.lastProjectCommandOutput
      : previousState.lastProjectCommandOutput;

  const preparedPatchTargetFile =
    typeof task.context.preparedPatchTargetFile === "string"
      ? task.context.preparedPatchTargetFile
      : previousState.preparedPatchTargetFile;

  const preparedPatchSummary =
    typeof task.context.preparedPatchSummary === "string"
      ? task.context.preparedPatchSummary
      : previousState.preparedPatchSummary;

  const preparedPatchReason =
    typeof task.context.preparedPatchReason === "string"
      ? task.context.preparedPatchReason
      : previousState.preparedPatchReason;

  const preparedPatchValidationCommand =
    typeof task.context.preparedPatchValidationCommand === "string"
      ? task.context.preparedPatchValidationCommand
      : previousState.preparedPatchValidationCommand;

  const preparedPatchContent =
  typeof task.context.preparedPatchContent === "string"
    ? task.context.preparedPatchContent
    : previousState.preparedPatchContent;

  const lastAppliedPatchFile =
    typeof task.context.lastAppliedPatchFile === "string"
      ? task.context.lastAppliedPatchFile
      : previousState.lastAppliedPatchFile;

  const lastAppliedPatchSummary =
    typeof task.context.lastAppliedPatchSummary === "string"
      ? task.context.lastAppliedPatchSummary
      : previousState.lastAppliedPatchSummary;

      const lastRejectedPatchReason =
      typeof task.context.lastRejectedPatchReason === "string"
        ? task.context.lastRejectedPatchReason
        : previousState.lastRejectedPatchReason;
    
    const lastRejectedPatchFile =
      typeof task.context.lastRejectedPatchFile === "string"
        ? task.context.lastRejectedPatchFile
        : previousState.lastRejectedPatchFile;

        const lastProjectNoteName =
        typeof task.context.lastProjectNoteName === "string"
          ? task.context.lastProjectNoteName
          : previousState.lastProjectNoteName;
      
      const lastProjectNotePath =
        typeof task.context.lastProjectNotePath === "string"
          ? task.context.lastProjectNotePath
          : previousState.lastProjectNotePath;
      
      const lastProjectNoteContent =
        typeof task.context.lastProjectNoteContent === "string"
          ? task.context.lastProjectNoteContent
          : previousState.lastProjectNoteContent;
      
      const lastProjectNoteSearch =
        task.context.lastProjectNoteSearch !== undefined
          ? task.context.lastProjectNoteSearch
          : previousState.lastProjectNoteSearch;
      
      const lastProjectNoteSearchMatches =
        task.context.lastProjectNoteSearchMatches !== undefined
          ? task.context.lastProjectNoteSearchMatches
          : previousState.lastProjectNoteSearchMatches;

          const lastDevProposalRisk =
          task.context.lastDevProposalRisk === "low" ||
          task.context.lastDevProposalRisk === "medium" ||
          task.context.lastDevProposalRisk === "high"
            ? task.context.lastDevProposalRisk
            : previousState.lastDevProposalRisk;
        
        const lastDevProposalRiskReason =
          typeof task.context.lastDevProposalRiskReason === "string"
            ? task.context.lastDevProposalRiskReason
            : previousState.lastDevProposalRiskReason;
        
        const lastDevProposalRecommendation =
          typeof task.context.lastDevProposalRecommendation === "string"
            ? task.context.lastDevProposalRecommendation
            : previousState.lastDevProposalRecommendation;

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

    activeDevTarget,
    activeDevFiles,
    lastDevSummary,
    lastDevProposal,
    lastProjectWritePath,
    lastProjectCommand,
    lastProjectCommandOutput,

    preparedPatchTargetFile,
    preparedPatchSummary,
    preparedPatchReason,
    preparedPatchValidationCommand,
    preparedPatchContent,
    lastAppliedPatchFile,
    lastAppliedPatchSummary,

    lastRejectedPatchReason,
    lastRejectedPatchFile,

    lastProjectNoteName,
    lastProjectNotePath,
    lastProjectNoteContent,
    lastProjectNoteSearch,
    lastProjectNoteSearchMatches,
    
    lastDevProposalRisk,
    lastDevProposalRiskReason,
    lastDevProposalRecommendation,

    lastResult: task.result ?? previousState.lastResult,

    updatedAt: now(),
  };
}

export function hasSelectedFile(state: ExecutionState): boolean {
  return (
    typeof state.selectedFilePath === "string" &&
    state.selectedFilePath.length > 0
  );
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

  if (state.lastDevProposalRisk) {
    lines.push(`Last dev proposal risk: ${state.lastDevProposalRisk}`);
  }
  
  if (state.lastDevProposalRiskReason) {
    lines.push(`Last dev proposal risk reason: ${state.lastDevProposalRiskReason}`);
  }
  
  if (state.lastDevProposalRecommendation) {
    lines.push(`Last dev proposal recommendation: ${state.lastDevProposalRecommendation}`);
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

  if (state.activeDevTarget) {
    lines.push(`Active dev target: ${state.activeDevTarget}`);
  }

  if (state.activeDevFiles?.length) {
    lines.push(`Active dev files: ${state.activeDevFiles.length}`);
  }

  if (state.lastDevSummary) {
    lines.push(`Last dev summary: ${state.lastDevSummary}`);
  }

  if (state.lastDevProposal) {
    lines.push(`Last dev proposal: ${state.lastDevProposal}`);
  }

  if (state.lastProjectWritePath) {
    lines.push(`Last project write: ${state.lastProjectWritePath}`);
  }

  if (state.lastProjectCommand) {
    lines.push(`Last project command: ${state.lastProjectCommand}`);
  }

  if (state.lastProjectCommandOutput) {
    lines.push("Last project command output: available");
  }

  if (state.preparedPatchTargetFile) {
    lines.push(`Prepared patch target: ${state.preparedPatchTargetFile}`);
  }

  if (state.preparedPatchSummary) {
    lines.push(`Prepared patch summary: ${state.preparedPatchSummary}`);
  }

  if (state.preparedPatchValidationCommand) {
    lines.push(`Prepared patch validation: ${state.preparedPatchValidationCommand}`);
  }

  if (lines.length === 0) {
    return "No execution state is currently available.";
  }

  if (state.preparedPatchContent) {
    lines.push("Prepared patch content: available");
  }
  
  if (state.lastAppliedPatchFile) {
    lines.push(`Last applied patch file: ${state.lastAppliedPatchFile}`);
  }
  
  if (state.lastAppliedPatchSummary) {
    lines.push(`Last applied patch summary: ${state.lastAppliedPatchSummary}`);
  }

  if (state.lastRejectedPatchFile) {
    lines.push(`Last rejected patch file: ${state.lastRejectedPatchFile}`);
  }
  
  if (state.lastRejectedPatchReason) {
    lines.push(`Last rejected patch reason: ${state.lastRejectedPatchReason}`);
  }

  if (state.lastProjectNoteName) {
    lines.push(`Last project note: ${state.lastProjectNoteName}`);
  }
  
  if (state.lastProjectNotePath) {
    lines.push(`Last project note path: ${state.lastProjectNotePath}`);
  }
  
  if (state.lastProjectNoteSearch) {
    lines.push("Last project note search: available");
  }
  
  if (state.lastProjectNoteSearchMatches) {
    lines.push("Last project note search matches: available");
  }

  return lines.join("\n");
}