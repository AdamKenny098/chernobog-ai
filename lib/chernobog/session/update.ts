import path from "node:path";
import { SessionContext } from "./types";

type ToolResult =
  | { ok: true; tool: string; data: unknown }
  | { ok: false; tool: string; error: string };

function nowIso() {
  return new Date().toISOString();
}

function buildPreview(content: string, maxChars = 180): string {
  const trimmed = content.trim().replace(/\s+/g, " ");
  return trimmed.length > maxChars ? `${trimmed.slice(0, maxChars)}...` : trimmed;
}

export function updateSessionAfterRoute(
  session: SessionContext,
  route: SessionContext["lastRoute"]
): void {
  session.lastRoute = route;
}

export function updateSessionFromToolResult(
  session: SessionContext,
  toolName: string,
  input: unknown,
  result: ToolResult
): void {
  session.lastRoute = "tools";
  session.lastTool = {
    name: toolName,
    input,
    success: result.ok,
    summary: result.ok ? `Tool ${toolName} executed successfully.` : `Tool ${toolName} failed.`,
    timestamp: nowIso(),
  };

  if (!session.fileContext) {
    session.fileContext = {};
  }

  if (!result.ok) {
    session.lastToolResult = {
      kind: "generic",
      summary: result.error,
    };
    return;
  }

  switch (toolName) {
    case "find_files": {
      const data = result.data as {
        root: string;
        query: string;
        matches: { path: string; name: string; extension?: string }[];
      };

      session.lastToolResult = {
        kind: "file_search",
        summary: `Found ${data.matches.length} file(s) for "${data.query}".`,
      };

      session.fileContext.lastSearch = {
        query: data.query,
        root: data.root,
        normalizedRoot: data.root,
        offset: 0,
        pageSize: 5,
        timestamp: nowIso(),
        results: data.matches.map((match, idx) => ({
          index: idx + 1,
          path: match.path,
          name: match.name,
          extension: match.extension,
          parentDir: path.dirname(match.path),
        })),
      };

      session.fileContext.lastSelected = undefined;
      return;
    }

    case "read_text_file": {
      const data = result.data as {
        path: string;
        content: string;
        truncated: boolean;
      };

      session.lastToolResult = {
        kind: "file_read",
        summary: `Read ${data.path}.`,
      };

      session.fileContext.lastRead = {
        path: data.path,
        preview: buildPreview(data.content),
        timestamp: nowIso(),
      };

      session.fileContext.lastSelected = {
        source: "recent_read",
        path: data.path,
        timestamp: nowIso(),
      };
      return;
    }

    default: {
      session.lastToolResult = {
        kind: "generic",
        summary: `Executed ${toolName}.`,
      };
    }
  }
}

export function setSelectedFileFromPath(
  session: SessionContext,
  source: "search_result" | "explicit_path" | "recent_read",
  filePath: string
): void {
  if (!session.fileContext) session.fileContext = {};

  session.fileContext.lastSelected = {
    source,
    path: filePath,
    timestamp: nowIso(),
  };
}