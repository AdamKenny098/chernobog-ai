import type {
  ModelGateway,
  ModelRequest,
  ModelResult,
} from "@chernobog/contracts/models";

import {
  generateWithOllama,
  type GenerateWithOllamaOptions,
  type GenerateWithOllamaResult,
} from "./providerAdapter";

export type ModelGenerateOptions =
  GenerateWithOllamaOptions;

export type ModelGenerateResult =
  GenerateWithOllamaResult;

/**
 * Provider-neutral public generation entry point.
 * This preserves the accepted low-level generation semantics while hiding
 * the current provider from business/project callers.
 */
export async function generateWithModel(
  options: ModelGenerateOptions,
): Promise<ModelGenerateResult> {
  return generateWithOllama(options);
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
