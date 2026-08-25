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

export type OllamaFailureKind =
  | "invalid-request"
  | "cancelled"
  | "timeout"
  | "http-error"
  | "invalid-response"
  | "transport-error";

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
  failureKind?: OllamaFailureKind;
  httpStatus?: number;
  endpoint?: string;
  transport?: "generate" | "chat";
  durationMs?: number;
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

function completeResult(
  result: GenerateWithOllamaResult,
  plan: OllamaRequestPlan | undefined,
  startedAt: number,
): GenerateWithOllamaResult {
  return {
    ...result,
    endpoint: plan?.url,
    transport: plan?.mode,
    durationMs: Date.now() - startedAt,
  };
}

async function publishModelResult(
  result: GenerateWithOllamaResult,
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
      durationMs: result.durationMs ?? 0,

      ...(result.transport
        ? {
            transport: result.transport,
          }
        : {}),

      ...(result.ok
        ? {
            outputChars: result.text?.length ?? 0,
          }
        : {
            error: result.error ?? "Unknown model failure.",
            failureKind: result.failureKind ?? "transport-error",
            ...(result.httpStatus !== undefined
              ? {
                  httpStatus: result.httpStatus,
                }
              : {}),
          }),
    },
    metadata: {
      tags: [
        "model",
        "ollama",
        result.ok ? "success" : "failure",
        ...(
          result.failureKind
            ? [result.failureKind]
            : []
        ),
      ],

      sensitive: result.ok
        ? undefined
        : true,
    },
  });
}

function failure(
  options: {
    model: string;
    role: ModelRole;
    kind: OllamaFailureKind;
    error: string;
    plan?: OllamaRequestPlan;
    startedAt: number;
    httpStatus?: number;
  },
): GenerateWithOllamaResult {
  return completeResult(
    {
      ok: false,
      model: options.model,
      role: options.role,
      error: options.error,
      failureKind: options.kind,
      httpStatus: options.httpStatus,
    },
    options.plan,
    options.startedAt,
  );
}

export function isRetryableOllamaFailure(
  result: GenerateWithOllamaResult,
): boolean {
  if (result.ok) {
    return false;
  }

  if (
    result.failureKind === "timeout" ||
    result.failureKind === "transport-error"
  ) {
    return true;
  }

  if (
    result.failureKind === "http-error" &&
    result.httpStatus !== undefined
  ) {
    return (
      result.httpStatus === 408 ||
      result.httpStatus === 429 ||
      result.httpStatus >= 500
    );
  }

  return false;
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

  if (
    !Number.isFinite(timeoutMs) ||
    timeoutMs <= 0
  ) {
    const result = failure({
      model: resolved.model,
      role: resolved.role,
      kind: "invalid-request",
      error: "Ollama timeoutMs must be greater than zero.",
      startedAt,
    });

    await publishModelResult(result);
    return result;
  }

  let plan: OllamaRequestPlan;

  try {
    plan = buildOllamaRequestPlan(
      options,
      resolved.model,
    );
  } catch (error) {
    const result = failure({
      model: resolved.model,
      role: resolved.role,
      kind: "invalid-request",
      error:
        error instanceof Error
          ? error.message
          : "Invalid Ollama request.",
      startedAt,
    });

    await publishModelResult(result);
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

  if (signal?.aborted) {
    const result = failure({
      model: resolved.model,
      role: resolved.role,
      kind: "cancelled",
      error: "Ollama request was cancelled before execution.",
      plan,
      startedAt,
    });

    await publishModelResult(result);
    return result;
  }

  const controller = new AbortController();
  let timedOut = false;

  const abortFromCaller = () => {
    controller.abort();
  };

  signal?.addEventListener(
    "abort",
    abortFromCaller,
    {
      once: true,
    },
  );

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
      const result = failure({
        model: resolved.model,
        role: resolved.role,
        kind: "http-error",
        error:
          `Ollama request failed with status ${response.status}.`,
        plan,
        startedAt,
        httpStatus: response.status,
      });

      await publishModelResult(result);
      return result;
    }

    let data: unknown;

    try {
      data = await response.json();
    } catch (error) {
      const result = failure({
        model: resolved.model,
        role: resolved.role,
        kind: "invalid-response",
        error:
          error instanceof Error
            ? `Ollama returned invalid JSON: ${error.message}`
            : "Ollama returned invalid JSON.",
        plan,
        startedAt,
      });

      await publishModelResult(result);
      return result;
    }

    const text =
      extractOllamaText(data);

    if (!text) {
      const result = failure({
        model: resolved.model,
        role: resolved.role,
        kind: "invalid-response",
        error:
          "Ollama returned no usable text.",
        plan,
        startedAt,
      });

      await publishModelResult(result);
      return result;
    }

    const result = completeResult(
      {
        ok: true,
        text,
        model: resolved.model,
        role: resolved.role,
      },
      plan,
      startedAt,
    );

    await publishModelResult(result);
    return result;
  } catch (error) {
    const kind: OllamaFailureKind =
      controller.signal.aborted
        ? timedOut
          ? "timeout"
          : "cancelled"
        : "transport-error";

    const message =
      kind === "timeout"
        ? `Ollama request timed out after ${timeoutMs}ms.`
        : kind === "cancelled"
          ? "Ollama request was cancelled."
          : error instanceof Error
            ? error.message
            : "Ollama request failed.";

    const result = failure({
      model: resolved.model,
      role: resolved.role,
      kind,
      error: message,
      plan,
      startedAt,
    });

    await publishModelResult(result);
    return result;
  } finally {
    clearTimeout(timeout);

    signal?.removeEventListener(
      "abort",
      abortFromCaller,
    );
  }
}
