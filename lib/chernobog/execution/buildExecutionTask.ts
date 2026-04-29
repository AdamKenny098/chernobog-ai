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

function cleanName(value: string) {
  return value
    .replace(/\bplease\b/gi, "")
    .replace(/\bcalled\b/gi, "")
    .replace(/\bnamed\b/gi, "")
    .replace(/\bapprove\b/gi, "")
    .replace(/^["']|["']$/g, "")
    .trim();
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

function extractAppName(message: string) {
  const normalized = normalizeMessage(message);

  const patterns = [/^open (.+)$/i, /^launch (.+)$/i, /^start (.+)$/i];

  for (const pattern of patterns) {
    const match = message.match(pattern);

    if (match?.[1]) {
      return cleanName(
        match[1]
          .replace(/\bapp\b/gi, "")
          .replace(/\bapplication\b/gi, "")
      );
    }
  }

  return normalized;
}

function extractBaseLocation(message: string): "desktop" | "downloads" | "documents" | undefined {
  const normalized = normalizeMessage(message);

  if (
    normalized.includes(" on desktop") ||
    normalized.includes(" in desktop") ||
    normalized.includes(" to desktop")
  ) {
    return "desktop";
  }

  if (
    normalized.includes(" in downloads") ||
    normalized.includes(" on downloads") ||
    normalized.includes(" to downloads") ||
    normalized.includes(" in download") ||
    normalized.includes(" to download")
  ) {
    return "downloads";
  }

  if (
    normalized.includes(" in documents") ||
    normalized.includes(" on documents") ||
    normalized.includes(" to documents")
  ) {
    return "documents";
  }

  return undefined;
}

function extractDestinationLocation(message: string): "desktop" | "downloads" | "documents" | undefined {
  return extractBaseLocation(message);
}

function removeBaseLocationSuffix(value: string) {
  return value.replace(/\s+(on|in|to)\s+(desktop|downloads|download|documents)$/i, "");
}

function extractFolderName(message: string) {
  return cleanName(
    removeBaseLocationSuffix(
      message
        .replace(/^create folder /i, "")
        .replace(/^make folder /i, "")
        .replace(/^create a folder /i, "")
        .replace(/^make a folder /i, "")
        .replace(/^create a new folder /i, "")
        .replace(/^make a new folder /i, "")
        .replace(/^called /i, "")
        .replace(/^named /i, "")
    )
  );
}

function extractTextFileName(message: string) {
  return cleanName(
    removeBaseLocationSuffix(
      message
        .replace(/^create text file /i, "")
        .replace(/^make text file /i, "")
        .replace(/^create a text file /i, "")
        .replace(/^make a text file /i, "")
        .replace(/^create text /i, "")
        .replace(/^make text /i, "")
        .replace(/^create file /i, "")
        .replace(/^make file /i, "")
        .replace(/^create a file /i, "")
        .replace(/^make a file /i, "")
        .replace(/^called /i, "")
        .replace(/^named /i, "")
    )
  );
}

function extractTextToAppend(message: string) {
  return message
    .replace(/^write /i, "")
    .replace(/^add /i, "")
    .replace(/^append /i, "")
    .replace(/^put /i, "")
    .replace(/\s+to it$/i, "")
    .replace(/\s+to that$/i, "")
    .replace(/\s+to the file$/i, "")
    .replace(/\s+into the file$/i, "")
    .replace(/^["']|["']$/g, "")
    .trim();
}

function wantsApprovalTest(message: string) {
  const normalized = normalizeMessage(message);

  return (
    normalized === "test approval" ||
    normalized === "test approval flow" ||
    normalized === "test execution approval"
  );
}

function wantsResetExecutionState(message: string) {
  const normalized = normalizeMessage(message);

  return (
    normalized === "reset execution state" ||
    normalized === "clear execution state" ||
    normalized === "clear task state" ||
    normalized === "reset task state" ||
    normalized === "forget active file" ||
    normalized === "clear active file"
  );
}

function wantsActiveObjectSummary(message: string) {
  const normalized = normalizeMessage(message);

  return (
    normalized === "show active object" ||
    normalized === "show active target" ||
    normalized === "what is active" ||
    normalized === "what file is active" ||
    normalized === "show active file" ||
    normalized === "show selected file" ||
    normalized === "show selected object"
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

function wantsSystemStatus(message: string) {
  const normalized = normalizeMessage(message);

  return (
    normalized === "system status" ||
    normalized === "show system status" ||
    normalized === "check system" ||
    normalized === "check system status" ||
    normalized === "check platform" ||
    normalized === "what platform am i on" ||
    normalized === "what time is it" ||
    normalized === "show local time" ||
    normalized === "show machine status"
  );
}

function wantsCreateFolder(message: string) {
  const normalized = normalizeMessage(message);

  return (
    normalized.startsWith("create folder ") ||
    normalized.startsWith("make folder ") ||
    normalized.startsWith("create a folder ") ||
    normalized.startsWith("make a folder ") ||
    normalized.startsWith("create a new folder ") ||
    normalized.startsWith("make a new folder ")
  );
}

function wantsCreateTextFile(message: string) {
  const normalized = normalizeMessage(message);

  return (
    normalized.startsWith("create text file ") ||
    normalized.startsWith("make text file ") ||
    normalized.startsWith("create a text file ") ||
    normalized.startsWith("make a text file ") ||
    normalized.startsWith("create text ") ||
    normalized.startsWith("make text ") ||
    normalized.startsWith("create file ") ||
    normalized.startsWith("make file ") ||
    normalized.startsWith("create a file ") ||
    normalized.startsWith("make a file ")
  );
}

function wantsAppendTextToActiveFile(message: string) {
  const normalized = normalizeMessage(message);

  return (
    (
      normalized.startsWith("write ") ||
      normalized.startsWith("add ") ||
      normalized.startsWith("append ") ||
      normalized.startsWith("put ")
    ) &&
    (
      normalized.endsWith(" to it") ||
      normalized.endsWith(" to that") ||
      normalized.includes(" to the file") ||
      normalized.includes(" into the file")
    )
  );
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
    normalized === "show containing folder" ||
    normalized === "show the containing folder" ||
    normalized === "show it in folder" ||
    normalized === "show it in the folder" ||
    normalized === "show that in folder" ||
    normalized === "show that in the folder" ||
    normalized === "open its location" ||
    normalized === "open file location" ||
    normalized === "open the file location" ||
    normalized === "reveal it" ||
    normalized === "reveal that" ||
    normalized === "reveal file" ||
    normalized === "reveal the file" ||
    normalized.includes("open folder") ||
    normalized.includes("open the folder") ||
    normalized.includes("containing folder") ||
    normalized.includes("show it in folder") ||
    normalized.includes("show it in the folder") ||
    normalized.includes("open its location") ||
    normalized.includes("file location")
  );
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

function wantsOpenApp(message: string) {
  const normalized = normalizeMessage(message);

  return (
    normalized.startsWith("open ") ||
    normalized.startsWith("launch ") ||
    normalized.startsWith("start ")
  );
}

function wantsOpenUrl(message: string) {
  const normalized = normalizeMessage(message);

  return (
    normalized.startsWith("open http://") ||
    normalized.startsWith("open https://") ||
    normalized.startsWith("open www.") ||
    normalized.startsWith("open github.com") ||
    normalized.startsWith("open youtube.com")
  );
}

function extractUrl(message: string) {
  const raw = message.replace(/^open /i, "").trim();

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }

  return `https://${raw}`;
}

function wantsRenameActiveObject(message: string) {
  const normalized = normalizeMessage(message);

  return (
    normalized.startsWith("rename it to ") ||
    normalized.startsWith("rename that to ") ||
    normalized.startsWith("rename file to ") ||
    normalized.startsWith("rename the file to ") ||
    normalized.startsWith("rename active file to ") ||
    normalized.startsWith("rename folder to ") ||
    normalized.startsWith("rename the folder to ") ||
    normalized.startsWith("rename active folder to ")
  );
}

function extractRenameTargetName(message: string) {
  return cleanName(
    message
      .replace(/^rename it to /i, "")
      .replace(/^rename that to /i, "")
      .replace(/^rename file to /i, "")
      .replace(/^rename the file to /i, "")
      .replace(/^rename active file to /i, "")
      .replace(/^rename folder to /i, "")
      .replace(/^rename the folder to /i, "")
      .replace(/^rename active folder to /i, "")
  );
}

function wantsListDirectory(message: string) {
  const normalized = normalizeMessage(message);

  return (
    normalized === "list folder" ||
    normalized === "list this folder" ||
    normalized === "list the folder" ||
    normalized === "show files" ||
    normalized === "show files in it" ||
    normalized === "what is inside this folder" ||
    normalized === "what is in this folder" ||
    normalized === "list desktop" ||
    normalized === "list downloads" ||
    normalized === "list documents"
  );
}

function extractListBaseLocation(message: string): "desktop" | "downloads" | "documents" | undefined {
  const normalized = normalizeMessage(message);

  if (normalized.includes("desktop")) return "desktop";
  if (normalized.includes("downloads")) return "downloads";
  if (normalized.includes("documents")) return "documents";

  return undefined;
}

function wantsPathInfo(message: string) {
  const normalized = normalizeMessage(message);

  return (
    normalized === "show file info" ||
    normalized === "show path info" ||
    normalized === "what is this file" ||
    normalized === "what is this folder" ||
    normalized === "how big is it" ||
    normalized === "when was it modified" ||
    normalized === "show info"
  );
}

function wantsCopyActiveObject(message: string) {
  const normalized = normalizeMessage(message);

  return (
    normalized.startsWith("copy it to ") ||
    normalized.startsWith("copy that to ") ||
    normalized.startsWith("copy file to ") ||
    normalized.startsWith("copy folder to ") ||
    normalized === "duplicate it" ||
    normalized === "make a copy of it"
  );
}

function wantsMoveActiveObject(message: string) {
  const normalized = normalizeMessage(message);

  return (
    normalized.startsWith("move it to ") ||
    normalized.startsWith("move that to ") ||
    normalized.startsWith("move file to ") ||
    normalized.startsWith("move folder to ")
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

function createResetExecutionStateTask(message: string) {
  return createExecutionTask({
    category: "execution_summary",
    input: message,
    goal: "Reset execution state",
    steps: [
      {
        kind: "workflow",
        label: "Reset execution state",
        action: "execution.resetState",
        input: {},
        risk: "safe",
      },
    ],
  });
}

function createActiveObjectSummaryTask(message: string) {
  return createExecutionTask({
    category: "execution_summary",
    input: message,
    goal: "Show active execution object",
    steps: [
      {
        kind: "workflow",
        label: "Show active execution object",
        action: "execution.activeObjectSummary",
        input: {},
        risk: "safe",
      },
    ],
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

function createSystemStatusTask(message: string) {
  return createExecutionTask({
    category: "system_operation",
    input: message,
    goal: "Show system status",
    steps: [
      {
        kind: "system",
        label: "Read local system status",
        action: "system.status",
        input: {},
        risk: "safe",
      },
    ],
  });
}

function createCreateFolderTask(
  message: string,
  folderName: string,
  baseLocation?: string
) {
  return createExecutionTask({
    category: "system_operation",
    input: message,
    goal: baseLocation
      ? `Create folder ${folderName} in ${baseLocation}`
      : `Create folder ${folderName}`,
    steps: [
      {
        kind: "file",
        label: baseLocation
          ? `Create folder ${folderName} in ${baseLocation}`
          : `Create folder ${folderName}`,
        action: "create_folder",
        input: {
          folderName,
          baseLocation,
        },
        risk: "approval_required",
      },
    ],
    context: {
      folderName,
      baseLocation,
    },
  });
}

function createCreateTextFileTask(
  message: string,
  fileName: string,
  baseLocation?: string
) {
  return createExecutionTask({
    category: "system_operation",
    input: message,
    goal: baseLocation
      ? `Create text file ${fileName} in ${baseLocation}`
      : `Create text file ${fileName}`,
    steps: [
      {
        kind: "file",
        label: baseLocation
          ? `Create text file ${fileName} in ${baseLocation}`
          : `Create text file ${fileName}`,
        action: "create_text_file",
        input: {
          fileName,
          baseLocation,
        },
        risk: "approval_required",
      },
    ],
    context: {
      fileName,
      baseLocation,
    },
  });
}

function createAppendTextToActiveFileTask(
  message: string,
  filePath: string,
  text: string
) {
  return createExecutionTask({
    category: "system_operation",
    input: message,
    goal: "Append text to active file",
    steps: [
      {
        kind: "file",
        label: "Append text to active file",
        action: "append_text_file",
        input: {
          path: filePath,
          text,
          newlineBefore: true,
        },
        risk: "approval_required",
      },
    ],
    context: {
      selectedFilePath: filePath,
      textToAppend: text,
    },
  });
}

function createOpenAppTask(message: string, appName: string) {
  return createExecutionTask({
    category: "system_operation",
    input: message,
    goal: `Open ${appName}`,
    steps: [
      {
        kind: "app",
        label: `Open ${appName}`,
        action: "open_app",
        input: {
          appName,
        },
        risk: "notice",
      },
    ],
    context: {
      appName,
    },
  });
}

function createReadSelectedFileTask(message: string, path: string) {
  return createExecutionTask({
    category: "follow_up",
    input: message,
    goal: "Read selected file",
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
    goal: "Open selected file",
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

function createOpenSelectedFolderTask(message: string, folderPath: string) {
  return createExecutionTask({
    category: "follow_up",
    input: message,
    goal: "Open selected folder",
    steps: [
      {
        kind: "file",
        label: "Open selected folder",
        action: "open_folder",
        input: {
          path: folderPath,
        },
        risk: "notice",
      },
    ],
    context: {
      selectedFolderPath: folderPath,
    },
  });
}

function createOpenContainingFolderTask(message: string, filePath: string) {
  return createExecutionTask({
    category: "follow_up",
    input: message,
    goal: "Reveal selected file location",
    steps: [
      {
        kind: "file",
        label: "Reveal selected file location",
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

function createOpenUrlTask(message: string, url: string) {
  return createExecutionTask({
    category: "system_operation",
    input: message,
    goal: `Open URL ${url}`,
    steps: [
      {
        kind: "system",
        label: `Open URL ${url}`,
        action: "open_url",
        input: {
          url,
        },
        risk: "notice",
      },
    ],
    context: {
      url,
    },
  });
}

function createRenameActivePathTask(
  message: string,
  currentPath: string,
  newName: string
) {
  return createExecutionTask({
    category: "system_operation",
    input: message,
    goal: `Rename active object to ${newName}`,
    steps: [
      {
        kind: "file",
        label: `Rename active object to ${newName}`,
        action: "rename_path",
        input: {
          currentPath,
          newName,
        },
        risk: "approval_required",
      },
    ],
    context: {
      currentPath,
      newName,
    },
  });
}

function createListDirectoryTask(
  message: string,
  pathValue?: string,
  baseLocation?: "desktop" | "downloads" | "documents"
) {
  return createExecutionTask({
    category: "system_operation",
    input: message,
    goal: baseLocation ? `List ${baseLocation}` : "List directory",
    steps: [
      {
        kind: "file",
        label: baseLocation ? `List ${baseLocation}` : "List directory",
        action: "list_directory",
        input: {
          path: pathValue,
          baseLocation,
          maxResults: 50,
        },
        risk: "safe",
      },
    ],
    context: {
      selectedFolderPath: pathValue,
      baseLocation,
    },
  });
}

function createPathInfoTask(message: string, pathValue: string) {
  return createExecutionTask({
    category: "system_operation",
    input: message,
    goal: "Show path info",
    steps: [
      {
        kind: "file",
        label: "Show path info",
        action: "get_path_info",
        input: {
          path: pathValue,
        },
        risk: "safe",
      },
    ],
    context: {
      selectedFilePath: pathValue,
    },
  });
}

function createCopyActivePathTask(
  message: string,
  sourcePath: string,
  baseLocation?: "desktop" | "downloads" | "documents"
) {
  return createExecutionTask({
    category: "system_operation",
    input: message,
    goal: baseLocation ? `Copy active object to ${baseLocation}` : "Copy active object",
    steps: [
      {
        kind: "file",
        label: baseLocation ? `Copy active object to ${baseLocation}` : "Copy active object",
        action: "copy_path",
        input: {
          sourcePath,
          baseLocation,
        },
        risk: "approval_required",
      },
    ],
    context: {
      sourcePath,
      baseLocation,
    },
  });
}

function createMoveActivePathTask(
  message: string,
  sourcePath: string,
  baseLocation: "desktop" | "downloads" | "documents"
) {
  return createExecutionTask({
    category: "system_operation",
    input: message,
    goal: `Move active object to ${baseLocation}`,
    steps: [
      {
        kind: "file",
        label: `Move active object to ${baseLocation}`,
        action: "move_path",
        input: {
          sourcePath,
          baseLocation,
        },
        risk: "approval_required",
      },
    ],
    context: {
      sourcePath,
      baseLocation,
    },
  });
}

export function buildExecutionTaskFromMessage(
  message: string,
  options: BuildExecutionTaskOptions = {}
): ExecutionTask | null {
  const previousState = options.previousState;

  const target = extractTarget(message);

  const selectedFilePath =
    previousState?.selectedFilePath ?? previousState?.lastCreatedFilePath ?? previousState?.lastReadFilePath;

  const selectedFolderPath =
    previousState?.selectedFolderPath ?? previousState?.lastCreatedFolderPath;

  if (wantsApprovalTest(message)) {
    return createApprovalTestTask(message);
  }

  if (wantsResetExecutionState(message)) {
    return createResetExecutionStateTask(message);
  }

  if (wantsActiveObjectSummary(message)) {
    return createActiveObjectSummaryTask(message);
  }

  if (wantsSummarizeLastRead(message)) {
    return createSummarizeLastReadTask(message);
  }

  if (wantsExecutionSummary(message)) {
    return createExecutionSummaryTask(message);
  }

  if (wantsSystemStatus(message)) {
    return createSystemStatusTask(message);
  }

  if (wantsCreateFolder(message)) {
    const folderName = extractFolderName(message);
    const baseLocation = extractBaseLocation(message);

    if (folderName.length > 0) {
      return createCreateFolderTask(message, folderName, baseLocation);
    }
  }

  if (wantsCreateTextFile(message)) {
    const fileName = extractTextFileName(message);
    const baseLocation = extractBaseLocation(message);

    if (fileName.length > 0) {
      return createCreateTextFileTask(message, fileName, baseLocation);
    }
  }

  if (wantsAppendTextToActiveFile(message) && selectedFilePath) {
    const text = extractTextToAppend(message);

    if (text.length > 0) {
      return createAppendTextToActiveFileTask(message, selectedFilePath, text);
    }
  }

  if (wantsOpenUrl(message)) {
    const url = extractUrl(message);
  
    if (url.length > 0) {
      return createOpenUrlTask(message, url);
    }
  }
  
  if (wantsRenameActiveObject(message)) {
    const newName = extractRenameTargetName(message);
    const wantsFolderRename = normalizeMessage(message).includes("folder");
  
    const activePath = wantsFolderRename
      ? selectedFolderPath
      : selectedFilePath ?? selectedFolderPath;
  
    if (newName.length > 0 && activePath) {
      return createRenameActivePathTask(message, activePath, newName);
    }
  }
  
  if (wantsListDirectory(message)) {
    const baseLocation = extractListBaseLocation(message);
  
    if (baseLocation) {
      return createListDirectoryTask(message, undefined, baseLocation);
    }
  
    if (selectedFolderPath) {
      return createListDirectoryTask(message, selectedFolderPath);
    }
  
    if (selectedFilePath) {
      return createListDirectoryTask(message, undefined);
    }
  }
  
  if (wantsPathInfo(message)) {
    const activePath = selectedFilePath ?? selectedFolderPath;
  
    if (activePath) {
      return createPathInfoTask(message, activePath);
    }
  }
  
  if (wantsCopyActiveObject(message)) {
    const destination = extractDestinationLocation(message);
    const activePath = selectedFilePath ?? selectedFolderPath;
  
    if (activePath) {
      return createCopyActivePathTask(message, activePath, destination);
    }
  }
  
  if (wantsMoveActiveObject(message)) {
    const destination = extractDestinationLocation(message);
    const activePath = selectedFilePath ?? selectedFolderPath;
  
    if (activePath && destination) {
      return createMoveActivePathTask(message, activePath, destination);
    }
  }

  if (wantsOpenFolder(message) && selectedFilePath) {
    return createOpenContainingFolderTask(message, selectedFilePath);
  }

  if (isItFollowUp(message)) {
    if (wantsOpen(message)) {
      const lastTask = previousState?.lastTask;
      const lastTaskContext = lastTask?.context;
  
      const lastCreatedFolderPath =
        lastTaskContext && typeof lastTaskContext.createdFolderPath === "string"
          ? lastTaskContext.createdFolderPath
          : undefined;
  
      const lastRenamedFolderPath =
        lastTaskContext &&
        typeof lastTaskContext.lastRenamedFolderPath === "string"
          ? lastTaskContext.lastRenamedFolderPath
          : undefined;
  
      const lastCopiedFolderPath =
        lastTaskContext &&
        typeof lastTaskContext.lastCopiedFolderPath === "string"
          ? lastTaskContext.lastCopiedFolderPath
          : undefined;
  
      const lastMovedFolderPath =
        lastTaskContext &&
        typeof lastTaskContext.lastMovedFolderPath === "string"
          ? lastTaskContext.lastMovedFolderPath
          : undefined;
  
      const lastCreatedFilePath =
        lastTaskContext && typeof lastTaskContext.createdFilePath === "string"
          ? lastTaskContext.createdFilePath
          : undefined;
  
      const lastAppendedFilePath =
        lastTaskContext && typeof lastTaskContext.appendedFilePath === "string"
          ? lastTaskContext.appendedFilePath
          : undefined;
  
      const lastRenamedFilePath =
        lastTaskContext && typeof lastTaskContext.lastRenamedFilePath === "string"
          ? lastTaskContext.lastRenamedFilePath
          : undefined;
  
      const lastCopiedFilePath =
        lastTaskContext && typeof lastTaskContext.lastCopiedFilePath === "string"
          ? lastTaskContext.lastCopiedFilePath
          : undefined;
  
      const lastMovedFilePath =
        lastTaskContext && typeof lastTaskContext.lastMovedFilePath === "string"
          ? lastTaskContext.lastMovedFilePath
          : undefined;
  
      const lastTaskWasFolder =
        lastTask?.goal.toLowerCase().includes("folder") ||
        Boolean(
          lastCreatedFolderPath ||
            lastRenamedFolderPath ||
            lastCopiedFolderPath ||
            lastMovedFolderPath
        );
  
      if (lastTaskWasFolder) {
        const folderPath =
          lastRenamedFolderPath ??
          lastMovedFolderPath ??
          lastCopiedFolderPath ??
          lastCreatedFolderPath ??
          selectedFolderPath;
  
        if (folderPath) {
          return createOpenSelectedFolderTask(message, folderPath);
        }
      }
  
      const filePath =
        lastRenamedFilePath ??
        lastMovedFilePath ??
        lastCopiedFilePath ??
        lastAppendedFilePath ??
        lastCreatedFilePath ??
        selectedFilePath;
  
      if (filePath) {
        return createOpenSelectedFileTask(message, filePath);
      }
  
      if (selectedFolderPath) {
        return createOpenSelectedFolderTask(message, selectedFolderPath);
      }
    }
  
    if (wantsRead(message) && selectedFilePath) {
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

  if (wantsOpenApp(message)) {
    const appName = extractAppName(message);

    const knownAppAliases = [
      "spotify",
      "chrome",
      "discord",
      "vscode",
      "vs code",
      "visual studio code",
      "notepad",
      "calculator",
      "calc",
      "steam",
      "opera",
      "opera gx",
      "browser",
    ];

    if (knownAppAliases.includes(appName.toLowerCase())) {
      return createOpenAppTask(message, appName);
    }
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