import type {
  ModelGateway,
  ModelRequest,
  ModelResult,
} from "@chernobog/contracts/models";

import {
  generateWithReliableOllama,
} from "./reliableOllama";
import {
  recordModelInvocationTelemetry,
  unavailableCostUsage,
  unavailableTokenUsage,
  type ModelInvocationTelemetryContext,
} from "./telemetry";

export type ModelGenerateOptions =
  Parameters<
    typeof generateWithReliableOllama
  >[0] & {
    telemetry?:
      ModelInvocationTelemetryContext;
  };

export type ModelGenerateResult =
  Awaited<
    ReturnType<
      typeof generateWithReliableOllama
    >
  >;

/**
 * Provider-neutral public generation entry point.
 * This preserves the accepted low-level generation semantics while hiding
 * the current provider from business/project callers.
 */
export async function generateWithModel(
  options: ModelGenerateOptions,
): Promise<ModelGenerateResult> {
  const {
    telemetry,
    ...generationOptions
  } = options;

  const startedAt =
    Date.now();

  try {
    const result =
      await generateWithReliableOllama(
        generationOptions,
      );

    const attempts =
      result.attempts ??
      1;

    await recordModelInvocationTelemetry(
      {
        taskType:
          telemetry?.taskType ??
          result.role ??
          "unspecified",
        provider:
          "ollama",
        model:
          result.model,
        requestedRole:
          generationOptions.role ??
          "default",
        selectedModel:
          result.selection
            ?.selectedInstalledModel ??
          result.selection
            ?.selectedModel ??
          result.model,
        selectionReason:
          result.selection
            ?.reason,
        outcome:
          result.ok
            ? "success"
            : "failure",
        latencyMs:
          result.durationMs ??
          Date.now() -
            startedAt,
        attempts,
        retries:
          Math.max(
            0,
            attempts - 1,
          ),
        fallbackCount:
          result.fallbackCount ??
          0,
        tokenUsage:
          unavailableTokenUsage(),
        cost:
          unavailableCostUsage(),
        validationExpected:
          telemetry
            ?.validationExpected ===
          true,
        error:
          result.error,
        failureKind:
          result.failureKind,
      },
      telemetry,
    );

    return result;
  } catch (error) {
    await recordModelInvocationTelemetry(
      {
        taskType:
          telemetry?.taskType ??
          generationOptions.role ??
          "unspecified",
        provider:
          "ollama",
        model:
          generationOptions
            .modelOverride ??
          "unresolved",
        requestedRole:
          generationOptions.role ??
          "default",
        outcome:
          "failure",
        latencyMs:
          Date.now() -
          startedAt,
        attempts:
          0,
        retries:
          0,
        fallbackCount:
          0,
        tokenUsage:
          unavailableTokenUsage(),
        cost:
          unavailableCostUsage(),
        validationExpected:
          telemetry
            ?.validationExpected ===
          true,
        error:
          error instanceof Error
            ? error.message
            : String(error),
        failureKind:
          "gateway-exception",
      },
      telemetry,
    );

    throw error;
  }
}

export const modelGateway: ModelGateway = {
  async execute<TOutput = unknown>(
    request: ModelRequest,
  ): Promise<ModelResult<TOutput>> {
    const metadata =
      request.metadata ?? {};

    const result =
      await generateWithModel({
        role:
          (request.role ?? "default") as any,
        ...(request.prompt
          ? { prompt: request.prompt }
          : {}),
        ...(request.messages
          ? { messages: request.messages as any }
          : {}),
        ...(typeof metadata.temperature === "number"
          ? { temperature: metadata.temperature }
          : {}),
        ...(typeof metadata.timeoutMs === "number"
          ? { timeoutMs: metadata.timeoutMs }
          : {}),
        ...(typeof metadata.numPredict === "number"
          ? { numPredict: metadata.numPredict }
          : {}),
      });

    return {
      ok: result.ok,
      ...(result.text !== undefined
        ? { output: result.text as TOutput }
        : {}),
      ...(result.error
        ? { error: result.error }
        : {}),
      provider: "ollama",
      model: result.model,
      metadata: {
        role: result.role,
      },
    };
  },
};
