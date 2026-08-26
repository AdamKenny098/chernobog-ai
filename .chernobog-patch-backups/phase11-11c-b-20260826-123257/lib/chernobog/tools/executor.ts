import { z } from "zod";

import { publishChernobogEventSafely } from "../events/publishers";
import { getTool } from "./registry";
import {
  ToolExecutionContext,
  ToolFailureKind,
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

async function publishToolFailure(
  options: {
    toolName: string;
    startedAt: number;
    error: string;
    failureKind:
      ToolFailureKind;
  },
): Promise<void> {
  await publishChernobogEventSafely({
    type: "tool.failed",
    source: {
      subsystem: "tools",
    },
    severity: "warning",
    subject: options.toolName,
    payload: {
      toolName:
        options.toolName,
      durationMs:
        Date.now() -
        options.startedAt,
      error:
        options.error,
      failureKind:
        options.failureKind,
    },
    metadata: {
      tags: [
        "tool",
        "failure",
        options.failureKind,
      ],
      sensitive: true,
    },
  });
}

function errorMessage(
  error: unknown,
  fallback: string,
): string {
  return error instanceof Error
    ? error.message
    : fallback;
}

export async function executeTool(
  toolName: string,
  input: unknown,
  context?: ToolExecutionContext
): Promise<ToolResult> {
  const startedAt =
    Date.now();

  await publishChernobogEventSafely({
    type: "tool.started",
    source: {
      subsystem: "tools",
    },
    severity: "debug",
    subject: toolName,
    payload: {
      toolName,
      platform:
        context?.platform ??
        process.platform,
    },
    metadata: {
      tags: ["tool"],
    },
  });

  const tool =
    getTool(
      toolName,
    ) as
      | AnyToolDefinition
      | null;

  if (!tool) {
    const result =
      createToolFailure(
        toolName,
        `Unknown tool: ${toolName}`,
        "unknown-tool",
      );

    await publishToolFailure({
      toolName,
      startedAt,
      error:
        result.error,
      failureKind:
        "unknown-tool",
    });

    return result;
  }

  let validatedInput:
    unknown;

  try {
    validatedInput =
      tool.inputSchema.parse(
        input,
      );
  } catch (error) {
    const failureKind:
      ToolFailureKind =
        error instanceof z.ZodError
          ? "invalid-input"
          : "execution-failed";

    const message =
      errorMessage(
        error,
        "Tool input validation failed",
      );

    const result =
      createToolFailure(
        toolName,
        message,
        failureKind,
      );

    await publishToolFailure({
      toolName,
      startedAt,
      error:
        result.error,
      failureKind,
    });

    return result;
  }

  try {
    const output =
      await tool.execute(
        validatedInput,
        context,
      );

    const result =
      createToolSuccess(
        tool.name,
        output,
      );

    await publishChernobogEventSafely({
      type:
        "tool.completed",
      source: {
        subsystem:
          "tools",
      },
      severity:
        "info",
      subject:
        tool.name,
      payload: {
        toolName:
          tool.name,
        durationMs:
          Date.now() -
          startedAt,
      },
      metadata: {
        tags: [
          "tool",
          "success",
        ],
      },
    });

    return result;
  } catch (error) {
    const message =
      errorMessage(
        error,
        "Tool execution failed",
      );

    const result =
      createToolFailure(
        toolName,
        message,
        "execution-failed",
      );

    await publishToolFailure({
      toolName,
      startedAt,
      error:
        result.error,
      failureKind:
        "execution-failed",
    });

    return result;
  }
}
