import path from "node:path";
import type {
  FileCandidate,
  FileWorkflowState,
} from "@/lib/chernobog/pipeline/types";
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

function createEmptyFileWorkflow(): FileWorkflowState {
  return {
    kind: "file",
    step: "idle",
    query: null,
    root: null,
    candidates: [],
    selectedCandidateId: null,
    readCandidateId: null,
    awaitingDisambiguation: false,
    lastAction: null,
    lastUserReference: null,
    error: null,
  };
}

function ensureFileWorkflow(session: SessionContext): FileWorkflowState {
  if (session.workflow.kind !== "file") {
    session.workflow = createEmptyFileWorkflow();
  }

  return session.workflow;
}

function buildCandidatesFromMatches(
  matches: { path: string; name: string; extension?: string }[]
): FileCandidate[] {
  return matches.map((match) => ({
    id: match.path,
    label: match.name,
    path: match.path,
    metadata: {
      extension: match.extension,
      parentDir: path.dirname(match.path),
    },
  }));
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
  };

  if (!session.fileContext) {
    session.fileContext = {};
  }

  if (!result.ok) {
    session.lastToolResult = {
      ok: false,
      summary: result.error,
    };

    if (session.workflow.kind === "file") {
      session.workflow = {
        ...session.workflow,
        step: "failed",
        error: result.error,
      };
    }

    return;
  }

  switch (toolName) {
    case "find_files": {
      const data = result.data as {
        root: string;
        query: string;
        matches: { path: string; name: string; extension?: string }[];
      };

      const candidates = buildCandidatesFromMatches(data.matches);
      const workflow = ensureFileWorkflow(session);

      session.lastToolResult = {
        ok: true,
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

      session.workflow = {
        ...workflow,
        step:
          candidates.length === 0
            ? "completed"
            : candidates.length === 1
              ? "selected"
              : "awaiting_selection",
        query: data.query,
        root: data.root,
        candidates,
        selectedCandidateId: candidates.length === 1 ? candidates[0].id : null,
        readCandidateId: null,
        awaitingDisambiguation: candidates.length > 1,
        lastAction: "search",
        lastUserReference: null,
        error: null,
      };

      return;
    }

    case "read_text_file": {
      const data = result.data as {
        path: string;
        content: string;
        truncated: boolean;
      };

      const workflow = ensureFileWorkflow(session);
      const existingCandidate = workflow.candidates.find(
        (candidate) => candidate.path === data.path || candidate.id === data.path
      );

      const candidateId = existingCandidate?.id ?? data.path;

      session.lastToolResult = {
        ok: true,
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

      session.workflow = {
        ...workflow,
        step: "completed",
        selectedCandidateId: candidateId,
        readCandidateId: candidateId,
        awaitingDisambiguation: false,
        lastAction: "read",
        error: null,
        candidates: existingCandidate
          ? workflow.candidates
          : [
              ...workflow.candidates,
              {
                id: data.path,
                label: path.basename(data.path),
                path: data.path,
                metadata: {
                  parentDir: path.dirname(data.path),
                },
              },
            ],
      };

      return;
    }

    default: {
      session.lastToolResult = {
        ok: true,
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
  if (!session.fileContext) {
    session.fileContext = {};
  }

  session.fileContext.lastSelected = {
    source,
    path: filePath,
    timestamp: nowIso(),
  };

  if (session.workflow.kind === "file") {
    const existingCandidate = session.workflow.candidates.find(
      (candidate) => candidate.path === filePath || candidate.id === filePath
    );

    session.workflow = {
      ...session.workflow,
      step: "selected",
      selectedCandidateId: existingCandidate?.id ?? filePath,
      awaitingDisambiguation: false,
      lastAction: "select",
      error: null,
      candidates: existingCandidate
        ? session.workflow.candidates
        : [
            ...session.workflow.candidates,
            {
              id: filePath,
              label: path.basename(filePath),
              path: filePath,
              metadata: {
                parentDir: path.dirname(filePath),
              },
            },
          ],
    };
  }
}