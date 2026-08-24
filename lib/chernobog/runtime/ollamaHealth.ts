import {
    getOllamaTagsUrl,
  } from "../runtimeConfig";
  
  import {
    buildModelAvailabilitySnapshot,
    type ModelAvailabilitySnapshot,
  } from "./modelAvailability";
  
  import {
    publishModelAvailabilitySnapshot,
  } from "./modelAvailabilityEvents";
  
  import type {
    ChernobogHealthStatus,
    ChernobogRuntimeObservation,
  } from "./runtimeHealth";
  
  import {
    createRuntimeObservation,
  } from "./runtimeHealth";
  
  import {
    publishRuntimeHealthObservation,
  } from "./runtimeHealthEvents";

  interface OllamaTagsModel {
    name?: unknown;
    model?: unknown;
  }
  
  interface OllamaTagsResponse {
    models?: unknown;
  }
  
  export interface OllamaHealthProbeOptions {
    timeoutMs?: number;
  
    nodeId?: string;
  
    platform?: string;
  }
  
  export interface OllamaHealthResult {
    observation:
      ChernobogRuntimeObservation;
  
    installedModels:
      string[];
  }

  export interface PublishedOllamaHealthResult
  extends OllamaHealthResult {
  modelAvailability:
    ModelAvailabilitySnapshot;
}
  
  export interface ObserveAndPublishOllamaHealthOptions
    extends OllamaHealthProbeOptions {
    previousStatus?:
      ChernobogHealthStatus;
  }
  
  function extractInstalledModels(
    payload: OllamaTagsResponse
  ): string[] {
    if (
      !Array.isArray(
        payload.models
      )
    ) {
      return [];
    }
  
    const names =
      payload.models
        .map(
          (entry) => {
            if (
              typeof entry !==
                "object" ||
              entry === null
            ) {
              return undefined;
            }
  
            const model =
              entry as OllamaTagsModel;
  
            if (
              typeof model.name ===
                "string" &&
              model.name.trim()
            ) {
              return model.name.trim();
            }
  
            if (
              typeof model.model ===
                "string" &&
              model.model.trim()
            ) {
              return model.model.trim();
            }
  
            return undefined;
          }
        )
        .filter(
          (
            value
          ): value is string =>
            Boolean(value)
        );
  
    return [
      ...new Set(names),
    ].sort();
  }
  
  function failedObservation(
    args: {
      nodeId?: string;
      platform?: string;
      latencyMs: number;
      message: string;
      metadata?: Record<
        string,
        string | number | boolean | null
      >;
    }
  ): ChernobogRuntimeObservation {
    return createRuntimeObservation({
      id: "ollama",
  
      kind: "model-provider",
  
      status: "failed",
  
      nodeId:
        args.nodeId,
  
      platform:
        args.platform,
  
      latencyMs:
        args.latencyMs,
  
      message:
        args.message,
  
      capabilities: [],
  
      metadata:
        args.metadata,
    });
  }
  
  export async function probeOllamaHealth(
    options:
      OllamaHealthProbeOptions = {}
  ): Promise<OllamaHealthResult> {
    const timeoutMs =
      options.timeoutMs ??
      3_000;
  
    const startedAt =
      Date.now();
  
    const controller =
      new AbortController();
  
    const timeout =
      setTimeout(
        () => {
          controller.abort();
        },
        timeoutMs
      );
  
    try {
      const response =
        await fetch(
          getOllamaTagsUrl(),
          {
            method: "GET",
  
            headers: {
              Accept:
                "application/json",
            },
  
            signal:
              controller.signal,
          }
        );
  
      const latencyMs =
        Date.now() -
        startedAt;
  
      if (!response.ok) {
        return {
          observation:
            failedObservation({
              nodeId:
                options.nodeId,
  
              platform:
                options.platform ??
                process.platform,
  
              latencyMs,
  
              message:
                `Ollama returned HTTP ${response.status}`,
  
              metadata: {
                httpStatus:
                  response.status,
              },
            }),
  
          installedModels: [],
        };
      }
  
      let payload:
        OllamaTagsResponse;
  
      try {
        payload =
          await response.json() as
            OllamaTagsResponse;
      } catch {
        return {
          observation:
            failedObservation({
              nodeId:
                options.nodeId,
  
              platform:
                options.platform ??
                process.platform,
  
              latencyMs,
  
              message:
                "Ollama returned invalid JSON",
            }),
  
          installedModels: [],
        };
      }
  
      const installedModels =
        extractInstalledModels(
          payload
        );
  
      return {
        observation:
          createRuntimeObservation({
            id: "ollama",
  
            kind:
              "model-provider",
  
            status:
              "healthy",
  
            nodeId:
              options.nodeId,
  
            platform:
              options.platform ??
              process.platform,
  
            latencyMs,
  
            capabilities: [
              "generate",
              "model-discovery",
            ],
  
            metadata: {
              modelCount:
                installedModels.length,
            },
          }),
  
        installedModels,
      };
    } catch (error) {
      const latencyMs =
        Date.now() -
        startedAt;
  
      const aborted =
        error instanceof Error &&
        error.name ===
          "AbortError";
  
      return {
        observation:
          failedObservation({
            nodeId:
              options.nodeId,
  
            platform:
              options.platform ??
              process.platform,
  
            latencyMs,
  
            message: aborted
              ? `Ollama health probe timed out after ${timeoutMs}ms`
              : "Ollama health probe failed",
  
            metadata: {
              timeout:
                aborted,
            },
          }),
  
        installedModels: [],
      };
    } finally {
      clearTimeout(
        timeout
      );
    }
  }

  export async function observeAndPublishOllamaHealth(
    options:
      ObserveAndPublishOllamaHealthOptions = {}
  ): Promise<PublishedOllamaHealthResult> {
    const result =
      await probeOllamaHealth(
        options
      );
  
    await publishRuntimeHealthObservation(
      result.observation,
      {
        previousStatus:
          options.previousStatus,
      }
    );
  
    const modelAvailability =
      buildModelAvailabilitySnapshot(
        result.installedModels
      );
  
    await publishModelAvailabilitySnapshot(
      modelAvailability,
      {
        providerId:
          result.observation.id,
  
        nodeId:
          result.observation.nodeId,
      }
    );
  
    return {
      ...result,
      modelAvailability,
    };
  }