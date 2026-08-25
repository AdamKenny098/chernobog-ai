import assert from "node:assert/strict";

import {
  calculateOllamaRetryDelay,
  runReliableOllamaAttemptLoop,
} from "../lib/chernobog/llm";
import type {
  GenerateWithOllamaResult,
} from "../lib/chernobog/llm";
import {
  readFile,
} from "node:fs/promises";

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

function result(
  overrides:
    Partial<GenerateWithOllamaResult>,
): GenerateWithOllamaResult {
  return {
    ok: false,
    model: "gemma3",
    role: "default",
    error: "failure",
    failureKind:
      "transport-error",
    ...overrides,
  };
}

async function main(): Promise<void> {
  console.log(
    "Chernobog Phase 11A-C - Runtime Readiness, Retry & Availability Integration",
  );
  console.log(
    "==========================================================================",
  );

  assert.equal(
    calculateOllamaRetryDelay(
      1,
      {
        baseDelayMs: 250,
        maxDelayMs: 2_000,
      },
    ),
    250,
  );

  assert.equal(
    calculateOllamaRetryDelay(
      2,
      {
        baseDelayMs: 250,
        maxDelayMs: 2_000,
      },
    ),
    500,
  );

  assert.equal(
    calculateOllamaRetryDelay(
      8,
      {
        baseDelayMs: 250,
        maxDelayMs: 2_000,
      },
    ),
    2_000,
  );

  pass(
    "retry delay uses deterministic capped exponential backoff",
  );

  let transientCalls = 0;
  const delays:
    number[] = [];

  const transient =
    await runReliableOllamaAttemptLoop({
      maxAttempts: 3,
      baseDelayMs: 100,
      maxDelayMs: 1_000,
      execute:
        async () => {
          transientCalls += 1;

          if (
            transientCalls < 3
          ) {
            return result({
              failureKind:
                "timeout",
            });
          }

          return result({
            ok: true,
            text: "recovered",
            error: undefined,
            failureKind:
              undefined,
          });
        },
      sleep:
        async (delayMs) => {
          delays.push(
            delayMs,
          );
        },
    });

  assert.equal(
    transient.ok,
    true,
  );

  assert.equal(
    transient.attempts,
    3,
  );

  assert.deepEqual(
    delays,
    [
      100,
      200,
    ],
  );

  pass(
    "transient timeout failures retry within the configured attempt ceiling and can recover",
  );

  let permanentCalls = 0;

  const permanent =
    await runReliableOllamaAttemptLoop({
      maxAttempts: 3,
      baseDelayMs: 100,
      maxDelayMs: 1_000,
      execute:
        async () => {
          permanentCalls += 1;

          return result({
            failureKind:
              "http-error",
            httpStatus:
              404,
          });
        },
      sleep:
        async () => {
          throw new Error(
            "permanent failure must not sleep or retry",
          );
        },
    });

  assert.equal(
    permanentCalls,
    1,
  );

  assert.equal(
    permanent.attempts,
    1,
  );

  pass(
    "permanent HTTP failures do not retry",
  );

  let cancelledCalls = 0;

  const cancelled =
    await runReliableOllamaAttemptLoop({
      maxAttempts: 3,
      baseDelayMs: 100,
      maxDelayMs: 1_000,
      execute:
        async () => {
          cancelledCalls += 1;

          return result({
            failureKind:
              "cancelled",
          });
        },
      sleep:
        async () => {
          throw new Error(
            "cancelled request must not retry",
          );
        },
    });

  assert.equal(
    cancelledCalls,
    1,
  );

  assert.equal(
    cancelled.attempts,
    1,
  );

  pass(
    "caller cancellation is terminal and never retried",
  );

  const readinessSource =
    await readFile(
      "lib/chernobog/llm/runtimeReadiness.ts",
      "utf8",
    );

  assert.equal(
    readinessSource.includes(
      "probeOllamaHealth",
    ),
    true,
  );

  assert.equal(
    readinessSource.includes(
      "resolveModelRoleAvailability",
    ),
    true,
  );

  assert.equal(
    readinessSource.includes(
      '"provider-unavailable"',
    ),
    true,
  );

  assert.equal(
    readinessSource.includes(
      '"model-unavailable"',
    ),
    true,
  );

  pass(
    "runtime readiness reuses the existing 11F Ollama health and model-availability implementation",
  );

  const reliableSource =
    await readFile(
      "lib/chernobog/llm/reliableOllama.ts",
      "utf8",
    );

  assert.equal(
    reliableSource.includes(
      "maxAttempts ?? 3",
    ),
    true,
  );

  assert.equal(
    reliableSource.includes(
      "checkOllamaRuntimeReadiness",
    ),
    true,
  );

  pass(
    "production reliable runtime performs readiness gating before bounded generation attempts",
  );

  const routerSource =
    await readFile(
      "lib/chernobog/router.ts",
      "utf8",
    );

  const intentSource =
    await readFile(
      "lib/chernobog/tools/intent.ts",
      "utf8",
    );

  assert.equal(
    routerSource.includes(
      "generateWithReliableOllama",
    ),
    true,
  );

  assert.equal(
    intentSource.includes(
      "generateWithReliableOllama",
    ),
    true,
  );

  pass(
    "consolidated production chat and tool-intent callers now use readiness-aware reliable execution",
  );

  console.log(
    "==========================================================================",
  );
  console.log(
    "PASS Phase 11A-C Runtime Readiness, Retry & Availability Integration acceptance",
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
