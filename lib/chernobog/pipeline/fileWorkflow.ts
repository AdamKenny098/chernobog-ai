import type {
    FileCandidate,
    FileSelectionReference,
    FileWorkflowIntent,
    FileWorkflowState,
    WorkflowState,
  } from "./types";
  
  export function createFileWorkflow(
    overrides: Partial<FileWorkflowState> = {}
  ): FileWorkflowState {
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
      ...overrides,
    };
  }
  
  export function isFileWorkflow(workflow: WorkflowState): workflow is FileWorkflowState {
    return workflow.kind === "file";
  }

  type FindFilesResultData = {
    root: string;
    query: string;
    matches: {
      path: string;
      name: string;
      extension: string;
    }[];
  };
  
  export function buildCandidatesFromFindFiles(
    data: FindFilesResultData
  ): FileCandidate[] {
    return data.matches.map((match) => ({
      id: match.path,
      label: match.name,
      path: match.path,
      metadata: {
        extension: match.extension,
      },
    }));
  }

  export function resolveOrdinalReference(message: string): FileSelectionReference | null {
    const lower = message.toLowerCase();
  
    const ordinalMatch = lower.match(/\b(\d+)(?:st|nd|rd|th)?\b/);
    if (ordinalMatch) {
      return {
        mode: "ordinal",
        ordinal: Number(ordinalMatch[1]),
      };
    }
  
    if (/\bfirst\b/.test(lower)) return { mode: "relative", value: "first" };
    if (/\blast\b/.test(lower)) return { mode: "relative", value: "last" };
    if (/\bnext\b/.test(lower)) return { mode: "relative", value: "next" };
    if (/\bprevious\b|\bprev\b/.test(lower)) return { mode: "relative", value: "previous" };
  
    return null;
  }
  export function resolveCandidateFromReference(
    workflow: FileWorkflowState,
    reference: FileSelectionReference
  ): FileCandidate | null {
    const candidates = workflow.candidates;
  
    if (candidates.length === 0) return null;
  
    if (reference.mode === "candidateId") {
      return candidates.find((candidate) => candidate.id === reference.candidateId) ?? null;
    }
  
    if (reference.mode === "label") {
      const lower = reference.label.toLowerCase();
      return (
        candidates.find((candidate) => candidate.label.toLowerCase().includes(lower)) ?? null
      );
    }
  
    if (reference.mode === "ordinal") {
      const index = reference.ordinal - 1;
      return candidates[index] ?? null;
    }
  
    if (reference.mode === "relative") {
      if (reference.value === "first") return candidates[0] ?? null;
      if (reference.value === "last") return candidates[candidates.length - 1] ?? null;
  
      const selectedIndex = candidates.findIndex(
        (candidate) => candidate.id === workflow.selectedCandidateId
      );
  
      if (selectedIndex === -1) return null;
  
      if (reference.value === "next") {
        return candidates[selectedIndex + 1] ?? null;
      }
  
      if (reference.value === "previous") {
        return candidates[selectedIndex - 1] ?? null;
      }
    }
  
    return null;
  }

  export function detectFileWorkflowIntent(
    message: string,
    workflow: WorkflowState
  ): FileWorkflowIntent {
    const lower = message.trim().toLowerCase();
  
    if (!isFileWorkflow(workflow)) {
      return { kind: "none" };
    }
  
    if (/\bsearch\b.+\binstead\b/.test(lower) || /\binstead\b/.test(lower)) {
      const rootMatch = lower.match(/\b(desktop|documents|downloads|pictures|music|videos)\b/);
      if (rootMatch) {
        return { kind: "change_root", root: rootMatch[1] };
      }
    }
  
    if (/^(read|open)\s+(the\s+)?(first|last|\d+(?:st|nd|rd|th)?)(\s+one)?/.test(lower)) {
      const reference = resolveOrdinalReference(lower);
      if (!reference) return { kind: "none" };
  
      if (lower.startsWith("read")) {
        return { kind: "read_selection", reference };
      }
  
      if (lower.startsWith("open")) {
        return { kind: "open_selection", reference };
      }
    }
  
    if (/^(read|open)\s+it\b/.test(lower)) {
      return lower.startsWith("read")
        ? { kind: "read_selected" }
        : { kind: "open_selected" };
    }
  
    if (/^(select|choose)\s+/.test(lower)) {
      const reference = resolveOrdinalReference(lower);
      if (reference) {
        return { kind: "select", reference };
      }
    }
  
    const bareReference = resolveOrdinalReference(lower);
    if (bareReference && workflow.candidates.length > 0) {
      return { kind: "select", reference: bareReference };
    }
  
    return { kind: "none" };
  }

  export function beginFileSearch(query: string, root: string | null): FileWorkflowState {
    return createFileWorkflow({
      step: "searching",
      query,
      root,
      candidates: [],
      selectedCandidateId: null,
      readCandidateId: null,
      awaitingDisambiguation: false,
      lastAction: "search",
      error: null,
    });
  }

  export function applyFindFilesResult(
    workflow: FileWorkflowState,
    data: FindFilesResultData
  ): FileWorkflowState {
    const candidates = buildCandidatesFromFindFiles(data);
  
    return {
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
      awaitingDisambiguation: candidates.length > 1,
      error: null,
    };
  }

  export function applySelectedCandidate(
    workflow: FileWorkflowState,
    candidateId: string,
    reference?: FileSelectionReference
  ): FileWorkflowState {
    return {
      ...workflow,
      step: "selected",
      selectedCandidateId: candidateId,
      awaitingDisambiguation: false,
      lastAction: "select",
      lastUserReference: reference ?? null,
      error: null,
    };
  }

  export function applyReadCandidate(
    workflow: FileWorkflowState,
    candidateId: string
  ): FileWorkflowState {
    return {
      ...workflow,
      step: "completed",
      selectedCandidateId: candidateId,
      readCandidateId: candidateId,
      awaitingDisambiguation: false,
      lastAction: "read",
      error: null,
    };
  }

  export function applyWorkflowError(
    workflow: FileWorkflowState,
    error: string
  ): FileWorkflowState {
    return {
      ...workflow,
      step: "failed",
      error,
    };
  }

  import type { SessionContext } from "@/lib/chernobog/session/types";

export function resolveWorkflowSelectedPath(session: SessionContext): string | null {
  if (session.workflow.kind !== "file") return null;

  const workflow = session.workflow;

  const selected = workflow.candidates.find(
    (candidate) => candidate.id === workflow.selectedCandidateId
  );
  if (selected?.path) return selected.path;

  const read = workflow.candidates.find(
    (candidate) => candidate.id === workflow.readCandidateId
  );
  if (read?.path) return read.path;

  if (workflow.candidates.length === 1) {
    return workflow.candidates[0].path ?? workflow.candidates[0].id;
  }

  return null;
}

export function resolveWorkflowCandidatePathByOrdinal(
  session: SessionContext,
  ordinal: number
): string | null {
  if (session.workflow.kind !== "file") return null;

  const workflow = session.workflow;
  if (workflow.candidates.length === 0) return null;

  if (ordinal === -1) {
    const last = workflow.candidates[workflow.candidates.length - 1];
    return last?.path ?? last?.id ?? null;
  }

  const candidate = workflow.candidates[ordinal - 1];
  return candidate?.path ?? candidate?.id ?? null;
}