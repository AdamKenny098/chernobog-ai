import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";

import {
  buildOllamaRequestPlan,
} from "../lib/chernobog/llm/ollamaClient";
import {
  resolveModel,
} from "../lib/chernobog/llm/modelRouter";
import {
  getOllamaChatUrl,
  getOllamaGenerateUrl,
} from "../lib/chernobog/runtimeConfig";

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

async function source(path: string): Promise<string> {
  return readFile(path, "utf8");
}

async function main(): Promise<void> {
  console.log(
    "Chernobog Phase 11A-A - Ollama Runtime Consolidation",
  );
  console.log(
    "=====================================================",
  );

  const previousOllamaUrl =
    process.env.OLLAMA_URL;

  const previousBaseUrl =
    process.env.OLLAMA_BASE_URL;

  process.env.OLLAMA_URL =
    "http://127.0.0.1:11434/api/chat";

  delete process.env.OLLAMA_BASE_URL;

  assert.equal(
    getOllamaGenerateUrl(),
    "http://127.0.0.1:11434/api/generate",
  );

  assert.equal(
    getOllamaChatUrl(),
    "http://127.0.0.1:11434/api/chat",
  );

  process.env.OLLAMA_URL =
    "http://127.0.0.1:11434/api/generate";

  assert.equal(
    getOllamaGenerateUrl(),
    "http://127.0.0.1:11434/api/generate",
  );

  assert.equal(
    getOllamaChatUrl(),
    "http://127.0.0.1:11434/api/chat",
  );

  pass(
    "OLLAMA_URL safely resolves generate and chat endpoints regardless of legacy endpoint suffix",
  );

  const defaultModel =
    resolveModel("default");

  const generatePlan =
    buildOllamaRequestPlan(
      {
        role: "default",
        prompt:
          "Classify this request.",
        temperature: 0,
        format: "json",
      },
      defaultModel.model,
    );

  assert.equal(
    generatePlan.mode,
    "generate",
  );

  assert.equal(
    generatePlan.url,
    "http://127.0.0.1:11434/api/generate",
  );

  assert.equal(
    generatePlan.body.format,
    "json",
  );

  assert.equal(
    (
      generatePlan.body.options as
        Record<string, unknown>
    ).temperature,
    0,
  );

  pass(
    "shared Ollama client plans structured JSON generation through /api/generate",
  );

  const plannerModel =
    resolveModel("planner");

  const chatPlan =
    buildOllamaRequestPlan(
      {
        role: "planner",
        messages: [
          {
            role: "system",
            content:
              "Plan carefully.",
          },
          {
            role: "user",
            content:
              "Build a roadmap.",
          },
        ],
        temperature: 0.4,
        numPredict: 500,
      },
      plannerModel.model,
    );

  assert.equal(
    chatPlan.mode,
    "chat",
  );

  assert.equal(
    chatPlan.url,
    "http://127.0.0.1:11434/api/chat",
  );

  assert.equal(
    chatPlan.body.model,
    plannerModel.model,
  );

  assert.equal(
    (
      chatPlan.body.options as
        Record<string, unknown>
    ).num_predict,
    500,
  );

  pass(
    "shared Ollama client supports role-routed multi-message chat without legacy router transport",
  );

  assert.throws(() =>
    buildOllamaRequestPlan(
      {
        prompt: "prompt",
        messages: [
          {
            role: "user",
            content: "message",
          },
        ],
      },
      defaultModel.model,
    ),
  );

  assert.throws(() =>
    buildOllamaRequestPlan(
      {},
      defaultModel.model,
    ),
  );

  pass(
    "shared client rejects ambiguous or empty Ollama requests",
  );

  const routerSource =
    await source(
      "lib/chernobog/router.ts",
    );

  assert.equal(
    routerSource.includes(
      "fetch(",
    ),
    false,
  );

  assert.equal(
    routerSource.includes(
      "OLLAMA_URL",
    ),
    false,
  );

  assert.equal(
    routerSource.includes(
      "generateWithOllama",
    ),
    true,
  );

  assert.equal(
    routerSource.includes(
      'route === "planner"',
    ),
    true,
  );

  pass(
    "legacy conversational router no longer owns an Ollama network client and uses role-aware shared runtime",
  );

  const intentSource =
    await source(
      "lib/chernobog/tools/intent.ts",
    );

  assert.equal(
    intentSource.includes(
      "fetch(",
    ),
    false,
  );

  assert.equal(
    intentSource.includes(
      "OLLAMA_URL",
    ),
    false,
  );

  assert.equal(
    intentSource.includes(
      "generateWithOllama",
    ),
    true,
  );

  assert.equal(
    intentSource.includes(
      'format: "json"',
    ),
    true,
  );

  pass(
    "tool-intent classification now uses the shared runtime and common structured-output transport",
  );

  const clientSource =
    await source(
      "lib/chernobog/llm/ollamaClient.ts",
    );

  assert.equal(
    clientSource.includes(
      'type: "model.requested"',
    ),
    true,
  );

  assert.equal(
    clientSource.includes(
      '"model.completed"',
    ),
    true,
  );

  assert.equal(
    clientSource.includes(
      '"model.failed"',
    ),
    true,
  );

  assert.equal(
    clientSource.includes(
      "getOllamaChatUrl",
    ),
    true,
  );

  assert.equal(
    clientSource.includes(
      "signal?: AbortSignal",
    ),
    true,
  );

  pass(
    "all consolidated model calls inherit Event Spine lifecycle telemetry, timeout, and cancellation support",
  );

  const runtimeConfigSource =
    await source(
      "lib/chernobog/runtimeConfig.ts",
    );

  assert.equal(
    runtimeConfigSource.includes(
      "getOllamaChatUrl",
    ),
    true,
  );

  assert.equal(
    runtimeConfigSource.includes(
      "rewriteKnownOllamaEndpoint",
    ),
    true,
  );

  pass(
    "runtime configuration is now the single endpoint authority for Ollama generate/chat transport",
  );

  if (previousOllamaUrl === undefined) {
    delete process.env.OLLAMA_URL;
  } else {
    process.env.OLLAMA_URL =
      previousOllamaUrl;
  }

  if (previousBaseUrl === undefined) {
    delete process.env.OLLAMA_BASE_URL;
  } else {
    process.env.OLLAMA_BASE_URL =
      previousBaseUrl;
  }

  console.log(
    "=====================================================",
  );
  console.log(
    "PASS Phase 11A-A Ollama Runtime Consolidation acceptance",
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
