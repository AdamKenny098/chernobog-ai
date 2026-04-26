export type CommandDomain =
  | "none"
  | "memory"
  | "planner"
  | "file"
  | "app"
  | "workflow"
  | "context"
  | "chat"
  | "guardian";

export type CommandAction =
  | "none"
  | "create"
  | "show"
  | "continue"
  | "revise"
  | "clear"
  | "search"
  | "read"
  | "open"
  | "remember"
  | "forget"
  | "wipe"
  | "complete"
  | "block"
  | "status"
  | "execute";

export type CommandTarget =
  | "none"
  | "memory"
  | "memory_layers"
  | "short_term_memory"
  | "working_memory"
  | "long_term_memory"
  | "plan"
  | "plan_step"
  | "file"
  | "folder"
  | "app"
  | "workflow"
  | "context";

export type CommandReference =
  | "none"
  | "explicit"
  | "current"
  | "active"
  | "first_result"
  | "last_read"
  | "last_opened"
  | "selected"
  | "same";

export type CommandConfidenceLevel = "low" | "medium" | "high";

export type UnifiedCommand = {
  raw: string;
  normalized: string;
  domain: CommandDomain;
  action: CommandAction;
  target: CommandTarget;
  reference: CommandReference;
  query?: string;
  stepIndex?: number;
  confidence: number;
  confidenceLevel: CommandConfidenceLevel;
  reasons: string[];
};