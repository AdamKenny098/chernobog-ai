import {
  publishChernobogEventSafely,
} from "../events/publishers";
import type {
  GenerateWithOllamaOptions,
  GenerateWithOllamaResult,
  OllamaFailureKind,
} from "./ollamaClient";
import {
  generateWithOllama,
  isRetryableOllamaFailure,
} from "./ollamaClient";
import {
  selectAvailableModel,
  type ModelSelectionDecision,
} from "./modelSelection";
import type {
  ModelRole,
} from "./modelRouter";
import type {
  OllamaRuntimeReadiness,
  OllamaRuntimeReadinessOptions,
  OllamaReadinessFailureKind,
} from "./runtimeReadiness";
import {
  checkOllamaRuntimeReadiness,
} from "./runtimeReadiness";

export type ReliableOllamaFailureKind =
  | OllamaFailureKind
  | OllamaReadinessFailureKind;

export interface ReliableOllamaRetryPolicy {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

export interface GenerateWithReliableOllamaOptions
  extends GenerateWithOllamaOptions {
  readiness?: boolean;
  readinessOptions?:
    OllamaRuntimeReadinessOptions;
  retry?:
    ReliableOllamaRetryPolicy;
}

export type GenerateWithReliableOllamaResult =
  Omit<
    GenerateWithOllamaResult,
    "failureKind"
  > & {
    failureKind?:
      ReliableOllamaFailureKind;
    attempts: number;
    readiness?:
      OllamaRuntimeReadiness;
    selection?:
      ModelSelectionDecision;
  };

export interface ReliableOllamaAttemptLoopOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  execute:
    () => Promise<GenerateWithOllamaResult>;
  sleep?:
    (delayMs: number) =>
      Promise<void>;
}

function requirePositiveInteger(
  value: number,
  field: string,
): number {
  if (
    !Number.isInteger(value) ||
    value < 1
  ) {
    throw new Error(
      `${field} must be a positive integer.`,
    );
  }

  return value;
}

function requireNonNegativeNumber(
  value: number,
  field: string,
): number {
  if (
    !Number.isFinite(value) ||
    value < 0
  ) {
    throw new Error(
      `${field} must be non-negative.`,
    );
  }

  return value;
}

export function calculateOllamaRetryDelay(
  completedAttempt: number,
  policy: {
    baseDelayMs: number;
    maxDelayMs: number;
  },
): number {
  requirePositiveInteger(
    completedAttempt,
    "completedAttempt",
  );

  const baseDelayMs =
    requireNonNegativeNumber(
      policy.baseDelayMs,
      "baseDelayMs",
    );

  const maxDelayMs =
    requireNonNegativeNumber(
      policy.maxDelayMs,
      "maxDelayMs",
    );

  return Math.min(
    maxDelayMs,
    baseDelayMs *
      2 ** (
        completedAttempt - 1
      ),
  );
}

async function defaultSleep(
  delayMs: number,
): Promise<void> {
  await new Promise<void>(
    (resolve) => {
      setTimeout(
        resolve,
        delayMs,
      );
    },
  );
}

export async function runReliableOllamaAttemptLoop(
  options:
    ReliableOllamaAttemptLoopOptions,
): Promise<
  GenerateWithOllamaResult & {
    attempts: number;
  }
> {
  const maxAttempts =
    requirePositiveInteger(
      options.maxAttempts,
      "maxAttempts",
    );

  const baseDelayMs =
    requireNonNegativeNumber(
      options.baseDelayMs,
      "baseDelayMs",
    );

  const maxDelayMs =
    requireNonNegativeNumber(
      options.maxDelayMs,
      "maxDelayMs",
    );

  const sleep =
    options.sleep ??
    defaultSleep;

  let last:
    GenerateWithOllamaResult
    | undefined;

  for (
    let attempt = 1;
    attempt <= maxAttempts;
    attempt += 1
  ) {
    last =
      await options.execute();

    if (
      last.ok ||
      !isRetryableOllamaFailure(
        last,
      ) ||
      attempt === maxAttempts
    ) {
      return {
        ...last,
        attempts: attempt,
      };
    }

    const delay =
      calculateOllamaRetryDelay(
        attempt,
        {
          baseDelayMs,
          maxDelayMs,
        },
      );

    await sleep(delay);
  }

  if (!last) {
    throw new Error(
      "Reliable Ollama attempt loop completed without executing.",
    );
  }

  return {
    ...last,
    attempts: maxAttempts,
  };
}

export function resolveReliableOllamaSelection(
  role: ModelRole,
  readiness:
    OllamaRuntimeReadiness,
): ModelSelectionDecision | undefined {
  if (
    readiness.providerStatus !==
    "healthy"
  ) {
    return undefined;
  }

  return selectAvailableModel(
    role,
    readiness.installedModels,
  );
}

function readinessFailure(
  readiness:
    OllamaRuntimeReadiness,
  selection?:
    ModelSelectionDecision,
): GenerateWithReliableOllamaResult {
  const noCandidate =
    selection?.reason ===
    "no-available-candidate";

  return {
    ok: false,
    model:
      selection?.primaryModel ??
      readiness.configuredModel,
    role:
      readiness.role,
    error:
      noCandidate
        ? `No available model candidate for role ${readiness.role}.`
        : readiness.reason ??
          "Ollama runtime is not ready.",
    failureKind:
      noCandidate
        ? "model-unavailable"
        : readiness.failureKind ??
          "provider-unavailable",
    attempts: 0,
    readiness:
      structuredClone(
        readiness,
      ),
    selection:
      selection
        ? structuredClone(
            selection,
          )
        : undefined,
  };
}

async function publishSelection(
  selection:
    ModelSelectionDecision,
): Promise<void> {
  await publishChernobogEventSafely({
    type:
      "model.route.selected",
    source: {
      subsystem:
        "llm",
      nodeId:
        "model-router",
    },
    severity:
      selection.fallbackUsed
        ? "notice"
        : "debug",
    subject:
      selection.selectedModel ??
      selection.primaryModel,
    payload: {
      requestedRole:
        selection.requestedRole,
      primaryModel:
        selection.primaryModel,
      selectedModel:
        selection.selectedModel,
      fallbackUsed:
        selection.fallbackUsed,
      reason:
        selection.reason,
      candidateCount:
        selection.candidates.length,
    },
    metadata: {
      tags: [
        "model",
        "routing",
        selection.fallbackUsed
          ? "fallback"
          : "primary",
      ],
    },
  });
}

export async function generateWithReliableOllama(
  options:
    GenerateWithReliableOllamaOptions,
): Promise<GenerateWithReliableOllamaResult> {
  const role:
    ModelRole =
      options.role ??
      "default";

  let readiness:
    OllamaRuntimeReadiness
    | undefined;

  let selection:
    ModelSelectionDecision
    | undefined;

  if (options.readiness !== false) {
    readiness =
      await checkOllamaRuntimeReadiness(
        role,
        options.readinessOptions,
      );

    selection =
      resolveReliableOllamaSelection(
        role,
        readiness,
      );

    if (
      readiness.providerStatus !==
      "healthy"
    ) {
      return readinessFailure(
        readiness,
      );
    }

    if (
      !selection ||
      !selection.selectedModel
    ) {
      return readinessFailure(
        readiness,
        selection,
      );
    }

    await publishSelection(
      selection,
    );
  }

  const retry =
    options.retry ?? {};

  const executionOptions:
    GenerateWithOllamaOptions = {
      ...options,
      role,
      modelOverride:
        selection?.selectedModel ??
        options.modelOverride,
    };

  const attemptResult =
    await runReliableOllamaAttemptLoop({
      maxAttempts:
        retry.maxAttempts ?? 3,
      baseDelayMs:
        retry.baseDelayMs ?? 250,
      maxDelayMs:
        retry.maxDelayMs ?? 2_000,
      execute:
        () =>
          generateWithOllama(
            executionOptions,
          ),
    });

  return {
    ...attemptResult,
    readiness:
      readiness
        ? structuredClone(
            readiness,
          )
        : undefined,
    selection:
      selection
        ? structuredClone(
            selection,
          )
        : undefined,
  };
}
