import {
  generateWithModel,
} from "./gateway";

import type {
  CognitiveModelExecutor,
} from "./multiModelOrchestrator";

export const GATEWAY_EXPLICIT_MODEL_TARGETING =
  true;

export const GATEWAY_MODEL_TARGET_MODE =
  "provider-model" as const;

function numericMetadata(
  value: unknown,
): number | undefined {
  return (
    typeof value ===
      "number" &&
    Number.isFinite(
      value,
    )
  )
    ? value
    : undefined;
}

export const gatewayCognitiveModelExecutor:
  CognitiveModelExecutor =
    async (
      request,
    ) => {
      if (
        !GATEWAY_EXPLICIT_MODEL_TARGETING
      ) {
        return {
          ok:
            false,
          error:
            "The live Unified LLM Gateway does not expose an explicit model-target field. OH-4S fails closed rather than pretending a specific OH-4M candidate was executed.",
          provider:
            request.candidate
              .provider,
          model:
            request.candidate
              .model,
        };
      }

      const started =
        Date.now();

      try {
        const result =
          await generateWithModel(
            {
        provider:
          request.candidate.provider,
        model:
          request.candidate.model,
              prompt:
                request.prompt,
              timeoutMs:
                request.timeoutMs,
            } as any,
          );

        const resultRecord =
          result as unknown as
            Record<
              string,
              unknown
            >;

        const text =
          typeof resultRecord.text ===
            "string"
            ? resultRecord.text
            : typeof resultRecord.output ===
                "string"
              ? resultRecord.output
              : undefined;

        const error =
          typeof resultRecord.error ===
            "string"
            ? resultRecord.error
            : undefined;

        const ok =
          typeof resultRecord.ok ===
            "boolean"
            ? resultRecord.ok
            : Boolean(
                text,
              );

        return {
          ok,
          text,
          error,
          provider:
            typeof resultRecord.provider ===
              "string"
              ? resultRecord.provider
              : request.candidate
                  .provider,
          model:
            typeof resultRecord.model ===
              "string"
              ? resultRecord.model
              : request.candidate
                  .model,
          latencyMs:
            numericMetadata(
              resultRecord.latencyMs,
            ) ??
            (
              Date.now() -
              started
            ),
          confidence:
            numericMetadata(
              resultRecord.confidence,
            ),
          metadata: {
            targetMode:
              GATEWAY_MODEL_TARGET_MODE,
            requestedCandidateId:
              request.candidate.id,
          },
        };
      } catch (
        error
      ) {
        return {
          ok:
            false,
          error:
            error instanceof Error
              ? error.message
              : String(
                  error,
                ),
          provider:
            request.candidate
              .provider,
          model:
            request.candidate
              .model,
          latencyMs:
            Date.now() -
            started,
        };
      }
    };

export function getGatewayCognitiveModelExecutor():
  CognitiveModelExecutor {
  return gatewayCognitiveModelExecutor;
}