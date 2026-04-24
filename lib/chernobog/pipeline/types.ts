import type { RouteName } from "@/lib/chernobog/session/types";

export type WorkflowKind = "none" | "file";

export type FileWorkflowStep =
  | "idle"
  | "searching"
  | "awaiting_selection"
  | "selected"
  | "reading"
  | "completed"
  | "failed";

export type FileCandidate = {
  id: string;
  label: string;
  path?: string;
  summary?: string;
  score?: number;
  source?: string;
  metadata?: Record<string, unknown>;
};

export type FileSelectionReference =
  | { mode: "ordinal"; ordinal: number }
  | { mode: "candidateId"; candidateId: string }
  | { mode: "relative"; value: "first" | "last" | "next" | "previous" }
  | { mode: "label"; label: string };

export type FileWorkflowState = {
  kind: "file";
  step: FileWorkflowStep;
  query: string | null;
  root: string | null;
  candidates: FileCandidate[];
  selectedCandidateId: string | null;
  readCandidateId: string | null;
  awaitingDisambiguation: boolean;
  lastAction:
    | "search"
    | "select"
    | "read"
    | "open"
    | "change_root"
    | "refine_query"
    | null;
  lastUserReference?: FileSelectionReference | null;
  error?: string | null;
};

export type WorkflowState =
  | { kind: "none" }
  | FileWorkflowState;

export type FileWorkflowIntent =
  | { kind: "none" }
  | { kind: "search"; query: string; root?: string | null }
  | { kind: "refine"; query: string }
  | { kind: "change_root"; root: string | null }
  | { kind: "select"; reference: FileSelectionReference }
  | { kind: "read_selection"; reference: FileSelectionReference }
  | { kind: "open_selection"; reference: FileSelectionReference }
  | { kind: "read_selected" }
  | { kind: "open_selected" }
  | { kind: "needs_disambiguation"; message: string };

  export type ChatUiPayload = {
    route: RouteName;
    reply: string;
    sessionId: string;
    tool: string;
    toolSummary: string;
    searchQuery: string;
    searchRoot: string;
    selectedFile: string;
    readFile: string;
    pendingState: string;
    workflowKind: string;
    workflowStep: string;
    workflowCandidateCount: number;

    activePlan?: {
      id: string;
      title: string;
      status: string;
      stepCount: number;
      activeStep: string | null;
    } | null;
  
    debugTrace?: {
      id: string;
      route: string;
      tool: string;
      success: boolean;
      summary: string;
      steps: {
        type: string;
        label: string;
        detail?: string;
        timestamp: string;
      }[];
    };
  };

export type CommandPipelineResult = {
  payload: ChatUiPayload;
};