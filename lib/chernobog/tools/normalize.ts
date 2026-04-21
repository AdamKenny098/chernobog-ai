import os from "node:os";
import path from "node:path";
import { ParsedToolCommand } from "./types";
import { ToolIntent } from "./intent";

type ExecutableToolCall = Exclude<ToolIntent, { tool: "none" }> | ParsedToolCommand;

function normalizeFolderPath(rawPath: string): string {
  const trimmed = rawPath.trim().replace(/^["']|["']$/g, "");
  const lower = trimmed.toLowerCase();

  const home = os.homedir();

  if (
    lower === "desktop" ||
    lower === "my desktop" ||
    lower === "the desktop" ||
    lower === "on my desktop"
  ) {
    return path.join(home, "Desktop");
  }

  if (
    lower === "downloads" ||
    lower === "my downloads" ||
    lower === "the downloads folder" ||
    lower === "my downloads folder"
  ) {
    return path.join(home, "Downloads");
  }

  if (
    lower === "documents" ||
    lower === "my documents" ||
    lower === "the documents folder" ||
    lower === "my documents folder"
  ) {
    return path.join(home, "Documents");
  }

  return trimmed;
}

function normalizeAppName(rawAppName: string): string {
    const value = rawAppName.trim().toLowerCase();
  
    if (
      value === "browser" ||
      value === "my browser" ||
      value === "web browser" ||
      value === "internet browser" ||
      value === "default browser"
    ) {
      return "opera gx";
    }
  
    return rawAppName.trim();
  }

  export function normalizeToolCall<T extends ExecutableToolCall>(toolCall: T): T {
    switch (toolCall.tool) {
      case "open_app":
        return {
          ...toolCall,
          input: {
            ...toolCall.input,
            appName: normalizeAppName(toolCall.input.appName),
          },
        } as T;
  
      case "list_files":
        return {
          ...toolCall,
          input: {
            ...toolCall.input,
            path: normalizeFolderPath(toolCall.input.path),
          },
        } as T;
  
      case "read_text_file":
        return {
          ...toolCall,
          input: {
            ...toolCall.input,
            path: normalizeFolderPath(toolCall.input.path),
          },
        } as T;
  
      case "find_files":
        return {
          ...toolCall,
          input: {
            ...toolCall.input,
            query: toolCall.input.query.trim(),
            root: toolCall.input.root
              ? normalizeFolderPath(toolCall.input.root)
              : toolCall.input.root,
          },
        } as T;
  
      default:
        return toolCall;
    }
  }