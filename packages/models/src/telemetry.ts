import {
  getChernobogEventBus,
  publishChernobogEventSafely,
  type ChernobogEvent,
  type ChernobogEventPublisher,
} from "../../../lib/chernobog/events";
import type {
  ModelRole,
} from "./modelRouter";

export type TelemetryValueSource =
  | "provider"
  | "registry"
  | "estimated"
  | "unavailable";

export interface CognitiveTokenUsage {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  source: TelemetryValueSource;
}

export interface CognitiveCostUsage {
  amount: number | null;
  currency: string | null;
  source: TelemetryValueSource;
}

export interface ModelInvocationTelemetryContext {
  taskType?: string;
  correlationId?: string;
  validationExpected?: boolean;
  tags?: string[];
}

export interface ModelInvocationTelemetryPayload {
  taskType: string;
  provider: string;
  model: string;
  requestedRole: ModelRole;
  selectedModel?: string;
  selectionReason?: string;
  outcome: "success" | "failure";
  latencyMs: number;
  attempts: number;
  retries: number;
  fallbackCount: number;
  tokenUsage: CognitiveTokenUsage;
  cost: CognitiveCostUsage;
  validationExpected: boolean;
  error?: string;
  failureKind?: string;
}

export interface CognitiveValidationTelemetryPayload {
  taskType: string;
  provider?: string;
  model?: string;
  validator: string;
  valid: boolean;
  score?: number;
  reason?: string;
}

export interface CognitiveUserCorrectionTelemetryPayload {
  taskType: string;
  provider?: string;
  model?: string;
  correctionKind: string;
  accepted: boolean;
  detail?: string;
}

export interface CognitiveTelemetrySummary {
  events: number;
  modelInvocations: number;
  successes: number;
  failures: number;
  totalRetries: number;
  totalFallbacks: number;
  averageLatencyMs: number | null;
  tokenUsageKnown: number;
  costKnown: number;
  validations: number;
  validationPasses: number;
  validationFailures: number;
  userCorrections: number;
}

export const COGNITIVE_MODEL_COMPLETED_EVENT =
  "cognitive.model.completed";

export const COGNITIVE_MODEL_FAILED_EVENT =
  "cognitive.model.failed";

export const COGNITIVE_VALIDATION_EVENT =
  "cognitive.validation.completed";

export const COGNITIVE_USER_CORRECTION_EVENT =
  "cognitive.user_correction.recorded";

function normalizedTaskType(
  value: string | undefined,
): string {
  const normalized =
    value?.trim();

  return normalized ||
    "unspecified";
}

function finiteNonNegative(
  value: number | undefined,
  fallback = 0,
): number {
  if (
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return fallback;
  }

  return Math.max(
    0,
    value,
  );
}

export function unavailableTokenUsage():
  CognitiveTokenUsage {
  return {
    inputTokens: null,
    outputTokens: null,
    totalTokens: null,
    source: "unavailable",
  };
}

export function unavailableCostUsage():
  CognitiveCostUsage {
  return {
    amount: null,
    currency: null,
    source: "unavailable",
  };
}

export async function recordModelInvocationTelemetry(
  payload: ModelInvocationTelemetryPayload,
  context: ModelInvocationTelemetryContext = {},
  publisher?: ChernobogEventPublisher,
): Promise<void> {
  await publishChernobogEventSafely(
    {
      type:
        payload.outcome ===
        "success"
          ? COGNITIVE_MODEL_COMPLETED_EVENT
          : COGNITIVE_MODEL_FAILED_EVENT,
      source: {
        subsystem:
          "cognition",
        nodeId:
          "model-telemetry",
      },
      severity:
        payload.outcome ===
        "success"
          ? "info"
          : "warning",
      subject:
        payload.model,
      scope:
        normalizedTaskType(
          context.taskType ??
          payload.taskType,
        ),
      correlationId:
        context.correlationId,
      payload: {
        ...payload,
        taskType:
          normalizedTaskType(
            context.taskType ??
            payload.taskType,
          ),
        latencyMs:
          finiteNonNegative(
            payload.latencyMs,
          ),
        attempts:
          Math.max(
            0,
            Math.trunc(
              payload.attempts,
            ),
          ),
        retries:
          Math.max(
            0,
            Math.trunc(
              payload.retries,
            ),
          ),
        fallbackCount:
          Math.max(
            0,
            Math.trunc(
              payload.fallbackCount,
            ),
          ),
      },
      metadata: {
        tags: [
          "cognitive-telemetry",
          "model",
          payload.provider,
          payload.outcome,
          ...(context.tags ?? []),
        ],
        sensitive:
          payload.outcome ===
          "failure"
            ? true
            : undefined,
      },
    },
    publisher,
  );
}

export async function recordCognitiveValidationTelemetry(
  payload: CognitiveValidationTelemetryPayload,
  correlationId?: string,
  publisher?: ChernobogEventPublisher,
): Promise<void> {
  await publishChernobogEventSafely(
    {
      type:
        COGNITIVE_VALIDATION_EVENT,
      source: {
        subsystem:
          "cognition",
        nodeId:
          "validation-telemetry",
      },
      severity:
        payload.valid
          ? "info"
          : "notice",
      subject:
        payload.model,
      scope:
        normalizedTaskType(
          payload.taskType,
        ),
      correlationId,
      payload: {
        ...payload,
        taskType:
          normalizedTaskType(
            payload.taskType,
          ),
      },
      metadata: {
        tags: [
          "cognitive-telemetry",
          "validation",
          payload.valid
            ? "pass"
            : "fail",
        ],
      },
    },
    publisher,
  );
}

export async function recordCognitiveUserCorrectionTelemetry(
  payload: CognitiveUserCorrectionTelemetryPayload,
  correlationId?: string,
  publisher?: ChernobogEventPublisher,
): Promise<void> {
  await publishChernobogEventSafely(
    {
      type:
        COGNITIVE_USER_CORRECTION_EVENT,
      source: {
        subsystem:
          "cognition",
        nodeId:
          "user-correction-telemetry",
      },
      severity:
        "notice",
      subject:
        payload.model,
      scope:
        normalizedTaskType(
          payload.taskType,
        ),
      correlationId,
      payload: {
        ...payload,
        taskType:
          normalizedTaskType(
            payload.taskType,
          ),
      },
      metadata: {
        tags: [
          "cognitive-telemetry",
          "user-correction",
          payload.correctionKind,
        ],
        sensitive:
          payload.detail
            ? true
            : undefined,
      },
    },
    publisher,
  );
}

function payloadRecord(
  event: ChernobogEvent,
): Record<string, unknown> {
  if (
    event.payload &&
    typeof event.payload ===
      "object"
  ) {
    return event.payload as
      Record<string, unknown>;
  }

  return {};
}

export function summarizeCognitiveTelemetryEvents(
  events: readonly ChernobogEvent[],
): CognitiveTelemetrySummary {
  let modelInvocations =
    0;

  let successes =
    0;

  let failures =
    0;

  let totalRetries =
    0;

  let totalFallbacks =
    0;

  let latencyTotal =
    0;

  let latencyCount =
    0;

  let tokenUsageKnown =
    0;

  let costKnown =
    0;

  let validations =
    0;

  let validationPasses =
    0;

  let validationFailures =
    0;

  let userCorrections =
    0;

  for (const event of events) {
    const payload =
      payloadRecord(event);

    if (
      event.type ===
        COGNITIVE_MODEL_COMPLETED_EVENT ||
      event.type ===
        COGNITIVE_MODEL_FAILED_EVENT
    ) {
      modelInvocations +=
        1;

      if (
        event.type ===
        COGNITIVE_MODEL_COMPLETED_EVENT
      ) {
        successes += 1;
      } else {
        failures += 1;
      }

      if (
        typeof payload.retries ===
        "number"
      ) {
        totalRetries +=
          payload.retries;
      }

      if (
        typeof payload.fallbackCount ===
        "number"
      ) {
        totalFallbacks +=
          payload.fallbackCount;
      }

      if (
        typeof payload.latencyMs ===
          "number" &&
        Number.isFinite(
          payload.latencyMs,
        )
      ) {
        latencyTotal +=
          payload.latencyMs;
        latencyCount +=
          1;
      }

      const tokens =
        payload.tokenUsage;

      if (
        tokens &&
        typeof tokens ===
          "object" &&
        "source" in tokens &&
        tokens.source !==
          "unavailable"
      ) {
        tokenUsageKnown +=
          1;
      }

      const cost =
        payload.cost;

      if (
        cost &&
        typeof cost ===
          "object" &&
        "source" in cost &&
        cost.source !==
          "unavailable"
      ) {
        costKnown +=
          1;
      }
    }

    if (
      event.type ===
      COGNITIVE_VALIDATION_EVENT
    ) {
      validations += 1;

      if (
        payload.valid ===
        true
      ) {
        validationPasses +=
          1;
      } else {
        validationFailures +=
          1;
      }
    }

    if (
      event.type ===
      COGNITIVE_USER_CORRECTION_EVENT
    ) {
      userCorrections +=
        1;
    }
  }

  return {
    events:
      events.length,
    modelInvocations,
    successes,
    failures,
    totalRetries,
    totalFallbacks,
    averageLatencyMs:
      latencyCount > 0
        ? latencyTotal /
          latencyCount
        : null,
    tokenUsageKnown,
    costKnown,
    validations,
    validationPasses,
    validationFailures,
    userCorrections,
  };
}

export async function getCognitiveTelemetrySummary(
  limit = 1000,
): Promise<CognitiveTelemetrySummary> {
  const events =
    await getChernobogEventBus()
      .query({
        typePrefixes: [
          "cognitive.model.",
          "cognitive.validation.",
          "cognitive.user_correction.",
        ],
        newestFirst:
          true,
        limit,
      });

  return summarizeCognitiveTelemetryEvents(
    events,
  );
}