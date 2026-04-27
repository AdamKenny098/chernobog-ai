// lib/chernobog/execution/buildExecutionTask.ts

import { createExecutionTask } from "./createExecutionTask";
import { ExecutionState } from "./executionState";
import { ExecutionTask } from "./types";

export interface BuildExecutionTaskOptions {
  previousState?: ExecutionState;
}

function normalizeMessage(message: string) {
  return message.trim().replace(/\s+/g, " ").toLowerCase();
}

function stripNoiseWords(value: string) {
  return value
    .replace(/\bfile\b/gi, "")
    .replace(/\bfolder\b/gi, "")
    .replace(/\bplease\b/gi, "")
    .replace(/\bit\b/gi, "")
    .replace(/\bthat\b/gi, "")
    .replace(/\bagain\b/gi, "")
    .trim();
}

function extractTarget(message: string) {
  const normalized = normalizeMessage(message);

  const patterns = [
    /find (.+?) and read/i,
    /search for (.+?) and read/i,
    /find (.+?) then read/i,
    /search (.+?) then read/i,
    /find (.+?) and open/i,
    /search for (.+?) and open/i,
    /find (.+?) then open/i,
    /search (.+?) then open/i,
    /read (.+)/i,
    /open (.+)/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);

    if (match?.[1]) {
      const target = stripNoiseWords(match[1]);

      if (target.length > 0) {
        return target;
      }
    }
  }

  return normalized;
}

function wantsFindAndRead(message: string) {
  const normalized = normalizeMessage(message);

  return (
    (normalized.includes("find") || normalized.includes("search")) &&
    normalized.includes("read")
  );
}

function wantsFindAndOpen(message: string) {
  const normalized = normalizeMessage(message);

  return (
    (normalized.includes("find") || normalized.includes("search")) &&
    normalized.includes("open")
  );
}

function wantsRead(message: string) {
  const normalized = normalizeMessage(message);

  return normalized.startsWith("read ") || normalized.includes(" read ");
}

function wantsOpen(message: string) {
  const normalized = normalizeMessage(message);

  return normalized.startsWith("open ") || normalized.includes(" open ");
}

function wantsOpenFolder(message: string) {
  const normalized = normalizeMessage(message);

  return (
    normalized === "open folder" ||
    normalized === "open the folder" ||
    normalized === "open its folder" ||
    normalized === "open that folder" ||
    normalized === "open containing folder" ||
    normalized === "open the containing folder" ||
    normalized.includes("open folder") ||
    normalized.includes("open the folder") ||
    normalized.includes("containing folder")
  );
}

function wantsExecutionSummary(message: string) {
  const normalized = normalizeMessage(message);

  return (
    normalized === "what did you just do" ||
    normalized === "what did you do" ||
    normalized === "show execution state" ||
    normalized === "show task state" ||
    normalized === "show last task" ||
    normalized.includes("what did you just do")
  );
}

function wantsApprovalTest(message: string) {
    const normalized = normalizeMessage(message);
  
    return (
      normalized === "test approval" ||
      normalized === "test approval flow" ||
      normalized === "test execution approval"
    );
  }

  function wantsSummarizeLastRead(message: string) {
    const normalized = normalizeMessage(message);
  
    return (
      normalized === "summarize it" ||
      normalized === "summarise it" ||
      normalized === "summarize that" ||
      normalized === "summarise that" ||
      normalized === "summarize the file" ||
      normalized === "summarise the file" ||
      normalized === "summarize the last file" ||
      normalized === "summarise the last file" ||
      normalized === "summarize what you read" ||
      normalized === "summarise what you read"
    );
  }

function isItFollowUp(message: string) {
  const normalized = normalizeMessage(message);

  return (
    normalized === "open it" ||
    normalized === "open that" ||
    normalized === "read it" ||
    normalized === "read that" ||
    normalized === "read it again" ||
    normalized === "open it again" ||
    normalized.endsWith(" it") ||
    normalized.endsWith(" that")
  );
}

function createReadSelectedFileTask(message: string, path: string) {
  return createExecutionTask({
    category: "follow_up",
    input: message,
    goal: `Read selected file`,
    steps: [
      {
        kind: "file",
        label: "Read selected file",
        action: "read_text_file",
        input: {
          path,
        },
        risk: "safe",
      },
    ],
    context: {
      selectedFilePath: path,
    },
  });
}

function createOpenSelectedFileTask(message: string, path: string) {
  return createExecutionTask({
    category: "follow_up",
    input: message,
    goal: `Open selected file`,
    steps: [
      {
        kind: "file",
        label: "Open selected file",
        action: "open_file",
        input: {
          path,
        },
        risk: "notice",
      },
    ],
    context: {
      selectedFilePath: path,
    },
  });
}

function createOpenContainingFolderTask(message: string, filePath: string) {
    return createExecutionTask({
        category: "follow_up",
      input: message,
      goal: `Open containing folder`,
      steps: [
        {
          kind: "file",
          label: "Open containing folder",
          action: "open_folder",
          input: {
            source: "selectedFilePath",
          },
          risk: "notice",
        },
      ],
      context: {
        selectedFilePath: filePath,
      },
    });
  }

function createExecutionSummaryTask(message: string) {
  return createExecutionTask({
    category: "execution_summary",
    input: message,
    goal: "Summarize last execution state",
    steps: [
      {
        kind: "workflow",
        label: "Summarize execution state",
        action: "execution.summary",
        input: {},
        risk: "safe",
      },
    ],
  });
}

function createApprovalTestTask(message: string) {
    return createExecutionTask({
        category: "approval_flow",
      input: message,
      goal: "Test approval flow",
      steps: [
        {
          kind: "workflow",
          label: "Wait for user approval",
          action: "execution.approvalTest",
          input: {},
          risk: "approval_required",
        },
      ],
    });
  }

  function createSummarizeLastReadTask(message: string) {
    return createExecutionTask({
        category: "summarization",
      input: message,
      goal: "Summarize last read file",
      steps: [
        {
          kind: "workflow",
          label: "Summarize last read file",
          action: "execution.summarizeLastRead",
          input: {},
          risk: "safe",
        },
      ],
    });
  }

export function buildExecutionTaskFromMessage(
  message: string,
  options: BuildExecutionTaskOptions = {}
): ExecutionTask | null {
  const previousState = options.previousState;
  const target = extractTarget(message);
  const selectedFilePath =
    previousState?.selectedFilePath ?? previousState?.lastReadFilePath;

    if (wantsApprovalTest(message)) {
        return createApprovalTestTask(message);
      }
      
      if (wantsSummarizeLastRead(message)) {
        return createSummarizeLastReadTask(message);
      }
      
      if (wantsExecutionSummary(message)) {
        return createExecutionSummaryTask(message);
      }

  if (wantsOpenFolder(message) && selectedFilePath) {
    return createOpenContainingFolderTask(message, selectedFilePath);
  }

  if (isItFollowUp(message) && selectedFilePath) {
    if (wantsOpen(message)) {
      return createOpenSelectedFileTask(message, selectedFilePath);
    }

    if (wantsRead(message)) {
      return createReadSelectedFileTask(message, selectedFilePath);
    }
  }

  if (wantsFindAndRead(message)) {
    return createExecutionTask({
        category: "file_workflow",
      input: message,
      goal: `Find and read ${target}`,
      steps: [
        {
          kind: "file",
          label: `Search for ${target}`,
          action: "find_files",
          input: {
            query: target,
          },
          risk: "safe",
        },
        {
          kind: "file",
          label: "Read selected file",
          action: "read_text_file",
          input: {
            source: "selectedFilePath",
          },
          risk: "safe",
        },
      ],
      context: {
        target,
      },
    });
  }

  if (wantsFindAndOpen(message)) {
    return createExecutionTask({
        category: "file_workflow",
      input: message,
      goal: `Find and open ${target}`,
      steps: [
        {
          kind: "file",
          label: `Search for ${target}`,
          action: "find_files",
          input: {
            query: target,
          },
          risk: "safe",
        },
        {
          kind: "file",
          label: "Open selected file",
          action: "open_file",
          input: {
            source: "selectedFilePath",
          },
          risk: "notice",
        },
      ],
      context: {
        target,
      },
    });
  }

  if (wantsRead(message)) {
    return createExecutionTask({
        category: "file_workflow",
      input: message,
      goal: `Read ${target}`,
      steps: [
        {
          kind: "file",
          label: `Search for ${target}`,
          action: "find_files",
          input: {
            query: target,
          },
          risk: "safe",
        },
        {
          kind: "file",
          label: "Read selected file",
          action: "read_text_file",
          input: {
            source: "selectedFilePath",
          },
          risk: "safe",
        },
      ],
      context: {
        target,
      },
    });
  }

  if (wantsOpen(message)) {
    return createExecutionTask({
        category: "file_workflow",
      input: message,
      goal: `Open ${target}`,
      steps: [
        {
          kind: "file",
          label: `Search for ${target}`,
          action: "find_files",
          input: {
            query: target,
          },
          risk: "safe",
        },
        {
          kind: "file",
          label: "Open selected file",
          action: "open_file",
          input: {
            source: "selectedFilePath",
          },
          risk: "notice",
        },
      ],
      context: {
        target,
      },
    });
  }

  return null;
}