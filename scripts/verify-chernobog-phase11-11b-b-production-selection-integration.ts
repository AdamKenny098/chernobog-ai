import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";

import {
  resolveReliableOllamaSelection,
} from "../lib/chernobog/llm";
import type {
  OllamaRuntimeReadiness,
} from "../lib/chernobog/llm";

function pass(
  message: string,
): void {
  console.log(
    `PASS ${message}`,
  );
}

function readiness(
  overrides:
    Partial<OllamaRuntimeReadiness> = {},
): OllamaRuntimeReadiness {
  return {
    ready: false,
    role: "code",
    configuredModel:
      "missing-code-model:7b",
    providerStatus:
      "healthy",
    installedModels: [
      "deepseek-coder-v2:16b",
      "gemma3:latest",
    ],
    checkedAt:
      "2026-08-26T02:00:00.000Z",
    cached: false,
    failureKind:
      "model-unavailable",
    reason:
      "primary missing",
    ...overrides,
  };
}

async function main():
  Promise<void> {
  console.log(
    "Chernobog Phase 11B-B - Production Selection Integration",
  );
  console.log(
    "=========================================================",
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
      "missing-code-model:7b";

    const fallback =
      resolveReliableOllamaSelection(
        "code",
        readiness(),
      );

    assert.ok(
      fallback,
    );

    assert.equal(
      fallback?.reason,
      "fallback-selected",
    );

    assert.equal(
      fallback?.selectedModel,
      "deepseek-coder-v2:16b",
    );

    assert.equal(
      fallback?.fallbackUsed,
      true,
    );

    pass(
      "healthy provider can route around an unavailable primary model using the explicit candidate chain",
    );

    const providerDown =
      resolveReliableOllamaSelection(
        "code",
        readiness({
          providerStatus:
            "unavailable",
          installedModels: [],
          failureKind:
            "provider-unavailable",
        }),
      );

    assert.equal(
      providerDown,
      undefined,
    );

    pass(
      "model fallback never bypasses provider-health failure",
    );

    const unrelatedOnly =
      resolveReliableOllamaSelection(
        "code",
        readiness({
          installedModels: [
            "mistral:latest",
          ],
        }),
      );

    assert.ok(
      unrelatedOnly,
    );

    assert.equal(
      unrelatedOnly?.reason,
      "no-available-candidate",
    );

    assert.equal(
      unrelatedOnly?.selectedModel,
      undefined,
    );

    pass(
      "production selection still refuses arbitrary installed models outside the explicit routing chain",
    );

    const clientSource =
      await readFile(
        "lib/chernobog/llm/ollamaClient.ts",
        "utf8",
      );

    assert.equal(
      clientSource.includes(
        "modelOverride?: string",
      ),
      true,
    );

    assert.equal(
      clientSource.includes(
        "executionModel",
      ),
      true,
    );

    pass(
      "low-level Ollama transport can execute an exact higher-level selected model without owning fallback policy",
    );

    const reliableSource =
      await readFile(
        "lib/chernobog/llm/reliableOllama.ts",
        "utf8",
      );

    assert.equal(
      reliableSource.includes(
        "selectAvailableModel",
      ),
      true,
    );

    assert.equal(
      reliableSource.includes(
        "modelOverride:",
      ),
      true,
    );

    assert.equal(
      reliableSource.includes(
        '"model.route.selected"',
      ),
      true,
    );

    pass(
      "reliable production runtime selects the model, executes that exact model, and publishes the routing decision",
    );

    assert.equal(
      reliableSource.includes(
        "candidateCount",
      ),
      true,
    );

    assert.equal(
      reliableSource.includes(
        "installedModels",
      ),
      true,
    );

    const routeEventBlock =
      reliableSource.slice(
        reliableSource.indexOf(
          '"model.route.selected"',
        ),
        reliableSource.indexOf(
          "export async function generateWithReliableOllama",
        ),
      );

    assert.equal(
      routeEventBlock.includes(
        "installedModels:",
      ),
      false,
    );

    pass(
      "routing telemetry exposes the decision without publishing raw provider model inventory",
    );

    const selectionKeys =
      fallback
        ? Object.keys(
            fallback,
          )
        : [];

    assert.equal(
      selectionKeys.includes(
        "execute",
      ),
      false,
    );

    assert.equal(
      selectionKeys.includes(
        "permission",
      ),
      false,
    );

    pass(
      "production model selection remains separate from execution authority and governance",
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
    "=========================================================",
  );
  console.log(
    "PASS Phase 11B-B Production Selection Integration acceptance",
  );
}

void main().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);
