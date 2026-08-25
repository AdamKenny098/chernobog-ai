import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";

import {
  getAvailableExecutionCandidates,
  normalizeMaxModelCandidates,
  selectAvailableModel,
  shouldAdvanceToNextModel,
} from "../lib/chernobog/llm";
import type {
  GenerateWithOllamaResult,
} from "../lib/chernobog/llm";

function pass(
  message: string,
): void {
  console.log(
    `PASS ${message}`,
  );
}

function failure(
  overrides:
    Partial<GenerateWithOllamaResult> = {},
): GenerateWithOllamaResult {
  return {
    ok: false,
    model:
      "deepseek-coder-v2:16b",
    role:
      "code",
    error:
      "temporary failure",
    failureKind:
      "timeout",
    ...overrides,
  };
}

async function main():
  Promise<void> {
  console.log(
    "Chernobog Phase 11B-C - Failure-Aware Fallback Policy",
  );
  console.log(
    "=====================================================",
  );

  const previousDefault =
    process.env.OLLAMA_MODEL;

  const previousCode =
    process.env
      .OLLAMA_CODE_MODEL;

  try {
    process.env.OLLAMA_MODEL =
      "gemma3";

    process.env
      .OLLAMA_CODE_MODEL =
      "deepseek-coder-v2:16b";

    const selection =
      selectAvailableModel(
        "code",
        [
          "deepseek-coder-v2:16b",
          "gemma3:latest",
          "mistral:latest",
        ],
      );

    const candidates =
      getAvailableExecutionCandidates(
        selection,
      );

    assert.deepEqual(
      candidates.map(
        (candidate) =>
          candidate.model,
      ),
      [
        "deepseek-coder-v2:16b",
        "gemma3:latest",
      ],
    );

    assert.equal(
      candidates.some(
        (candidate) =>
          candidate.model ===
          "mistral:latest",
      ),
      false,
    );

    pass(
      "execution fallback sequence contains only explicit routing candidates that are actually installed",
    );

    assert.equal(
      shouldAdvanceToNextModel(
        failure({
          failureKind:
            "timeout",
        }),
      ),
      true,
    );

    assert.equal(
      shouldAdvanceToNextModel(
        failure({
          failureKind:
            "transport-error",
        }),
      ),
      true,
    );

    assert.equal(
      shouldAdvanceToNextModel(
        failure({
          failureKind:
            "http-error",
          httpStatus:
            503,
        }),
      ),
      true,
    );

    pass(
      "exhausted transient failures may advance to the next explicit available model",
    );

    assert.equal(
      shouldAdvanceToNextModel(
        failure({
          failureKind:
            "cancelled",
        }),
      ),
      false,
    );

    assert.equal(
      shouldAdvanceToNextModel(
        failure({
          failureKind:
            "invalid-request",
        }),
      ),
      false,
    );

    assert.equal(
      shouldAdvanceToNextModel(
        failure({
          failureKind:
            "invalid-response",
        }),
      ),
      false,
    );

    assert.equal(
      shouldAdvanceToNextModel(
        failure({
          failureKind:
            "http-error",
          httpStatus:
            404,
        }),
      ),
      false,
    );

    pass(
      "cancellation and permanent failures terminate the model sequence without cross-model retry",
    );

    assert.equal(
      normalizeMaxModelCandidates(
        undefined,
      ),
      2,
    );

    assert.equal(
      normalizeMaxModelCandidates(
        1,
      ),
      1,
    );

    assert.equal(
      normalizeMaxModelCandidates(
        4,
      ),
      4,
    );

    assert.throws(
      () =>
        normalizeMaxModelCandidates(
          0,
        ),
    );

    assert.throws(
      () =>
        normalizeMaxModelCandidates(
          5,
        ),
    );

    pass(
      "cross-model fallback has an explicit bounded candidate ceiling with a conservative default of two",
    );

    const reliableSource =
      await readFile(
        "lib/chernobog/llm/reliableOllama.ts",
        "utf8",
      );

    assert.equal(
      reliableSource.includes(
        "maxCandidates",
      ),
      true,
    );

    assert.equal(
      reliableSource.includes(
        "runReliableOllamaAttemptLoop",
      ),
      true,
    );

    assert.equal(
      reliableSource.includes(
        "shouldAdvanceToNextModel",
      ),
      true,
    );

    assert.equal(
      reliableSource.includes(
        '"model.route.failed-over"',
      ),
      true,
    );

    pass(
      "production runtime retries within a model before performing an observable cross-model failover",
    );

    assert.equal(
      reliableSource.includes(
        "modelAttempts",
      ),
      true,
    );

    assert.equal(
      reliableSource.includes(
        "fallbackCount",
      ),
      true,
    );

    pass(
      "runtime results retain inspectable per-model attempt history and fallback count",
    );

    const eventStart =
      reliableSource.indexOf(
        '"model.route.failed-over"',
      );

    const eventEnd =
      reliableSource.indexOf(
        "function toAttemptRecord",
      );

    const eventBlock =
      reliableSource.slice(
        eventStart,
        eventEnd,
      );

    assert.equal(
      eventBlock.includes(
        "installedModels",
      ),
      false,
    );

    assert.equal(
      eventBlock.includes(
        "prompt",
      ),
      false,
    );

    pass(
      "execution-fallback telemetry contains routing/failure metadata but no prompt content or raw model inventory",
    );

    assert.equal(
      reliableSource.includes(
        "permission",
      ),
      false,
    );

    assert.equal(
      reliableSource.includes(
        "executeTool",
      ),
      false,
    );

    pass(
      "failure-aware model fallback remains a routing concern and gains no governance or tool authority",
    );
  } finally {
    if (
      previousDefault ===
      undefined
    ) {
      delete process.env
        .OLLAMA_MODEL;
    } else {
      process.env
        .OLLAMA_MODEL =
        previousDefault;
    }

    if (
      previousCode ===
      undefined
    ) {
      delete process.env
        .OLLAMA_CODE_MODEL;
    } else {
      process.env
        .OLLAMA_CODE_MODEL =
        previousCode;
    }
  }

  console.log(
    "=====================================================",
  );
  console.log(
    "PASS Phase 11B-C Failure-Aware Fallback Policy acceptance",
  );
}

void main().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);
