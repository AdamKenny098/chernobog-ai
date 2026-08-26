import {
  publishChernobogEventSafely,
} from "../events/publishers";
import {
  executeTool,
} from "../tools/executor";
import type {
  ToolExecutionContext,
  ToolFailureKind,
  ToolResult,
} from "../tools/types";

export type UnifiedToolInvocationOrigin =
  | "direct"
  | "execution-task"
  | "orchestration"
  | "pipeline";

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

export interface UnifiedToolInvocationResult {
  invocation:
    UnifiedToolInvocationSummary;
  result:
    ToolResult;
  failureKind?:
    ToolFailureKind;
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

export function getToolInvocationFailureKind(
  result:
    ToolResult,
): ToolFailureKind | undefined {
  if (result.ok) {
    return undefined;
  }

  return (
    result.failureKind ??
    "execution-failed"
  );
}

export async function invokeToolDetailed(
  invocation:
    UnifiedToolInvocation,
): Promise<UnifiedToolInvocationResult> {
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

  const result =
    await executeTool(
      invocation.toolName,
      invocation.input,
      invocation.context,
    );

  const failureKind =
    getToolInvocationFailureKind(
      result,
    );

  await publishChernobogEventSafely({
    type:
      result.ok
        ? "tool.invocation.completed"
        : "tool.invocation.failed",
    source: {
      subsystem:
        "execution",
      nodeId:
        "tool-gateway",
    },
    severity:
      result.ok
        ? "debug"
        : "warning",
    subject:
      summary.toolName,
    payload: {
      toolName:
        summary.toolName,
      origin:
        summary.origin,
      ok:
        result.ok,
      ...(failureKind
        ? {
            failureKind,
          }
        : {}),
    },
    metadata: {
      tags: [
        "tool",
        "gateway",
        summary.origin,
        result.ok
          ? "success"
          : "failure",
        ...(failureKind
          ? [failureKind]
          : []),
      ],
    },
  });

  return {
    invocation:
      structuredClone(
        summary,
      ),
    result,
    failureKind,
  };
}

export async function invokeTool(
  invocation:
    UnifiedToolInvocation,
): Promise<ToolResult> {
  const detailed =
    await invokeToolDetailed(
      invocation,
    );

  return detailed.result;
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

export async function executeOrchestrationTool(
  toolName: string,
  input: unknown,
  context?:
    ToolExecutionContext,
): Promise<ToolResult> {
  return invokeTool({
    toolName,
    input,
    origin:
      "orchestration",
    context,
  });
}

export async function executePipelineTool(
  toolName: string,
  input: unknown,
  context?:
    ToolExecutionContext,
): Promise<ToolResult> {
  return invokeTool({
    toolName,
    input,
    origin:
      "pipeline",
    context,
  });
}
