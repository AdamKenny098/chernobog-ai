import assert from "node:assert/strict";

import {
  findInstalledOllamaModelMatch,
  getModelCandidates,
  selectAvailableModel,
} from "../lib/chernobog/llm";

function pass(
  message: string,
): void {
  console.log(
    `PASS ${message}`,
  );
}

async function main():
  Promise<void> {
  console.log(
    "Chernobog Phase 11B-A - Availability-Aware Model Selection",
  );
  console.log(
    "==========================================================",
  );

  const previousDefault =
    process.env.OLLAMA_MODEL;

  const previousCode =
    process.env
      .OLLAMA_CODE_MODEL;

  try {
    process.env.OLLAMA_MODEL =
      "gemma3";

    process.env.OLLAMA_CODE_MODEL =
      "deepseek-coder-v2:16b";

    assert.equal(
      findInstalledOllamaModelMatch(
        "gemma3",
        [
          "gemma3:latest",
        ],
      ),
      "gemma3:latest",
    );

    assert.equal(
      findInstalledOllamaModelMatch(
        "deepseek-coder-v2:16b",
        [
          "deepseek-coder-v2:16b",
          "deepseek-coder-v2:latest",
        ],
      ),
      "deepseek-coder-v2:16b",
    );

    pass(
      "shared model matching preserves exact tagged matches and Ollama :latest semantics",
    );

    const primary =
      selectAvailableModel(
        "code",
        [
          "deepseek-coder-v2:16b",
          "gemma3:latest",
        ],
      );

    assert.equal(
      primary.reason,
      "primary-available",
    );

    assert.equal(
      primary.selectedModel,
      "deepseek-coder-v2:16b",
    );

    assert.equal(
      primary.fallbackUsed,
      false,
    );

    pass(
      "requested role keeps its primary configured model when that model is installed",
    );

    process.env
      .OLLAMA_CODE_MODEL =
      "missing-code-model:7b";

    const builtinFallback =
      selectAvailableModel(
        "code",
        [
          "deepseek-coder-v2:16b",
          "gemma3:latest",
        ],
      );

    assert.equal(
      builtinFallback.reason,
      "fallback-selected",
    );

    assert.equal(
      builtinFallback.selectedModel,
      "deepseek-coder-v2:16b",
    );

    assert.equal(
      builtinFallback.fallbackUsed,
      true,
    );

    pass(
      "code-family roles fall back deterministically to the known built-in code model",
    );

    const defaultFallback =
      selectAvailableModel(
        "planner",
        [
          "gemma3:latest",
        ],
      );

    assert.equal(
      defaultFallback.reason,
      "fallback-selected",
    );

    assert.equal(
      defaultFallback.selectedModel,
      "gemma3",
    );

    assert.equal(
      defaultFallback.selectedInstalledModel,
      "gemma3:latest",
    );

    pass(
      "planner/repair/code roles can degrade to the configured default model when code candidates are unavailable",
    );

    const none =
      selectAvailableModel(
        "repair",
        [
          "mistral:latest",
        ],
      );

    assert.equal(
      none.reason,
      "no-available-candidate",
    );

    assert.equal(
      none.selectedModel,
      undefined,
    );

    assert.equal(
      none.candidates.some(
        (candidate) =>
          candidate.model ===
          "mistral:latest",
      ),
      false,
    );

    pass(
      "router never invents an arbitrary fallback from unrelated installed models",
    );

    process.env.OLLAMA_MODEL =
      "deepseek-coder-v2:16b";

    process.env
      .OLLAMA_CODE_MODEL =
      "deepseek-coder-v2:16b";

    const deduped =
      getModelCandidates(
        "code",
      );

    assert.equal(
      deduped.filter(
        (candidate) =>
          candidate.model ===
          "deepseek-coder-v2:16b",
      ).length,
      1,
    );

    pass(
      "candidate chains are stable and deduplicated while preserving precedence",
    );

    const repeatedOne =
      selectAvailableModel(
        "code",
        [
          "gemma3:latest",
          "deepseek-coder-v2:16b",
        ],
      );

    const repeatedTwo =
      selectAvailableModel(
        "code",
        [
          "gemma3:latest",
          "deepseek-coder-v2:16b",
        ],
      );

    assert.deepEqual(
      repeatedOne,
      repeatedTwo,
    );

    pass(
      "selection decisions are deterministic for identical role and installed-model inputs",
    );

    const keys =
      Object.keys(
        repeatedOne,
      );

    assert.equal(
      keys.includes(
        "execute",
      ),
      false,
    );

    assert.equal(
      keys.includes(
        "permission",
      ),
      false,
    );

    assert.equal(
      keys.includes(
        "prompt",
      ),
      false,
    );

    pass(
      "11B-A selects models only and does not absorb execution, governance, or prompt content",
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
    "==========================================================",
  );
  console.log(
    "PASS Phase 11B-A Availability-Aware Model Selection acceptance",
  );
}

void main().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);
