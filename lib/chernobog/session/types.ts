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
    input: unknown;
    success: boolean;
    summary?: string;
    timestamp: string;
  };
  lastToolResult?: {
    kind:
      | "file_search"
      | "file_read"
      | "directory_list"
      | "app_open"
      | "url_open"
      | "time_lookup"
      | "generic";
    summary: string;
  };
  fileContext?: {
    lastSearch?: FileSearchContext;
    lastSelected?: FileSelectionContext;
    lastRead?: FileReadContext;
  };
  pendingDisambiguation?: PendingDisambiguation | null;
};

export type FollowUpResolution =
  | { kind: "none" }
  | {
      kind: "resolved_tool_action";
      tool: "find_files" | "read_text_file" | "open_app" | "open_url" | "list_files" | "get_time";
      input: Record<string, unknown>;
    }
  | {
      kind: "needs_disambiguation";
      message: string;
      pending: PendingDisambiguation;
    };