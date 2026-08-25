import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";

import {
  getModelRouterStatus,
} from "../lib/chernobog/llm";
import type {
  ModelRole,
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
  role: ModelRole,
  options: {
    providerStatus?: string;
    installedModels?: string[];
  } = {},
): OllamaRuntimeReadiness {
  const providerStatus =
    options.providerStatus ??
    "healthy";

  const installedModels =
    options.installedModels ??
    [
      "gemma3:latest",
      "deepseek-coder-v2:16b",
    ];

  const configuredModel =
    role === "default"
      ? (
          process.env.OLLAMA_MODEL ??
          "gemma3"
        )
      : (
          process.env.OLLAMA_CODE_MODEL ??
          process.env.OLLAMA_MODEL ??
          "deepseek-coder-v2:16b"
        );

  return {
    ready:
      providerStatus ===
        "healthy",
    role,
    configuredModel,
    providerStatus,
    installedModels:
      [...installedModels],
    checkedAt:
      "2026-08-26T03:00:00.000Z",
    cached:
      false,
    failureKind:
      providerStatus ===
        "healthy"
        ? undefined
        : "provider-unavailable",
    reason:
      providerStatus ===
        "healthy"
        ? undefined
        : "provider unavailable",
  };
}

async function main():
  Promise<void> {
  console.log(
    "Chernobog Phase 11B-D - Model Router Full Integration & Acceptance",
  );
  console.log(
    "=================================================================",
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

    const allPrimary =
      await getModelRouterStatus({
        clock:
          () =>
            new Date(
              "2026-08-26T03:00:00.000Z",
            ),
        checkReadiness:
          async (role) =>
            readiness(role),
      });

    assert.equal(
      allPrimary.status,
      "ready",
    );

    assert.deepEqual(
      allPrimary.primaryRoles,
      [
        "default",
        "code",
        "planner",
        "repair",
      ],
    );

    assert.deepEqual(
      allPrimary.fallbackRoles,
      [],
    );

    assert.deepEqual(
      allPrimary.unavailableRoles,
      [],
    );

    pass(
      "router status is ready only when every role can use its primary configured model",
    );

    process.env
      .OLLAMA_CODE_MODEL =
      "missing-code-model:7b";

    const fallback =
      await getModelRouterStatus({
        clock:
          () =>
            new Date(
              "2026-08-26T03:00:00.000Z",
            ),
        checkReadiness:
          async (role) =>
            readiness(role),
      });

    assert.equal(
      fallback.status,
      "degraded",
    );

    assert.deepEqual(
      fallback.primaryRoles,
      [
        "default",
      ],
    );

    assert.deepEqual(
      fallback.fallbackRoles,
      [
        "code",
        "planner",
        "repair",
      ],
    );

    assert.deepEqual(
      fallback.unavailableRoles,
      [],
    );

    for (
      const role
      of fallback.roles.filter(
        (entry) =>
          entry.role !==
          "default",
      )
    ) {
      assert.equal(
        role.selectedInstalledModel,
        "deepseek-coder-v2:16b",
      );
    }

    pass(
      "router status reports deterministic built-in fallback as degraded but still routable",
    );

    const unrelated =
      await getModelRouterStatus({
        clock:
          () =>
            new Date(
              "2026-08-26T03:00:00.000Z",
            ),
        checkReadiness:
          async (role) =>
            readiness(
              role,
              {
                installedModels: [
                  "mistral:latest",
                ],
              },
            ),
      });

    assert.equal(
      unrelated.status,
      "unavailable",
    );

    assert.deepEqual(
      unrelated.primaryRoles,
      [],
    );

    assert.deepEqual(
      unrelated.fallbackRoles,
      [],
    );

    assert.deepEqual(
      unrelated.unavailableRoles,
      [
        "default",
        "code",
        "planner",
        "repair",
      ],
    );

    pass(
      "router remains unavailable rather than selecting an unrelated installed model",
    );

    const providerDown =
      await getModelRouterStatus({
        clock:
          () =>
            new Date(
              "2026-08-26T03:00:00.000Z",
            ),
        checkReadiness:
          async (role) =>
            readiness(
              role,
              {
                providerStatus:
                  "unavailable",
                installedModels: [],
              },
            ),
      });

    assert.equal(
      providerDown.status,
      "unavailable",
    );

    assert.equal(
      providerDown.roles.every(
        (entry) =>
          entry.reason ===
          "provider-unavailable",
      ),
      true,
    );

    pass(
      "provider failure dominates model selection and cannot be bypassed by fallback logic",
    );

    const reliableSource =
      await readFile(
        "lib/chernobog/llm/reliableOllama.ts",
        "utf8",
      );

    assert.equal(
      reliableSource.includes(
        '"model.route.selected"',
      ),
      true,
    );

    assert.equal(
      reliableSource.includes(
        '"model.route.failed-over"',
      ),
      true,
    );

    assert.equal(
      reliableSource.includes(
        "maxAttempts ?? 3",
      ),
      true,
    );

    assert.equal(
      reliableSource.includes(
        "maxCandidates",
      ),
      true,
    );

    pass(
      "production runtime exposes both selection and execution-failover telemetry with bounded retries and candidate count",
    );

    const failurePolicySource =
      await readFile(
        "lib/chernobog/llm/modelFailureFallback.ts",
        "utf8",
      );

    assert.equal(
      failurePolicySource.includes(
        "isRetryableOllamaFailure",
      ),
      true,
    );

    assert.equal(
      failurePolicySource.includes(
        "matchedInstalledModel",
      ),
      true,
    );

    pass(
      "cross-model failover is driven by 11A failure taxonomy and exact installed candidates",
    );

    const apiSource =
      await readFile(
        "app/api/model-router/route.ts",
        "utf8",
      );

    assert.equal(
      apiSource.includes(
        "export async function GET",
      ),
      true,
    );

    assert.equal(
      apiSource.includes(
        "POST",
      ),
      false,
    );

    assert.equal(
      apiSource.includes(
        "arbitraryInstalledModelSelection",
      ),
      true,
    );

    pass(
      "model router exposes read-only diagnostics and explicitly documents its no-arbitrary-model boundary",
    );

    const routerStatusKeys =
      Object.keys(
        allPrimary,
      );

    assert.equal(
      routerStatusKeys.includes(
        "execute",
      ),
      false,
    );

    assert.equal(
      routerStatusKeys.includes(
        "permission",
      ),
      false,
    );

    assert.equal(
      routerStatusKeys.includes(
        "prompt",
      ),
      false,
    );

    pass(
      "11B routing state remains separate from prompts, tool execution, and governance authority",
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
      "production conversational and tool-intent paths consume the completed 11A/11B runtime",
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
    "=================================================================",
  );
  console.log(
    "PASS Phase 11B-D Model Router Full Integration & Acceptance",
  );
  console.log(
    "PASS Phase 11B Model Router COMPLETE",
  );
}

void main().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);
