import { publishChernobogEventSafely } from "../events/publishers";
import {
  getOllamaChatUrl,
  getOllamaGenerateUrl,
} from "../runtimeConfig";
import { ModelRole, resolveModel } from "./modelRouter";

export type OllamaChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type GenerateWithOllamaOptions = {
  role?: ModelRole;
  prompt?: string;
  messages?: OllamaChatMessage[];
  format?: "json";
  temperature?: number;
  timeoutMs?: number;
  numPredict?: number;
  signal?: AbortSignal;
};

export type GenerateWithOllamaResult = {
  ok: boolean;
  text?: string;
  model: string;
  role: ModelRole;
  error?: string;
};

export type OllamaRequestPlan = {
  mode: "generate" | "chat";
  url: string;
  body: Record<string, unknown>;
  inputChars: number;
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

function normalizeMessages(
  messages: OllamaChatMessage[] | undefined,
): OllamaChatMessage[] | undefined {
  if (!messages) {
    return undefined;
  }

  if (messages.length === 0) {
    throw new Error("Ollama chat messages must not be empty.");
  }

  return messages.map((message) => {
    const content = message.content.trim();

    if (!content) {
      throw new Error("Ollama chat message content must not be empty.");
    }

    return {
      role: message.role,
      content,
    };
  });
}

export function buildOllamaRequestPlan(
  options: GenerateWithOllamaOptions,
  model: string,
): OllamaRequestPlan {
  const prompt = options.prompt?.trim();
  const messages = normalizeMessages(options.messages);

  if (prompt && messages) {
    throw new Error(
      "Ollama request must use either prompt or messages, not both.",
    );
  }

  if (!prompt && !messages) {
    throw new Error(
      "Ollama request requires a prompt or chat messages.",
    );
  }

  const requestOptions: Record<string, unknown> = {
    temperature: options.temperature ?? 0.35,
  };

  if (options.numPredict !== undefined) {
    if (
      !Number.isInteger(options.numPredict) ||
      options.numPredict < 1
    ) {
      throw new Error(
        "Ollama numPredict must be a positive integer.",
      );
    }

    requestOptions.num_predict = options.numPredict;
  }

  if (messages) {
    return {
      mode: "chat",
      url: getOllamaChatUrl(),
      inputChars: messages.reduce(
        (total, message) => total + message.content.length,
        0,
      ),
      body: {
        model,
        messages,
        stream: false,
        ...(options.format ? { format: options.format } : {}),
        options: requestOptions,
      },
    };
  }

  return {
    mode: "generate",
    url: getOllamaGenerateUrl(),
    inputChars: prompt!.length,
    body: {
      model,
      prompt,
      stream: false,
      ...(options.format ? { format: options.format } : {}),
      options: requestOptions,
    },
  };
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

export async function generateWithOllama(
  options: GenerateWithOllamaOptions,
): Promise<GenerateWithOllamaResult> {
  const {
    role = "default",
    timeoutMs = 300_000,
    signal,
  } = options;

  const resolved = resolveModel(role);
  const startedAt = Date.now();

  let plan: OllamaRequestPlan;

  try {
    plan = buildOllamaRequestPlan(
      options,
      resolved.model,
    );
  } catch (error) {
    const result: GenerateWithOllamaResult = {
      ok: false,
      model: resolved.model,
      role: resolved.role,
      error:
        error instanceof Error
          ? error.message
          : "Invalid Ollama request.",
    };

    await publishModelResult(result, startedAt);
    return result;
  }

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
       * Record only request size and transport shape,
       * never the prompt or messages themselves.
       */
      promptChars: plan.inputChars,
      transport: plan.mode,

      temperature: options.temperature ?? 0.35,
      timeoutMs,
      ...(options.numPredict !== undefined
        ? {
            numPredict: options.numPredict,
          }
        : {}),
      ...(options.format
        ? {
            format: options.format,
          }
        : {}),
    },
    metadata: {
      tags: [
        "model",
        "ollama",
      ],
    },
  });

  const controller = new AbortController();
  let timedOut = false;

  const abortFromCaller = () => {
    controller.abort();
  };

  if (signal?.aborted) {
    controller.abort();
  } else {
    signal?.addEventListener(
      "abort",
      abortFromCaller,
      {
        once: true,
      },
    );
  }

  const timeout = setTimeout(
    () => {
      timedOut = true;
      controller.abort();
    },
    timeoutMs
  );

  try {
    const response = await fetch(
      plan.url,
      {
        method: "POST",

        signal: controller.signal,

        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(plan.body),
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
      controller.signal.aborted
        ? timedOut
          ? `Ollama request timed out after ${timeoutMs}ms.`
          : "Ollama request was cancelled."
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

    signal?.removeEventListener(
      "abort",
      abortFromCaller,
    );
  }
}
