import { z } from "zod";

export type ToolExecutionContext = {
  platform?: NodeJS.Platform;
};

export type ToolSuccess<T = unknown> = {
  ok: true;
  tool: string;
  data: T;
};

export type ToolFailure = {
  ok: false;
  tool: string;
  error: string;
};

export type ToolResult<T = unknown> = ToolSuccess<T> | ToolFailure;

export type ToolDefinition<TInput = unknown, TOutput = unknown> = {
  name: string;
  description: string;
  inputSchema: z.ZodType<TInput>;
  execute: (
    input: TInput,
    context?: ToolExecutionContext
  ) => Promise<TOutput> | TOutput;
};

export type ParsedToolCommand =
  | { tool: "get_time"; input: Record<string, never> }
  | { tool: "list_files"; input: { path: string } }
  | { tool: "read_text_file"; input: { path: string; maxChars?: number } }
  | { tool: "find_files"; input: { query: string; root?: string; maxResults?: number } }
  | { tool: "open_file"; input: { path: string } }
  | { tool: "open_folder"; input: { path: string } }
  | { tool: "open_app"; input: { appName: string } }
  | { tool: "open_url"; input: { url: string } };

export function createToolFailure(tool: string, error: string): ToolFailure {
  return {
    ok: false,
    tool,
    error,
  };
}

export function createToolSuccess<T>(
  tool: string,
  data: T
): ToolSuccess<T> {
  return {
    ok: true,
    tool,
    data,
  };
}