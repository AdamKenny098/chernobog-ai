import type {
  ModelRole,
} from "../modelRouter";

export type LLMProviderId = string;

export type LLMMessageRole =
  | "system"
  | "user"
  | "assistant";

export interface LLMMessage {
  role: LLMMessageRole;
  content: string;
}

export type LLMFailureKind =
  | "invalid-request"
  | "cancelled"
  | "timeout"
  | "http-error"
  | "invalid-response"
  | "transport-error"
  | "provider-unavailable"
  | "model-unavailable"
  | "provider-error";

export interface LLMRequest {
  provider?: LLMProviderId;
  role?: ModelRole;
  model?: string;

  prompt?: string;
  messages?: LLMMessage[];

  format?: "json";
  temperature?: number;
  timeoutMs?: number;
  keepAlive?: string;
  numPredict?: number;
  signal?: AbortSignal;
}

export interface LLMResult {
  ok: boolean;
  provider: LLMProviderId;
  model: string;
  role: ModelRole;

  text?: string;
  error?: string;
  failureKind?: LLMFailureKind;
  httpStatus?: number;
  durationMs?: number;

  attempts?: number;
  fallbackCount?: number;
}

export interface LLMProvider {
  readonly id: LLMProviderId;

  generate(
    request: LLMRequest,
  ): Promise<LLMResult>;
}

export interface LLMGatewayOptions {
  providers: readonly LLMProvider[];
  defaultProvider: LLMProviderId;
}