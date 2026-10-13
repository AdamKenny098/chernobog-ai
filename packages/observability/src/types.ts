/** Shared, dependency-light observability vocabulary for Chernobog. */
export type TraceId = string;

export type ObservabilityHealthStatus =
  | "healthy"
  | "degraded"
  | "failed"
  | "unknown";

export interface ObservabilityDiagnosticMetadata {
  generatedAt: string;
  subsystem: string;
  traceId?: TraceId;
  tags?: string[];
  details?: Record<string, unknown>;
}

export interface ObservabilityHealthMetadata {
  status: ObservabilityHealthStatus;
  observedAt: string;
  subsystem: string;
  componentId: string;
  nodeId?: string;
  message?: string;
  details?: Record<string, unknown>;
}

export interface ObservabilityTimingMetadata {
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
}

export interface ObservabilityErrorMetadata {
  message: string;
  name?: string;
  code?: string;
  retryable?: boolean;
  details?: Record<string, unknown>;
}

export interface ObservabilityExecutionTraceStep {
  kind: string;
  at: string;
  message: string;
  success?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ObservabilityExecutionTrace {
  traceId: TraceId;
  sessionId?: string;
  route?: string;
  tool?: string;
  success: boolean;
  steps: ObservabilityExecutionTraceStep[];
  timing?: ObservabilityTimingMetadata;
  error?: ObservabilityErrorMetadata;
}
