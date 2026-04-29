// lib/chernobog/execution/internalExecutionHandlers.ts
import os from "node:os";
import { ExecutionState, getExecutionStateSummary } from "./executionState";
import { ExecutionActionHandler } from "./runExecutionTask";

export interface InternalExecutionHandlerOptions {
  previousState: ExecutionState;
}

function extractText(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const possibleKeys = ["text", "content", "contents", "body", "data"];

  for (const key of possibleKeys) {
    if (
      key in value &&
      typeof value[key as keyof typeof value] === "string" &&
      (value[key as keyof typeof value] as string).trim().length > 0
    ) {
      return value[key as keyof typeof value] as string;
    }
  }

  return null;
}

function createSimpleSummary(text: string) {
  const cleaned = text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");

  if (cleaned.length <= 700) {
    return cleaned;
  }

  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentences.length === 0) {
    return `${cleaned.slice(0, 700)}...`;
  }

  const selected = sentences.slice(0, 5).join(" ");

  if (selected.length > 900) {
    return `${selected.slice(0, 900)}...`;
  }

  return selected;
}

function formatBytes(bytes: number) {
    const gb = bytes / 1024 / 1024 / 1024;
    return `${gb.toFixed(2)} GB`;
  }
  
  function getSystemStatusSummary() {
    const uptimeSeconds = os.uptime();
    const uptimeHours = uptimeSeconds / 60 / 60;
  
    const now = new Date();
  
    return [
      "System status:",
      `Time: ${now.toLocaleString()}`,
      `Platform: ${process.platform}`,
      `Architecture: ${process.arch}`,
      `Hostname: ${os.hostname()}`,
      `CPU: ${os.cpus()[0]?.model ?? "Unknown CPU"}`,
      `CPU cores: ${os.cpus().length}`,
      `Memory: ${formatBytes(os.freemem())} free / ${formatBytes(os.totalmem())} total`,
      `System uptime: ${uptimeHours.toFixed(1)} hours`,
      `Node version: ${process.version}`,
    ].join("\n");
  }

  function getActiveObjectSummary(state: ExecutionState) {
    const lines: string[] = ["Active execution object:"];
  
    if (state.selectedFilePath) {
      lines.push(`Selected file: ${state.selectedFilePath}`);
    }
  
    if (state.selectedFolderPath) {
      lines.push(`Selected folder: ${state.selectedFolderPath}`);
    }
  
    if (state.lastReadFilePath) {
      lines.push(`Last read file: ${state.lastReadFilePath}`);
    }
  
    if (state.lastCreatedFilePath) {
      lines.push(`Last created file: ${state.lastCreatedFilePath}`);
    }
  
    if (state.lastAppendedFilePath) {
      lines.push(`Last appended file: ${state.lastAppendedFilePath}`);
    }
  
    if (state.lastCreatedFolderPath) {
      lines.push(`Last created folder: ${state.lastCreatedFolderPath}`);
    }
  
    if (state.lastOpenedApp) {
      lines.push(`Last opened app: ${JSON.stringify(state.lastOpenedApp)}`);
    }
  
    if (state.lastSystemStatus) {
      lines.push("Last system status: available");
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
  
    if (lines.length === 1) {
      lines.push("No active execution object is currently selected.");
    }
  
    return lines.join("\n");
  }

export function createInternalExecutionHandlers(
  options: InternalExecutionHandlerOptions
): Record<string, ExecutionActionHandler> {
  const { previousState } = options;

  return {
    async "execution.summary"() {
      const summary = getExecutionStateSummary(previousState);

      return {
        success: true,
        output: summary,
        context: {
          summary,
        },
      };
    },

    async "execution.summarizeLastRead"() {
      const text = extractText(previousState.lastReadText);

      if (!text) {
        return {
          success: false,
          error: "There is no previously read text available to summarize.",
        };
      }

      const summary = createSimpleSummary(text);

      return {
        success: true,
        output: summary,
        context: {
          summary,
        },
      };
    },

    async "execution.approvalTest"() {
      return {
        success: true,
        output: "Approval flow completed successfully.",
        context: {
          summary: "Approval flow completed successfully.",
        },
      };
    },

    async "system.status"() {
        const summary = getSystemStatusSummary();
      
        return {
          success: true,
          output: summary,
          context: {
            summary,
            systemStatus: {
              platform: process.platform,
              arch: process.arch,
              hostname: os.hostname(),
              freeMemory: os.freemem(),
              totalMemory: os.totalmem(),
              uptime: os.uptime(),
              nodeVersion: process.version,
            },
          },
        };
      },

      async "execution.resetState"() {
        return {
          success: true,
          output: "Execution state reset.",
          context: {
            resetExecutionState: true,
            summary: "Execution state reset.",
          },
        };
      },
      
      async "execution.activeObjectSummary"() {
        const summary = getActiveObjectSummary(previousState);
      
        return {
          success: true,
          output: summary,
          context: {
            summary,
          },
        };
      },
  };
}