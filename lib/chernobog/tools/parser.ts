import os from "node:os";
import path from "node:path";
import { ParsedToolCommand } from "./types";

function normalizeMessage(message: string) {
  return message.trim().replace(/\s+/g, " ");
}

function stripQuotes(value: string) {
  return value.trim().replace(/^["']|["']$/g, "");
}

function resolveSpecialFolder(name: string): string | null {
  const home = os.homedir();
  const key = name.trim().toLowerCase();

  switch (key) {
    case "desktop":
      return path.join(home, "Desktop");
    case "downloads":
    case "download":
      return path.join(home, "Downloads");
    case "documents":
    case "document":
      return path.join(home, "Documents");
    case "pictures":
    case "images":
      return path.join(home, "Pictures");
    default:
      return null;
  }
}

export function parseToolCommand(message: string): ParsedToolCommand | null {
  const normalized = normalizeMessage(message);
  const lower = normalized.toLowerCase();

  if (
    lower === "what time is it" ||
    lower === "time" ||
    lower === "current time" ||
    lower === "what's the time" ||
    lower === "whats the time" ||
    lower === "what is the current time"
  ) {
    return {
      tool: "get_time",
      input: {},
    };
  }

  const openUrlMatch = normalized.match(
    /^(?:open|launch|go to|visit)\s+(https?:\/\/\S+)$/i
  );
  if (openUrlMatch) {
    return {
      tool: "open_url",
      input: {
        url: openUrlMatch[1],
      },
    };
  }

  const openAppMatch = normalized.match(/^(?:open|launch|start)\s+(.+)$/i);
  if (openAppMatch) {
    const candidate = stripQuotes(openAppMatch[1]);

    if (/^https?:\/\//i.test(candidate)) {
      return {
        tool: "open_url",
        input: {
          url: candidate,
        },
      };
    }

    return {
      tool: "open_app",
      input: {
        appName: candidate,
      },
    };
  }

  const listFilesMatch = normalized.match(
    /^(?:list files|show files|list contents|show contents)(?:\s+in\s+(.+))?$/i
  );
  if (listFilesMatch) {
    const rawPath = stripQuotes(listFilesMatch[1] ?? "Downloads");
    const resolved = resolveSpecialFolder(rawPath) ?? rawPath;

    return {
      tool: "list_files",
      input: {
        path: resolved,
      },
    };
  }

  const readFileMatch = normalized.match(
    /^(?:read file|read text file|open file|show file)\s+(.+)$/i
  );
  if (readFileMatch) {
    const rawPath = stripQuotes(readFileMatch[1]);
    const resolved = resolveSpecialFolder(rawPath) ?? rawPath;

    return {
      tool: "read_text_file",
      input: {
        path: resolved,
      },
    };
  }

  function normalizeSearchQuery(value: string) {
    return stripQuotes(value)
      .replace(/\b(file|files|folder|folders)\b/gi, "")
      .trim();
  }

  const findFilesMatch = normalized.match(
    /^(?:find file|find files|search files for|search for file|search for files)\s+(.+)$/i
  );
  if (findFilesMatch) {
    const query = normalizeSearchQuery(findFilesMatch[1]);

    if (!query) {
      return null;
    }

    return {
      tool: "find_files",
      input: {
        query,
      },
    };
  }

  const vagueReadMatch = normalized.match(
    /^(?:read|open|show me|show)\s+my\s+(.+?)(?:\s+file|\s+document|\s+doc)?$/i
  );
  if (vagueReadMatch) {
    const rawPath = stripQuotes(vagueReadMatch[1]).trim();

    if (rawPath) {
      return {
        tool: "read_text_file",
        input: {
          path: rawPath,
        },
      };
    }
  }

  return null;
}