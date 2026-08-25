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
  getAvailableExecutionCandidates,
  normalizeMaxModelCandidates,
  shouldAdvanceToNextModel,
  type ReliableModelAttemptRecord,
  type ReliableModelFallbackPolicy,
} from "./modelFailureFallback";
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
  modelFallback?:
    ReliableModelFallbackPolicy;
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
    modelAttempts:
      ReliableModelAttemptRecord[];
    fallbackCount: number;
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
    modelAttempts: [],
    fallbackCount: 0,
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
      selection.selectedInstalledModel ??
      selection.selectedModel ??
      selection.primaryModel,
    payload: {
      requestedRole:
        selection.requestedRole,
      primaryModel:
        selection.primaryModel,
      selectedModel:
        selection.selectedModel,
      selectedInstalledModel:
        selection.selectedInstalledModel,
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

async function publishExecutionFallback(
  options: {
    role: ModelRole;
    fromModel: string;
    toModel: string;
    failure:
      GenerateWithOllamaResult;
    modelAttempts: number;
    fallbackNumber: number;
  },
): Promise<void> {
  await publishChernobogEventSafely({
    type:
      "model.route.failed-over",
    source: {
      subsystem:
        "llm",
      nodeId:
        "model-router",
    },
    severity:
      "notice",
    subject:
      options.toModel,
    payload: {
      requestedRole:
        options.role,
      fromModel:
        options.fromModel,
      toModel:
        options.toModel,
      failureKind:
        options.failure.failureKind,
      httpStatus:
        options.failure.httpStatus,
      exhaustedAttempts:
        options.modelAttempts,
      fallbackNumber:
        options.fallbackNumber,
    },
    metadata: {
      tags: [
        "model",
        "routing",
        "execution-fallback",
      ],
    },
  });
}

function toAttemptRecord(
  model: string,
  candidateIndex: number,
  result:
    GenerateWithOllamaResult & {
      attempts: number;
    },
): ReliableModelAttemptRecord {
  return {
    model,
    candidateIndex,
    attempts:
      result.attempts,
    ok:
      result.ok,
    failureKind:
      result.failureKind,
    httpStatus:
      result.httpStatus,
  };
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

  const retrySettings = {
    maxAttempts:
      retry.maxAttempts ?? 3,
    baseDelayMs:
      retry.baseDelayMs ?? 250,
    maxDelayMs:
      retry.maxDelayMs ?? 2_000,
  };

  /*
   * Readiness-disabled callers preserve the 11A behavior:
   * one resolved/overridden model with bounded retry, no cross-model fallback.
   */
  if (!selection) {
    const attemptResult =
      await runReliableOllamaAttemptLoop({
        ...retrySettings,
        execute:
          () =>
            generateWithOllama(
              options,
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
        undefined,
      modelAttempts: [
        toAttemptRecord(
          attemptResult.model,
          0,
          attemptResult,
        ),
      ],
      fallbackCount: 0,
    };
  }

  const maxCandidates =
    normalizeMaxModelCandidates(
      options.modelFallback
        ?.maxCandidates,
    );

  const candidates =
    getAvailableExecutionCandidates(
      selection,
    )
      .slice(
        0,
        maxCandidates,
      );

  if (candidates.length === 0) {
    return readinessFailure(
      readiness!,
      selection,
    );
  }

  const modelAttempts:
    ReliableModelAttemptRecord[] = [];

  let fallbackCount = 0;

  let lastResult:
    | (
      GenerateWithOllamaResult & {
        attempts: number;
      }
    )
    | undefined;

  for (
    let index = 0;
    index < candidates.length;
    index += 1
  ) {
    const candidate =
      candidates[index]!;

    const executionOptions:
      GenerateWithOllamaOptions = {
        ...options,
        role,
        modelOverride:
          candidate.model,
    };

    const attemptResult =
      await runReliableOllamaAttemptLoop({
        ...retrySettings,
        execute:
          () =>
            generateWithOllama(
              executionOptions,
            ),
      });

    lastResult =
      attemptResult;

    modelAttempts.push(
      toAttemptRecord(
        candidate.model,
        candidate.candidateIndex,
        attemptResult,
      ),
    );

    if (attemptResult.ok) {
      return {
        ...attemptResult,
        readiness:
          structuredClone(
            readiness!,
          ),
        selection:
          structuredClone(
            selection,
          ),
        modelAttempts:
          structuredClone(
            modelAttempts,
          ),
        fallbackCount,
      };
    }

    if (
      !shouldAdvanceToNextModel(
        attemptResult,
      )
    ) {
      return {
        ...attemptResult,
        readiness:
          structuredClone(
            readiness!,
          ),
        selection:
          structuredClone(
            selection,
          ),
        modelAttempts:
          structuredClone(
            modelAttempts,
          ),
        fallbackCount,
      };
    }

    const next =
      candidates[
        index + 1
      ];

    if (!next) {
      break;
    }

    fallbackCount += 1;

    await publishExecutionFallback({
      role,
      fromModel:
        candidate.model,
      toModel:
        next.model,
      failure:
        attemptResult,
      modelAttempts:
        attemptResult.attempts,
      fallbackNumber:
        fallbackCount,
    });
  }

  if (!lastResult) {
    throw new Error(
      "Reliable Ollama model fallback completed without executing a candidate.",
    );
  }

  return {
    ...lastResult,
    readiness:
      structuredClone(
        readiness!,
      ),
    selection:
      structuredClone(
        selection,
      ),
    modelAttempts:
      structuredClone(
        modelAttempts,
      ),
    fallbackCount,
  };
}
