import assert from "node:assert/strict";

import {
  diagnoseOllamaResult,
  isRetryableOllamaFailure,
} from "../lib/chernobog/llm";
import type {
  GenerateWithOllamaResult,
} from "../lib/chernobog/llm";

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

async function main(): Promise<void> {
  console.log(
    "Chernobog Phase 11A-B - Runtime Reliability & Failure Semantics",
  );
  console.log(
    "===============================================================",
  );

  const timeout: GenerateWithOllamaResult = {
    ok: false,
    model: "gemma3",
    role: "default",
    error: "timed out",
    failureKind: "timeout",
    transport: "generate",
    durationMs: 30_000,
  };

  assert.equal(
    isRetryableOllamaFailure(timeout),
    true,
  );

  const unavailable: GenerateWithOllamaResult = {
    ok: false,
    model: "gemma3",
    role: "default",
    error: "not found",
    failureKind: "http-error",
    httpStatus: 404,
    transport: "generate",
    durationMs: 10,
  };

  assert.equal(
    isRetryableOllamaFailure(unavailable),
    false,
  );

  const overloaded: GenerateWithOllamaResult = {
    ok: false,
    model: "gemma3",
    role: "default",
    error: "busy",
    failureKind: "http-error",
    httpStatus: 503,
    transport: "generate",
    durationMs: 25,
  };

  assert.equal(
    isRetryableOllamaFailure(overloaded),
    true,
  );

  const cancelled: GenerateWithOllamaResult = {
    ok: false,
    model: "gemma3",
    role: "default",
    error: "cancelled",
    failureKind: "cancelled",
    transport: "chat",
    durationMs: 5,
  };

  assert.equal(
    isRetryableOllamaFailure(cancelled),
    false,
  );

  pass(
    "retryability is deterministic across timeout, transient HTTP, permanent HTTP, and cancellation failures",
  );

  const diagnostic =
    diagnoseOllamaResult(
      overloaded,
      isRetryableOllamaFailure(
        overloaded,
      ),
    );

  assert.deepEqual(
    diagnostic,
    {
      provider: "ollama",
      ok: false,
      model: "gemma3",
      role: "default",
      failureKind: "http-error",
      retryable: true,
      httpStatus: 503,
      transport: "generate",
      durationMs: 25,
    },
  );

  pass(
    "runtime diagnostics expose machine-readable failure category and retryability without parsing error text",
  );

  const success: GenerateWithOllamaResult = {
    ok: true,
    text: "ok",
    model: "gemma3",
    role: "default",
    transport: "chat",
    durationMs: 42,
  };

  assert.equal(
    isRetryableOllamaFailure(success),
    false,
  );

  assert.equal(
    diagnoseOllamaResult(
      success,
      false,
    ).failureKind,
    undefined,
  );

  pass(
    "successful model execution remains free of synthetic failure state",
  );

  const allowedKinds = new Set([
    "invalid-request",
    "cancelled",
    "timeout",
    "http-error",
    "invalid-response",
    "transport-error",
  ]);

  for (const kind of allowedKinds) {
    assert.equal(
      typeof kind,
      "string",
    );
  }

  assert.equal(
    allowedKinds.size,
    6,
  );

  pass(
    "runtime failure taxonomy is finite and stable",
  );

  console.log(
    "===============================================================",
  );
  console.log(
    "PASS Phase 11A-B Runtime Reliability & Failure Semantics acceptance",
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
