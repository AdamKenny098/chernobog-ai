import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  LifecycleRuntime,
  OLLAMA_LIFECYCLE_DEPENDENCY,
} from "../packages/runtime/src/lifecycleRuntime";

const repo = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(
    path.join(repo, rel),
    "utf8",
  ).replace(/^\uFEFF/, "");
}

function exists(rel: string): boolean {
  return fs.existsSync(
    path.join(repo, rel),
  );
}

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

function walk(rootRel: string): string[] {
  const root =
    path.join(repo, rootRel);

  if (!fs.existsSync(root)) {
    return [];
  }

  const output: string[] = [];
  const stack = [root];

  while (stack.length) {
    const dir = stack.pop()!;

    for (
      const entry
      of fs.readdirSync(
        dir,
        {
          withFileTypes: true,
        },
      )
    ) {
      if (
        [
          "node_modules",
          ".next",
          "dist",
          "build",
          "coverage",
        ].includes(entry.name)
      ) {
        continue;
      }

      const full =
        path.join(
          dir,
          entry.name,
        );

      if (entry.isDirectory()) {
        stack.push(full);
      } else if (
        /\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(
          entry.name,
        )
      ) {
        output.push(
          path.relative(
            repo,
            full,
          )
            .split(path.sep)
            .join("/"),
        );
      }
    }
  }

  return output.sort();
}

async function main():
  Promise<void> {
  console.log(
    "Chernobog OH-2I — Runtime Lifecycle Verifier",
  );
  console.log(
    "============================================",
  );

  const runtimeSource =
    read(
      "packages/runtime/src/lifecycleRuntime.ts",
    );

  const runtimeIndex =
    read(
      "packages/runtime/src/index.ts",
    );

  assert.equal(
    runtimeIndex.includes(
      'export * from "./lifecycleRuntime";',
    ),
    true,
  );

  for (
    const marker
    of [
      "export class LifecycleRuntime",
      '"recovering"',
      "runDependencyOperation",
      "observeDependency",
      "shutdown()",
      "maxRetainedDependencies = 64",
    ]
  ) {
    assert.equal(
      runtimeSource.includes(marker),
      true,
      `LifecycleRuntime marker missing: ${marker}`,
    );
  }

  pass(
    "LifecycleRuntime owns bounded generic startup/readiness/recovery/shutdown state",
  );

  const lifecycle =
    new LifecycleRuntime();

  assert.equal(
    lifecycle.snapshot().status,
    "idle",
  );

  const unavailable =
    await lifecycle
      .runDependencyOperation({
        dependencyId:
          OLLAMA_LIFECYCLE_DEPENDENCY,
        operation:
          async () => ({
            ok: false,
            attempts: 3,
          }),
        assess:
          (result) => ({
            status:
              result.ok
                ? "ready"
                : "unavailable",
            retries:
              result.attempts - 1,
          }),
      });

  assert.equal(
    unavailable.ok,
    false,
  );

  let snapshot =
    lifecycle.snapshot();

  assert.equal(
    snapshot.status,
    "unavailable",
  );

  assert.equal(
    snapshot.dependencies[0]
      ?.totalRetries,
    2,
  );

  const recovered =
    await lifecycle
      .runDependencyOperation({
        dependencyId:
          OLLAMA_LIFECYCLE_DEPENDENCY,
        operation:
          async () => ({
            ok: true,
            attempts: 2,
          }),
        assess:
          (result) => ({
            status:
              result.ok
                ? "ready"
                : "unavailable",
            retries:
              result.attempts - 1,
          }),
      });

  assert.equal(
    recovered.ok,
    true,
  );

  snapshot =
    lifecycle.snapshot();

  assert.equal(
    snapshot.status,
    "ready",
  );

  assert.equal(
    snapshot.dependencies[0]
      ?.recoveryCount,
    1,
  );

  assert.equal(
    snapshot.dependencies[0]
      ?.totalRetries,
    3,
  );

  lifecycle.shutdown();

  assert.equal(
    lifecycle.snapshot().status,
    "stopped",
  );

  pass(
    "temporary unavailability, retry accounting, recovery, and shutdown use one lifecycle",
  );

  const stateRuntime =
    read(
      "packages/runtime/src/stateRuntime.ts",
    );

  assert.equal(
    stateRuntime.includes(
      'authority: "@chernobog/runtime LifecycleRuntime"',
    ),
    true,
  );

  const convergence =
    read(
      "lib/chernobog/runtime/eventStateConvergence.ts",
    );

  assert.equal(
    convergence.includes(
      '"runtimeHealth"',
    ) &&
    convergence.includes(
      '"@chernobog/runtime LifecycleRuntime"',
    ) &&
    convergence.includes(
      "getLifecycleRuntime()",
    ),
    true,
  );

  pass(
    "StateRuntime projects LifecycleRuntime as current runtimeHealth authority",
  );

  const worldState =
    read(
      "lib/chernobog/pipeline/worldStateContext.ts",
    );

  assert.equal(
    worldState.includes(
      "await observeAndPublishOllamaHealth();",
    ),
    true,
  );

  assert.equal(
    worldState.includes(
      "getLifecycleRuntime().observeDependency(",
    ),
    true,
  );

  pass(
    "existing Event Spine Ollama observation is preserved and also updates current lifecycle state",
  );

  for (
    const rel
    of [
      "lib/chernobog/router.ts",
      "lib/chernobog/tools/intent.ts",
      "packages/tools/src/intent.ts",
    ]
  ) {
    const source =
      read(rel);

    assert.equal(
      source.includes(
        "generateWithReliableOllama",
      ),
      true,
      `${rel} lost accepted reliable model execution`,
    );

    assert.equal(
      source.includes(
        "getLifecycleRuntime()",
      ) &&
      source.includes(
        ".runDependencyOperation(",
      ),
      true,
      `${rel} does not pass model execution through LifecycleRuntime`,
    );
  }

  pass(
    "core conversation and tool-intent model calls retain accepted reliable execution behind LifecycleRuntime",
  );

  for (
    const rel
    of [
      "app/api/ai-runtime/route.ts",
      "app/api/model-router/route.ts",
    ]
  ) {
    const source =
      read(rel);

    assert.equal(
      source.includes(
        "getLifecycleRuntime()",
      ) &&
      source.includes(
        ".runDependencyOperation(",
      ),
      true,
      `${rel} bypasses LifecycleRuntime`,
    );
  }

  pass(
    "read-only runtime status APIs project provider readiness through LifecycleRuntime",
  );

  const characterBrief =
    read(
      "lib/modules/character-generator/brief/characterBriefGenerator.ts",
    );

  assert.equal(
    characterBrief.includes(
      "generateWithReliableOllama",
    ),
    true,
  );

  assert.equal(
    characterBrief.includes(
      "generateWithReliableOllama as generateWithModel",
    ),
    false,
  );

  assert.equal(
    characterBrief.includes(
      ".runDependencyOperation(",
    ),
    true,
  );

  pass(
    "Character Forge brief generation explicitly uses accepted reliable readiness/retry execution",
  );

  const lowLevelGenerationImports:
    string[] = [];

  const lowLevelImportPatterns = [
    /import\s*\{[\s\S]*?\bgenerateWithModel\b[\s\S]*?\}\s*from\s*["']@chernobog\/models["']/,
    /import\s*\{[\s\S]*?\bgenerateWithModel\b[\s\S]*?\}\s*from\s*["']@chernobog\/models\/gateway["']/,
  ];

  for (
    const root
    of [
      "app",
      "apps",
      "components",
      "lib",
      "packages",
    ]
  ) {
    for (
      const rel
      of walk(root)
    ) {
      if (
        rel ===
          "packages/models/src/gateway.ts"
      ) {
        continue;
      }

      const source =
        read(rel);

      if (
        lowLevelImportPatterns.some(
          (pattern) =>
            pattern.test(source),
        )
      ) {
        lowLevelGenerationImports.push(
          rel,
        );
      }
    }
  }

  assert.deepEqual(
    lowLevelGenerationImports,
    [],
  );

  pass(
    "no production module imports the low-level Model Gateway generation entry point",
  );

  const packageModelRuntimeImports:
    string[] = [];

  for (
    const rel
    of walk(
      "packages/models",
    )
  ) {
    const source =
      read(rel);

    if (
      /from\s+["']@chernobog\/runtime(?:\/|["'])/.test(
        source,
      )
    ) {
      packageModelRuntimeImports.push(
        rel,
      );
    }
  }

  assert.deepEqual(
    packageModelRuntimeImports,
    [],
  );

  pass(
    "LifecycleRuntime introduces no models -> runtime package cycle",
  );

  const historicalManifest =
    JSON.parse(
      read(
        "docs/overhaul/OH-2E-state-authority-map.json",
      ),
    );

  assert.equal(
    historicalManifest.stage,
    "OH-2E",
  );

  assert.equal(
    historicalManifest.fields
      ?.runtimeHealth,
    "packages/models/src/runtimeReadiness.ts",
  );

  assert.equal(
    exists(
      "docs/overhaul/OH-2I-runtime-lifecycle-authority.json",
    ),
    true,
  );

  const currentManifest =
    JSON.parse(
      read(
        "docs/overhaul/OH-2I-runtime-lifecycle-authority.json",
      ),
    );

  assert.equal(
    currentManifest.stage,
    "OH-2I",
  );

  assert.equal(
    currentManifest.authority,
    "@chernobog/runtime LifecycleRuntime",
  );

  assert.equal(
    currentManifest.delegates
      ?.modelReadiness,
    "@chernobog/models/runtimeReadiness",
  );

  assert.equal(
    currentManifest.delegates
      ?.modelRetryAndFallback,
    "@chernobog/models/reliableOllama",
  );

  pass(
    "OH-2E historical authority record is preserved while OH-2I explicitly supersedes runtimeHealth ownership",
  );

  for (
    const rel
    of [
      "lib/chernobog/llm/runtimeReadiness.ts",
      "lib/chernobog/llm/runtimeStatus.ts",
      "lib/chernobog/llm/reliableOllama.ts",
      "lib/chernobog/llm/modelFailureFallback.ts",
      "lib/chernobog/llm/modelRouterStatus.ts",
    ]
  ) {
    assert.equal(
      exists(rel),
      true,
      `legacy compatibility source missing: ${rel}`,
    );
  }

  pass(
    "historical Phase 11 compatibility mirrors remain available for accepted source-sensitive tests",
  );

  assert.equal(
    !runtimeSource.includes(
      "@chernobog/tools",
    ) &&
    !runtimeSource.includes(
      "@chernobog/trust",
    ) &&
    !runtimeSource.includes(
      "@chernobog/events",
    ),
    true,
  );

  pass(
    "LifecycleRuntime owns coordination only and does not absorb Trust, Tool, or Event authorities",
  );

  console.log(
    "============================================",
  );
  console.log(
    "PASS OH-2I Runtime Lifecycle Acceptance",
  );
}

void main().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);
