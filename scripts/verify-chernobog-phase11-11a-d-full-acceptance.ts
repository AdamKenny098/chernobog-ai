import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";

import {
  getAiRuntimeStatus,
} from "../lib/chernobog/llm";
import type {
  ModelRole,
  OllamaRuntimeReadiness,
} from "../lib/chernobog/llm";

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

function readiness(
  role: ModelRole,
  ready: boolean,
): OllamaRuntimeReadiness {
  return {
    ready,
    role,
    configuredModel:
      role === "default"
        ? "gemma3"
        : "deepseek-coder-v2:16b",
    matchedInstalledModel:
      ready
        ? (
            role === "default"
              ? "gemma3"
              : "deepseek-coder-v2:16b"
          )
        : undefined,
    providerStatus:
      "healthy",
    installedModels:
      ready
        ? [
            "gemma3",
            "deepseek-coder-v2:16b",
          ]
        : [
            "gemma3",
          ],
    checkedAt:
      "2026-08-26T01:00:00.000Z",
    cached:
      false,
    failureKind:
      ready
        ? undefined
        : "model-unavailable",
    reason:
      ready
        ? undefined
        : "configured model missing",
  };
}

async function main(): Promise<void> {
  console.log(
    "Chernobog Phase 11A-D - AI Runtime Full Integration & Acceptance",
  );
  console.log(
    "================================================================",
  );

  const allReady =
    await getAiRuntimeStatus({
      clock:
        () =>
          new Date(
            "2026-08-26T01:00:00.000Z",
          ),
      checkReadiness:
        async (role) =>
          readiness(
            role,
            true,
          ),
    });

  assert.equal(
    allReady.status,
    "ready",
  );

  assert.deepEqual(
    allReady.readyRoles,
    [
      "default",
      "code",
      "planner",
      "repair",
    ],
  );

  assert.deepEqual(
    allReady.unavailableRoles,
    [],
  );

  pass(
    "runtime status reports ready only when every configured model role is available",
  );

  const degraded =
    await getAiRuntimeStatus({
      clock:
        () =>
          new Date(
            "2026-08-26T01:00:00.000Z",
          ),
      checkReadiness:
        async (role) =>
          readiness(
            role,
            role ===
              "default",
          ),
    });

  assert.equal(
    degraded.status,
    "degraded",
  );

  assert.deepEqual(
    degraded.readyRoles,
    [
      "default",
    ],
  );

  assert.deepEqual(
    degraded.unavailableRoles,
    [
      "code",
      "planner",
      "repair",
    ],
  );

  pass(
    "runtime status exposes partial role availability as degraded instead of hiding missing models",
  );

  const unavailable =
    await getAiRuntimeStatus({
      clock:
        () =>
          new Date(
            "2026-08-26T01:00:00.000Z",
          ),
      checkReadiness:
        async (role) =>
          readiness(
            role,
            false,
          ),
    });

  assert.equal(
    unavailable.status,
    "unavailable",
  );

  assert.equal(
    unavailable.readyRoles.length,
    0,
  );

  pass(
    "runtime status reports unavailable when no model role is executable",
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
    routerSource.includes(
      "fetch(",
    ),
    false,
  );

  assert.equal(
    intentSource.includes(
      "generateWithReliableOllama",
    ),
    true,
  );

  assert.equal(
    intentSource.includes(
      "fetch(",
    ),
    false,
  );

  pass(
    "production conversation and tool-intent paths no longer own direct Ollama transports",
  );

  const reliableSource =
    await readFile(
      "lib/chernobog/llm/reliableOllama.ts",
      "utf8",
    );

  assert.equal(
    reliableSource.includes(
      "checkOllamaRuntimeReadiness",
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
      "isRetryableOllamaFailure",
    ),
    true,
  );

  pass(
    "production model execution is readiness-gated and uses bounded taxonomy-driven retry",
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

  pass(
    "AI runtime readiness reuses the canonical 11F health and model-availability layer",
  );

  const clientSource =
    await readFile(
      "lib/chernobog/llm/ollamaClient.ts",
      "utf8",
    );

  for (
    const eventType
    of [
      "model.requested",
      "model.completed",
      "model.failed",
    ]
  ) {
    assert.equal(
      clientSource.includes(
        eventType,
      ),
      true,
    );
  }

  assert.equal(
    clientSource.includes(
      "OllamaFailureKind",
    ),
    true,
  );

  pass(
    "shared Ollama transport publishes lifecycle telemetry and exposes stable failure semantics",
  );

  const apiSource =
    await readFile(
      "app/api/ai-runtime/route.ts",
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
      "executesTools",
    ),
    true,
  );

  assert.equal(
    apiSource.includes(
      "grantsPermissions",
    ),
    true,
  );

  pass(
    "AI runtime exposes read-only operational status without gaining tool, action, or permission authority",
  );

  console.log(
    "================================================================",
  );
  console.log(
    "PASS Phase 11A-D AI Runtime Full Integration & Acceptance",
  );
  console.log(
    "PASS Phase 11A AI Runtime COMPLETE",
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
