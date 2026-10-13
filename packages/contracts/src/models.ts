export type ModelCapability =
  | "conversation"
  | "reasoning"
  | "planning"
  | "summarisation"
  | "classification"
  | "embeddings"
  | "vision"
  | (string & Record<never, never>);

export interface ModelRequest {
  role?: string;
  prompt?: string;
  messages?: readonly unknown[];
  requiredCapabilities?: readonly ModelCapability[];
  metadata?: Readonly<Record<string, unknown>>;
}

export interface ModelResult<TOutput = unknown> {
  ok: boolean;
  output?: TOutput;
  error?: string;
  provider?: string;
  model?: string;
  metadata?: Readonly<Record<string, unknown>>;
}

export interface ModelGateway {
  execute<TOutput = unknown>(request: ModelRequest): Promise<ModelResult<TOutput>>;
}
