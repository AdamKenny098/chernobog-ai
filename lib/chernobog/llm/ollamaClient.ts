import { publishChernobogEventSafely } from "../events/publishers";
import { getOllamaGenerateUrl } from "../runtimeConfig";
import { ModelRole, resolveModel } from "./modelRouter";

export type GenerateWithOllamaOptions = {
  role?: ModelRole;
  prompt: string;
  temperature?: number;
  timeoutMs?: number;
};

export type GenerateWithOllamaResult = {
  ok: boolean;
  text?: string;
  model: string;
  role: ModelRole;
  error?: string;
};

function extractOllamaText(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  if (
    "response" in value &&
    typeof value.response === "string" &&
    value.response.trim().length > 0
  ) {
    return value.response.trim();
  }

  if (
    "message" in value &&
    value.message &&
    typeof value.message === "object" &&
    "content" in value.message &&
    typeof value.message.content === "string" &&
    value.message.content.trim().length > 0
  ) {
    return value.message.content.trim();
  }

  return null;
}

async function publishModelResult(
  result: GenerateWithOllamaResult,
  startedAt: number
): Promise<void> {
  await publishChernobogEventSafely({
    type: result.ok
      ? "model.completed"
      : "model.failed",

    source: {
      subsystem: "llm",
      nodeId: "ollama",
    },

    severity: result.ok
      ? "info"
      : "warning",

    subject: result.model,

    payload: {
      provider: "ollama",
      model: result.model,
      role: result.role,
      durationMs: Date.now() - startedAt,

      ...(result.ok
        ? {
            outputChars: result.text?.length ?? 0,
          }
        : {
            error: result.error ?? "Unknown model failure.",
          }),
    },

    metadata: {
      tags: [
        "model",
        "ollama",
        result.ok ? "success" : "failure",
      ],

      sensitive: result.ok
        ? undefined
        : true,
    },
  });
}

export async function generateWithOllama({
  role = "default",
  prompt,
  temperature = 0.35,
  timeoutMs = 300_000,
}: GenerateWithOllamaOptions): Promise<GenerateWithOllamaResult> {
  const resolved = resolveModel(role);
  const ollamaUrl = getOllamaGenerateUrl();

  const startedAt = Date.now();

  await publishChernobogEventSafely({
    type: "model.requested",

    source: {
      subsystem: "llm",
      nodeId: "ollama",
    },

    severity: "debug",

    subject: resolved.model,

    payload: {
      provider: "ollama",
      model: resolved.model,
      role: resolved.role,

      /*
       * Record the size of the request,
       * never the prompt itself.
       */
      promptChars: prompt.length,

      temperature,
      timeoutMs,
    },

    metadata: {
      tags: [
        "model",
        "ollama",
      ],
    },
  });

  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    timeoutMs
  );

  try {
    const response = await fetch(
      ollamaUrl,
      {
        method: "POST",

        signal: controller.signal,

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          model: resolved.model,
          prompt,
          stream: false,

          options: {
            temperature,
          },
        }),
      }
    );

    if (!response.ok) {
      const result: GenerateWithOllamaResult = {
        ok: false,
        model: resolved.model,
        role: resolved.role,
        error:
          `Ollama request failed with status ${response.status}.`,
      };

      await publishModelResult(
        result,
        startedAt
      );

      return result;
    }

    const data: unknown =
      await response.json();

    const text =
      extractOllamaText(data);

    if (!text) {
      const result: GenerateWithOllamaResult = {
        ok: false,
        model: resolved.model,
        role: resolved.role,
        error:
          "Ollama returned no usable text.",
      };

      await publishModelResult(
        result,
        startedAt
      );

      return result;
    }

    const result: GenerateWithOllamaResult = {
      ok: true,
      text,
      model: resolved.model,
      role: resolved.role,
    };

    await publishModelResult(
      result,
      startedAt
    );

    return result;
  } catch (error) {
    const message =
      error instanceof DOMException &&
      error.name === "AbortError"
        ? `Ollama request timed out after ${timeoutMs}ms.`
        : error instanceof Error
          ? error.message
          : "Ollama request failed.";

    const result: GenerateWithOllamaResult = {
      ok: false,
      model: resolved.model,
      role: resolved.role,
      error: message,
    };

    await publishModelResult(
      result,
      startedAt
    );

    return result;
  } finally {
    clearTimeout(timeout);
  }
}