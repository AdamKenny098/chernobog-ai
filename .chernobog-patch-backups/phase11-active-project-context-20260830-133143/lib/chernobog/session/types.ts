import type { WorkflowState } from "@/lib/chernobog/pipeline/types";
import type { ActivePlan } from "@/lib/chernobog/planner/types";


export type RouteName = "chat" | "planner" | "memory" | "tools" | "guardian";

export type PendingDisambiguationKind =
  | "file_selection"
  | "path_scope"
  | "generic_selection";

export type FileSearchResultRef = {
  index: number;
  path: string;
  name: string;
  extension?: string;
  parentDir: string;
};

export type FileSearchContext = {
  query: string;
  root?: string;
  normalizedRoot?: string;
  results: FileSearchResultRef[];
  offset: number;
  pageSize: number;
  timestamp: string;
};

export type FileSelectionContext = {
  source: "search_result" | "explicit_path" | "recent_read";
  path: string;
  index?: number;
  timestamp: string;
};

export type FileReadContext = {
  path: string;
  preview?: string;
  timestamp: string;
};

export type FileContext = {
  lastSearch?: FileSearchContext | null;
  lastSelected?: FileSelectionContext | null;
  lastRead?: FileReadContext | null;
};

export type PendingDisambiguationOption = {
  id: string;
  label: string;
  value: string;
  meta?: Record<string, unknown>;
};

export type PendingDisambiguation = {
  kind: PendingDisambiguationKind;
  prompt: string;
  options: PendingDisambiguationOption[];
  createdAt: string;
};

export type SessionContext = {
  sessionId: string;
  lastUpdatedAt: string;
  lastRoute?: RouteName;
  lastTool?: {
    name: string;
    input?: unknown;
  } | null;
  lastToolResult?: {
    summary?: string;
    ok?: boolean;
  } | null;
  pendingDisambiguation?: PendingDisambiguation | null;
  fileContext?: FileContext | null;
  workflow: WorkflowState;
  activePlan?: ActivePlan | null;
};

export type FollowUpResolution =
  | { kind: "none" }
  | {
      kind: "resolved_tool_action";
      tool:
        | "find_files"
        | "read_text_file"
        | "open_file"
        | "open_folder"
        | "open_app"
        | "open_url"
        | "list_files"
        | "get_time";
      input: Record<string, unknown>;
    }
  | {
      kind: "needs_disambiguation";
      message: string;
      pending: PendingDisambiguation;
    };

export function createDefaultWorkflow(): WorkflowState {
  return { kind: "none" };
}