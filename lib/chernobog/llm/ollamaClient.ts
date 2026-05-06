// lib/chernobog/llm/ollamaClient.ts

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

export async function generateWithOllama({
  role = "default",
  prompt,
  temperature = 0.35,
  timeoutMs = 300_000,
}: GenerateWithOllamaOptions): Promise<GenerateWithOllamaResult> {
  const resolved = resolveModel(role);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch("http://127.0.0.1:11434/api/generate", {
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
    });

    if (!response.ok) {
      return {
        ok: false,
        model: resolved.model,
        role: resolved.role,
        error: `Ollama request failed with status ${response.status}.`,
      };
    }

    const data: unknown = await response.json();
    const text = extractOllamaText(data);

    if (!text) {
      return {
        ok: false,
        model: resolved.model,
        role: resolved.role,
        error: "Ollama returned no usable text.",
      };
    }

    return {
      ok: true,
      text,
      model: resolved.model,
      role: resolved.role,
    };
  } catch (error) {
    const message =
      error instanceof DOMException && error.name === "AbortError"
        ? `Ollama request timed out after ${timeoutMs}ms.`
        : error instanceof Error
          ? error.message
          : "Ollama request failed.";

    return {
      ok: false,
      model: resolved.model,
      role: resolved.role,
      error: message,
    };
  } finally {
    clearTimeout(timeout);
  }
}