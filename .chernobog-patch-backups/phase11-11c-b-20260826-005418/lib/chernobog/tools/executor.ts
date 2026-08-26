import { z } from "zod";

import { publishChernobogEventSafely } from "../events/publishers";
import { getTool } from "./registry";
import {
  ToolExecutionContext,
  ToolResult,
  createToolFailure,
  createToolSuccess,
} from "./types";

type AnyToolDefinition = {
  name: string;
  description: string;
  inputSchema: z.ZodTypeAny;
  execute: (
    input: unknown,
    context?: ToolExecutionContext
  ) => Promise<unknown> | unknown;
};

export async function executeTool(
  toolName: string,
  input: unknown,
  context?: ToolExecutionContext
): Promise<ToolResult> {
  const startedAt = Date.now();

  await publishChernobogEventSafely({
    type: "tool.started",
    source: {
      subsystem: "tools",
    },
    severity: "debug",
    subject: toolName,
    payload: {
      toolName,
      platform: context?.platform ?? process.platform,
    },
    metadata: {
      tags: ["tool"],
    },
  });

  const tool = getTool(toolName) as AnyToolDefinition | null;

  if (!tool) {
    const result = createToolFailure(
      toolName,
      `Unknown tool: ${toolName}`
    );

    await publishChernobogEventSafely({
      type: "tool.failed",
      source: {
        subsystem: "tools",
      },
      severity: "warning",
      subject: toolName,
      payload: {
        toolName,
        durationMs: Date.now() - startedAt,
        error: result.error,
      },
      metadata: {
        tags: ["tool", "failure"],
        sensitive: true,
      },
    });

    return result;
  }

  try {
    const validatedInput = tool.inputSchema.parse(input);
    const output = await tool.execute(validatedInput, context);
    const result = createToolSuccess(tool.name, output);

    await publishChernobogEventSafely({
      type: "tool.completed",
      source: {
        subsystem: "tools",
      },
      severity: "info",
      subject: tool.name,
      payload: {
        toolName: tool.name,
        durationMs: Date.now() - startedAt,
      },
      metadata: {
        tags: ["tool", "success"],
      },
    });

    return result;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Tool execution failed";

    const result = createToolFailure(
      toolName,
      message
    );

    await publishChernobogEventSafely({
      type: "tool.failed",
      source: {
        subsystem: "tools",
      },
      severity: "warning",
      subject: toolName,
      payload: {
        toolName,
        durationMs: Date.now() - startedAt,
        error: message,
      },
      metadata: {
        tags: ["tool", "failure"],
        sensitive: true,
      },
    });

    return result;
  }
}