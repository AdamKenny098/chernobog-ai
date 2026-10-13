import type {
  LLMProvider,
  LLMRequest,
  LLMResult,
} from "../types";
import {
  generateWithReliableOllama,
} from "../../reliableOllama";

export const ollamaLLMProvider:
  LLMProvider = {
    id: "ollama",

    async generate(
      request: LLMRequest,
    ): Promise<LLMResult> {
      const result =
        await generateWithReliableOllama({
          role:
            request.role ??
            "default",
          prompt:
            request.prompt,
          messages:
            request.messages,
          format:
            request.format,
          temperature:
            request.temperature,
          timeoutMs:
            request.timeoutMs,
          keepAlive:
            request.keepAlive,
          numPredict:
            request.numPredict,
          signal:
            request.signal,
          modelOverride:
            request.model,
        });

      return {
        ok:
          result.ok,
        provider:
          "ollama",
        model:
          result.model,
        role:
          result.role,
        text:
          result.text,
        error:
          result.error,
        failureKind:
          result.failureKind,
        httpStatus:
          result.httpStatus,
        durationMs:
          result.durationMs,
        attempts:
          result.attempts,
        fallbackCount:
          result.fallbackCount,
      };
    },
  };