import type {
  GenerateWithOllamaOptions,
  GenerateWithOllamaResult,
  OllamaFailureKind,
} from "./ollamaClient";
import {
  generateWithOllama,
  isRetryableOllamaFailure,
} from "./ollamaClient";
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

function readinessFailure(
  readiness:
    OllamaRuntimeReadiness,
): GenerateWithReliableOllamaResult {
  return {
    ok: false,
    model:
      readiness.configuredModel,
    role:
      readiness.role,
    error:
      readiness.reason ??
      "Ollama runtime is not ready.",
    failureKind:
      readiness.failureKind ??
      "provider-unavailable",
    attempts: 0,
    readiness:
      structuredClone(
        readiness,
      ),
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

  if (options.readiness !== false) {
    readiness =
      await checkOllamaRuntimeReadiness(
        role,
        options.readinessOptions,
      );

    if (!readiness.ready) {
      return readinessFailure(
        readiness,
      );
    }
  }

  const retry =
    options.retry ?? {};

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
  };
}
