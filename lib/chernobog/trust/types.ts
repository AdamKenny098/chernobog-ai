import type { RouteName } from "@/lib/chernobog/session/types";

export type TrustTraceStepType =
  | "input"
  | "memory_route"
  | "follow_up"
  | "orchestration"
  | "parsed_tool"
  | "tool_intent"
  | "vague_file_fallback"
  | "router"
  | "tool_execution"
  | "workflow_update"
  | "failure"
  | "response";

export type TrustTraceStep = {
  type: TrustTraceStepType;
  label: string;
  detail?: string;
  data?: unknown;
  timestamp: string;
};

export type TrustTrace = {
  id: string;
  sessionId: string;
  startedAt: string;
  finishedAt?: string;
  input: string;
  route: RouteName | "unknown";
  tool: string;
  success: boolean;
  steps: TrustTraceStep[];
  error?: string;
};