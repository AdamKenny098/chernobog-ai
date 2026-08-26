import {
  publishChernobogEventSafely,
} from "../events/publishers";
import {
  executeTool,
} from "../tools/executor";
import type {
  ToolExecutionContext,
  ToolResult,
} from "../tools/types";

export type UnifiedToolInvocationOrigin =
  | "direct"
  | "execution-task";

export interface UnifiedToolInvocation {
  toolName: string;
  input: unknown;
  origin:
    UnifiedToolInvocationOrigin;
  context?: ToolExecutionContext;
}

export interface UnifiedToolInvocationSummary {
  toolName: string;
  origin:
    UnifiedToolInvocationOrigin;
  platform: NodeJS.Platform;
}

export function summarizeUnifiedToolInvocation(
  invocation:
    UnifiedToolInvocation,
): UnifiedToolInvocationSummary {
  return {
    toolName:
      invocation.toolName,
    origin:
      invocation.origin,
    platform:
      invocation.context?.platform ??
      process.platform,
  };
}

export async function invokeTool(
  invocation:
    UnifiedToolInvocation,
): Promise<ToolResult> {
  const summary =
    summarizeUnifiedToolInvocation(
      invocation,
    );

  await publishChernobogEventSafely({
    type:
      "tool.invocation.routed",
    source: {
      subsystem:
        "execution",
      nodeId:
        "tool-gateway",
    },
    severity:
      "debug",
    subject:
      summary.toolName,
    payload: {
      toolName:
        summary.toolName,
      origin:
        summary.origin,
      platform:
        summary.platform,
    },
    metadata: {
      tags: [
        "tool",
        "gateway",
        summary.origin,
      ],
    },
  });

  return executeTool(
    invocation.toolName,
    invocation.input,
    invocation.context,
  );
}

export async function executeExecutionTaskTool(
  toolName: string,
  input: unknown,
  context?:
    ToolExecutionContext,
): Promise<ToolResult> {
  return invokeTool({
    toolName,
    input,
    origin:
      "execution-task",
    context,
  });
}

export async function executeDirectTool(
  toolName: string,
  input: unknown,
  context?:
    ToolExecutionContext,
): Promise<ToolResult> {
  return invokeTool({
    toolName,
    input,
    origin:
      "direct",
    context,
  });
}
