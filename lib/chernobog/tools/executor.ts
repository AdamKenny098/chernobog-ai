import { z } from "zod";
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
  const tool = getTool(toolName) as AnyToolDefinition | null;

  if (!tool) {
    return createToolFailure(toolName, `Unknown tool: ${toolName}`);
  }

  try {
    const validatedInput = tool.inputSchema.parse(input);
    const output = await tool.execute(validatedInput, context);

    return createToolSuccess(tool.name, output);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Tool execution failed";

    return createToolFailure(toolName, message);
  }
}