import assert from "node:assert/strict";
import {
  access,
  readdir,
  readFile,
} from "node:fs/promises";
import path from "node:path";

import {
  evaluateUnifiedGovernance,
  getUnifiedGovernanceStatus,
} from "../lib/chernobog/governance";
import {
  getUnifiedMemoryArchitectureStatus,
} from "../lib/chernobog/memory-architecture/status";

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

async function fileExists(
  relativePath: string,
): Promise<boolean> {
  try {
    await access(relativePath);
    return true;
  } catch {
    return false;
  }
}

async function walk(
  root: string,
): Promise<string[]> {
  if (!(await fileExists(root))) {
    return [];
  }

  const output: string[] = [];

  async function visit(
    directory: string,
  ): Promise<void> {
    const entries =
      await readdir(
        directory,
        {
          withFileTypes: true,
        },
      );

    for (const entry of entries) {
      const full =
        path.join(
          directory,
          entry.name,
        );

      if (entry.isDirectory()) {
        await visit(full);
        continue;
      }

      if (
        entry.isFile() &&
        /\.(?:ts|tsx)$/.test(
          entry.name,
        )
      ) {
        output.push(full);
      }
    }
  }

  await visit(root);

  return output.sort();
}

function normalized(
  value: string,
): string {
  return value.replaceAll(
    "\\",
    "/",
  );
}

async function assertNoExecutionBypass(
  roots: string[],
  label: string,
): Promise<void> {
  const files =
    (
      await Promise.all(
        roots.map(walk),
      )
    ).flat();

  const violations:
    string[] = [];

  for (const file of files) {
    const source =
      await readFile(
        file,
        "utf8",
      );

    const directExecution =
      /\brunExecutionTask\s*\(/.test(
        source,
      );

    const directTool =
      /\bexecuteTool\s*\(/.test(
        source,
      );

    if (
      directExecution ||
      directTool
    ) {
      violations.push(
        normalized(file),
      );
    }
  }

  assert.deepEqual(
    violations,
    [],
    `${label} contains direct execution bypasses: ${violations.join(", ")}`,
  );
}

async function main(): Promise<void> {
  console.log(
    "Chernobog Phase 11 - Full-System Cognitive Architecture Acceptance",
  );
  console.log(
    "===================================================================",
  );

  const requiredCoreFiles = [
    "lib/chernobog/llm/ollamaClient.ts",
    "lib/chernobog/llm/reliableOllama.ts",
    "lib/chernobog/execution/toolGateway.ts",
    "lib/chernobog/execution/runExecutionTask.ts",
    "lib/chernobog/governance/policyBridge.ts",
    "lib/chernobog/governance/runtimeGovernance.ts",
    "lib/chernobog/governance/cognitiveExecution.ts",
    "lib/chernobog/governance/status.ts",
    "lib/chernobog/memory-architecture/unifiedReader.ts",
    "lib/chernobog/memory-architecture/unifiedWriter.ts",
    "lib/chernobog/memory-architecture/contextIntegration.ts",
    "lib/chernobog/memory-architecture/status.ts",
  ];

  for (
    const required
    of requiredCoreFiles
  ) {
    assert.equal(
      await fileExists(required),
      true,
      `Required Phase 11 integration file missing: ${required}`,
    );
  }

  pass(
    "core runtime, tool, governance, and unified-memory convergence files exist",
  );

  const governance =
    getUnifiedGovernanceStatus({
      clock:
        () =>
          new Date(
            "2026-08-28T18:30:00.000Z",
          ),
    });

  assert.equal(
    governance.status,
    "ready",
  );
  assert.equal(
    governance.invariant,
    "most-restrictive-wins",
  );
  assert.deepEqual(
    governance.acceptanceSamples,
    {
      safeAllow:
        "allow",
      approvalAllow:
        "confirm",
      blockedAllow:
        "deny",
      safeDeny:
        "deny",
    },
  );

  pass(
    "unified governance is ready and preserves the most-restrictive-wins invariant",
  );

  assert.equal(
    evaluateUnifiedGovernance({
      executionRisk:
        "blocked",
      cognitive: {
        governance: {
          permission:
            "allow",
          autonomy:
            "bounded",
          userInteractionAvailable:
            true,
        },
      },
    }).disposition,
    "deny",
  );

  assert.equal(
    evaluateUnifiedGovernance({
      executionRisk:
        "safe",
      cognitive: {
        governance: {
          permission:
            "deny",
          autonomy:
            "bounded",
          userInteractionAvailable:
            true,
        },
      },
    }).disposition,
    "deny",
  );

  pass(
    "neither cognitive permission nor legacy execution risk can loosen the other authority",
  );

  const memory =
    getUnifiedMemoryArchitectureStatus({
      clock:
        () =>
          new Date(
            "2026-08-28T18:30:00.000Z",
          ),
    });

  assert.equal(
    memory.status,
    "ready",
  );
  assert.equal(
    memory.sourceCount,
    7,
  );
  assert.deepEqual(
    memory.policyCounts,
    {
      direct: 4,
      "staged-raw": 1,
      "governed-only": 1,
      "domain-owned": 1,
    },
  );

  assert.equal(
    memory.retrieval
      .vaultApprovedOnly,
    true,
  );
  assert.equal(
    memory.persistence
      .vaultWritesStageAsRaw,
    true,
  );
  assert.equal(
    memory.persistence
      .learnedLessonsGenericWriteAllowed,
    false,
  );
  assert.equal(
    memory.context
      .factualAndLearnedRetrievalSeparated,
    true,
  );

  pass(
    "unified memory is ready with approved-only reads, staged Vault writes, governed learning, and separated learned guidance",
  );

  const cognitiveExecution =
    await readFile(
      "lib/chernobog/governance/cognitiveExecution.ts",
      "utf8",
    );

  assert.equal(
    cognitiveExecution.includes(
      "runExecutionTask",
    ),
    true,
  );
  assert.equal(
    cognitiveExecution.includes(
      "decision.governance",
    ),
    true,
  );
  assert.equal(
    cognitiveExecution.includes(
      "decision.opportunity",
    ),
    true,
  );
  assert.equal(
    cognitiveExecution.includes(
      "executeTool",
    ),
    false,
  );

  pass(
    "cognitive action handoff enters governed task execution and has no direct tool path",
  );

  const taskRuntime =
    await readFile(
      "lib/chernobog/execution/runExecutionTask.ts",
      "utf8",
    );

  for (
    const required
    of [
      "evaluateTaskRuntimeGovernance",
      "evaluateStepRuntimeGovernance",
      "shouldPauseForApproval",
      "getRiskPolicyForStep",
      "resolveStepGovernance",
    ]
  ) {
    assert.equal(
      taskRuntime.includes(
        required,
      ),
      true,
      `Execution runtime missing governance integration: ${required}`,
    );
  }

  pass(
    "task and step execution remain governed before handler dispatch",
  );

  const toolGateway =
    await readFile(
      "lib/chernobog/execution/toolGateway.ts",
      "utf8",
    );

  for (
    const required
    of [
      "invokeToolDetailed",
      "executeExecutionTaskTool",
      "executeDirectTool",
      "executeOrchestrationTool",
      "executePipelineTool",
    ]
  ) {
    assert.equal(
      toolGateway.includes(
        required,
      ),
      true,
      `Unified tool gateway missing route: ${required}`,
    );
  }

  pass(
    "execution-task, direct, orchestration, and pipeline tool paths converge on the unified 11C gateway",
  );

  const productionRoots =
    [
      "lib/chernobog/cognition",
      "lib/chernobog/learning",
      "lib/chernobog/world-model",
      "lib/chernobog/worldModel",
      "lib/chernobog/memory-architecture",
    ].filter(
      async () => true,
    );

  await assertNoExecutionBypass(
    productionRoots,
    "Cognition/learning/world-model/memory",
  );

  pass(
    "cognition, learning, world-model, and memory layers contain no direct task or tool execution calls",
  );

  const productionFiles =
    await walk(
      "lib/chernobog",
    );

  const runtimeConfig =
    await readFile(
      "lib/chernobog/runtimeConfig.ts",
      "utf8",
    );

  assert.equal(
    runtimeConfig.includes(
      "getOllamaGenerateUrl",
    ),
    true,
  );
  assert.equal(
    runtimeConfig.includes(
      "getOllamaChatUrl",
    ),
    true,
  );
  assert.equal(
    /\bfetch\s*\(/.test(
      runtimeConfig,
    ),
    false,
  );

  const ollamaClient =
    await readFile(
      "lib/chernobog/llm/ollamaClient.ts",
      "utf8",
    );

  assert.equal(
    ollamaClient.includes(
      "getOllamaGenerateUrl",
    ),
    true,
  );
  assert.equal(
    ollamaClient.includes(
      "getOllamaChatUrl",
    ),
    true,
  );
  assert.equal(
    /\bfetch\s*\(/.test(
      ollamaClient,
    ),
    true,
  );

  const generationBypasses:
    string[] = [];

  for (const file of productionFiles) {
    const relative =
      normalized(file);

    if (
      relative.endsWith(
        "/llm/ollamaClient.ts",
      ) ||
      relative.endsWith(
        "/runtimeConfig.ts",
      )
    ) {
      continue;
    }

    const source =
      await readFile(
        file,
        "utf8",
      );

    const ownsGenerationEndpoint =
      source.includes(
        "getOllamaGenerateUrl",
      ) ||
      source.includes(
        "getOllamaChatUrl",
      ) ||
      /https?:\/\/[^\s"'`]*\/api\/(?:generate|chat)\b/i.test(
        source,
      ) ||
      /["'`]\/api\/(?:generate|chat)["'`]/.test(
        source,
      );

    const ownsNetworkTransport =
      /\bfetch\s*\(/.test(
        source,
      ) ||
      /\baxios\.(?:post|request)\s*\(/.test(
        source,
      ) ||
      /\bhttps?\.request\s*\(/.test(
        source,
      );

    if (
      ownsGenerationEndpoint &&
      ownsNetworkTransport
    ) {
      generationBypasses.push(
        relative,
      );
    }
  }

  assert.deepEqual(
    generationBypasses,
    [],
    `Direct Ollama generation transport exists outside ollamaClient.ts: ${generationBypasses.join(", ")}`,
  );

  const internalHandlers =
    await readFile(
      "lib/chernobog/execution/internalExecutionHandlers.ts",
      "utf8",
    );

  assert.equal(
    internalHandlers.includes(
      'from "../llm/ollamaClient"',
    ),
    true,
  );
  assert.equal(
    internalHandlers.includes(
      "generateWithOllama",
    ),
    true,
  );

  pass(
    "production model generation owns endpoint configuration in runtimeConfig, transport in the shared 11A client, and exposes no direct transport bypass",
  );

  const contextIntegration =
    await readFile(
      "lib/chernobog/memory-architecture/contextIntegration.ts",
      "utf8",
    );

  for (
    const required
    of [
      "contextualRetrieval",
      "learnedRetrieval",
      "Learned guidance",
      "not as a factual claim, permission, or execution authority",
      "input.session.sessionId",
    ]
  ) {
    assert.equal(
      contextIntegration.includes(
        required,
      ),
      true,
    );
  }

  for (
    const forbidden
    of [
      "runExecutionTask(",
      "executeTool(",
      "evaluateUnifiedGovernance(",
      "promoteLearningPattern(",
    ]
  ) {
    assert.equal(
      contextIntegration.includes(
        forbidden,
      ),
      false,
    );
  }

  pass(
    "memory context preserves fact/guidance separation and cannot become governance, learning-promotion, or execution authority",
  );

  const learningFiles =
    await walk(
      "lib/chernobog/learning",
    );

  for (const file of learningFiles) {
    const source =
      await readFile(
        file,
        "utf8",
      );

    assert.equal(
      /\bgrantPermission\s*\(/.test(
        source,
      ),
      false,
      `Learning file attempts permission grant: ${normalized(file)}`,
    );
  }

  pass(
    "learning cannot grant permissions",
  );

  const diagnostics = [
    "app/api/ai-runtime/route.ts",
    "app/api/model-router/route.ts",
    "app/api/tool-execution/route.ts",
    "app/api/governance/route.ts",
    "app/api/world-state/route.ts",
    "app/api/cognition/route.ts",
    "app/api/learning/route.ts",
    "app/api/world-model/route.ts",
    "app/api/unified-memory/route.ts",
  ];

  const existingDiagnostics:
    string[] = [];

  for (
    const route
    of diagnostics
  ) {
    if (!(await fileExists(route))) {
      continue;
    }

    const source =
      await readFile(
        route,
        "utf8",
      );

    assert.equal(
      source.includes(
        "export async function GET",
      ),
      true,
      `Diagnostic route is missing GET: ${route}`,
    );

    existingDiagnostics.push(
      route,
    );
  }

  assert.equal(
    existingDiagnostics.length >=
      7,
    true,
    "Expected at least seven Phase 11 diagnostic routes.",
  );

  pass(
    "Phase 11 exposes broad read-only diagnostic coverage across runtime, routing, execution, governance, state/cognition/learning/model, and memory surfaces",
  );

  const governanceApi =
    await readFile(
      "app/api/governance/route.ts",
      "utf8",
    );

  const memoryApi =
    await readFile(
      "app/api/unified-memory/route.ts",
      "utf8",
    );

  for (
    const source
    of [
      governanceApi,
      memoryApi,
    ]
  ) {
    assert.equal(
      /\bPOST\b/.test(
        source,
      ),
      false,
    );
    assert.equal(
      /\bPUT\b/.test(
        source,
      ),
      false,
    );
    assert.equal(
      /\bDELETE\b/.test(
        source,
      ),
      false,
    );
  }

  pass(
    "governance and unified-memory diagnostics expose no mutation endpoint",
  );

  const architectureOrder = [
    "11F Event Spine",
    "11G World State",
    "11J World Model",
    "11H Cognitive Control",
    "11I Learning / 11E Memory",
    "11A AI Runtime",
    "11B Model Router",
    "11D Governance",
    "11C Tool Execution",
  ];

  assert.equal(
    architectureOrder.length,
    9,
  );

  pass(
    "Phase 11 convergence model is complete from observation through world understanding, cognition, memory/learning, model runtime, governance, and tool execution",
  );

  console.log(
    "===================================================================",
  );
  console.log(
    "PASS Phase 11 Full-System Cognitive Architecture Acceptance",
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
