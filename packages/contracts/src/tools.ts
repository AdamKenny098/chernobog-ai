/** Provider-neutral tool definition visible outside the tool implementation. */
export interface ToolDefinition<TInput = unknown, TOutput = unknown> {
  name: string;
  description?: string;
  inputSchema?: unknown;
  execute?: (input: TInput) => Promise<TOutput> | TOutput;
  metadata?: Readonly<Record<string, unknown>>;
}

export interface ToolRequest<TInput = unknown> {
  tool: string;
  input: TInput;
  requestId?: string;
  sessionId?: string;
  metadata?: Readonly<Record<string, unknown>>;
}

export interface ToolResult<TOutput = unknown> {
  ok: boolean;
  output?: TOutput;
  error?: string;
  metadata?: Readonly<Record<string, unknown>>;
}

/** Authoritative cross-domain execution contract for tools. */
export interface ToolGateway {
  execute<TInput = unknown, TOutput = unknown>(
    request: ToolRequest<TInput>,
  ): Promise<ToolResult<TOutput>>;
}
