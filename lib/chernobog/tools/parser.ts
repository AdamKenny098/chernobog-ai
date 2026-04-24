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
    case "my desktop":
    case "the desktop":
      return path.join(home, "Desktop");

    case "downloads":
    case "download":
    case "my downloads":
    case "the downloads folder":
      return path.join(home, "Downloads");

    case "documents":
    case "document":
    case "my documents":
    case "the documents folder":
      return path.join(home, "Documents");

    case "pictures":
    case "images":
    case "my pictures":
      return path.join(home, "Pictures");

    default:
      return null;
  }
}

function normalizeSearchQuery(value: string) {
  return stripQuotes(value)
    .replace(/\b(file|files|folder|folders|document|documents|doc)\b/gi, "")
    .trim();
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

  const containingFolderMatch = normalized.match(
    /^(?:open|show|launch)(?:\s+me)?\s+(?:the\s+)?containing\s+folder(?:\s+(?:for|of)\s+(.+))?$/i
  );
  if (containingFolderMatch) {
    const rawPath = stripQuotes(containingFolderMatch[1] ?? "");
    if (rawPath) {
      const resolved = resolveSpecialFolder(rawPath) ?? rawPath;
      return {
        tool: "open_folder",
        input: {
          path: resolved,
        },
      };
    }

    return null;
  }

  const openFolderMatch = normalized.match(
    /^(?:open|show|launch)(?:\s+me)?\s+(?:the\s+)?(?:folder|directory)(?:\s+(?:for|of|in))?\s+(.+)$/i
  );
  if (openFolderMatch) {
    const rawPath = stripQuotes(openFolderMatch[1]);
    const resolved = resolveSpecialFolder(rawPath) ?? rawPath;

    return {
      tool: "open_folder",
      input: {
        path: resolved,
      },
    };
  }

  const bareFolderAliasMatch = normalized.match(
    /^(?:open|show|launch)(?:\s+me)?\s+(my\s+desktop|desktop|my\s+downloads|downloads|download|my\s+documents|documents|document|my\s+pictures|pictures|images)$/i
  );
  if (bareFolderAliasMatch) {
    const resolved = resolveSpecialFolder(bareFolderAliasMatch[1]);
    if (resolved) {
      return {
        tool: "open_folder",
        input: {
          path: resolved,
        },
      };
    }
  }

  const openFileMatch = normalized.match(
    /^(?:open file|launch file|open|launch)\s+(.+\.[a-zA-Z0-9]{1,10})$/i
  );
  if (openFileMatch) {
    const rawPath = stripQuotes(openFileMatch[1]);
    const resolved = resolveSpecialFolder(rawPath) ?? rawPath;

    return {
      tool: "open_file",
      input: {
        path: resolved,
      },
    };
  }

  const readFileMatch = normalized.match(
    /^(?:read file|read text file|show file|read|show)\s+(.+\.[a-zA-Z0-9]{1,10})$/i
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

  const findFilesMatch = normalized.match(
    /^(?:find file|find files|search files for|search for file|search for files|look for file|look for files)\s+(.+)$/i
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
    /^(?:read|show me|show)\s+my\s+(.+?)(?:\s+file|\s+document|\s+doc)?$/i
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