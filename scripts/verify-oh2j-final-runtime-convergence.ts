import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import * as ts from "typescript";

const repo = process.cwd();

function read(
  rel: string,
): string {
  return fs.readFileSync(
    path.join(
      repo,
      ...rel.split("/"),
    ),
    "utf8",
  )
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

function exists(
  rel: string,
): boolean {
  return fs.existsSync(
    path.join(
      repo,
      ...rel.split("/"),
    ),
  );
}

function walk(
  rootRel: string,
): string[] {
  const root =
    path.join(
      repo,
      ...rootRel.split("/"),
    );

  if (!fs.existsSync(root)) {
    return [];
  }

  const output:
    string[] = [];
  const stack = [root];

  while (stack.length) {
    const dir =
      stack.pop()!;

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
          ".git",
        ].includes(
          entry.name,
        )
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

function pass(
  message: string,
): void {
  console.log(
    `PASS ${message}`,
  );
}

const productionRoots = [
  "app",
  "apps",
  "components",
  "lib",
  "packages",
  "services",
];

const productionFiles =
  productionRoots
    .flatMap(walk)
    .filter(
      (rel) =>
        !rel.startsWith(
          "scripts/",
        ) &&
        !rel.includes(
          "/__tests__/",
        ) &&
        !rel.includes(
          "/tests/",
        ) &&
        !rel.includes(
          "/test/",
        ),
    );

function countMatches(
  pattern: RegExp,
): string[] {
  return productionFiles
    .filter(
      (rel) =>
        pattern.test(
          read(rel),
        ),
    );
}

function moduleSpecifiers(
  rel: string,
): string[] {
  const sourceText =
    read(rel);

  const scriptKind =
    rel.endsWith(".tsx")
      ? ts.ScriptKind.TSX
      : /\.(?:js|jsx|mjs|cjs)$/.test(
          rel,
        )
        ? ts.ScriptKind.JS
        : ts.ScriptKind.TS;

  const sourceFile =
    ts.createSourceFile(
      rel,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      scriptKind,
    );

  const modules:
    string[] = [];

  for (
    const statement
    of sourceFile.statements
  ) {
    if (
      (
        ts.isImportDeclaration(
          statement,
        ) ||
        ts.isExportDeclaration(
          statement,
        )
      ) &&
      statement.moduleSpecifier &&
      ts.isStringLiteral(
        statement.moduleSpecifier,
      )
    ) {
      modules.push(
        statement.moduleSpecifier.text,
      );
    }
  }

  return modules;
}

function namedImportExists(
  rel: string,
  moduleNames: Set<string>,
  importedSymbol: string,
): boolean {
  const sourceText =
    read(rel);

  const scriptKind =
    rel.endsWith(".tsx")
      ? ts.ScriptKind.TSX
      : /\.(?:js|jsx|mjs|cjs)$/.test(
          rel,
        )
        ? ts.ScriptKind.JS
        : ts.ScriptKind.TS;

  const sourceFile =
    ts.createSourceFile(
      rel,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      scriptKind,
    );

  for (
    const statement
    of sourceFile.statements
  ) {
    if (
      !ts.isImportDeclaration(
        statement,
      ) ||
      !ts.isStringLiteral(
        statement.moduleSpecifier,
      ) ||
      !moduleNames.has(
        statement.moduleSpecifier.text,
      )
    ) {
      continue;
    }

    const bindings =
      statement.importClause
        ?.namedBindings;

    if (
      !bindings ||
      !ts.isNamedImports(bindings)
    ) {
      continue;
    }

    for (
      const element
      of bindings.elements
    ) {
      const importedName =
        element.propertyName?.text ??
        element.name.text;

      if (
        importedName ===
          importedSymbol
      ) {
        return true;
      }
    }
  }

  return false;
}

async function main():
  Promise<void> {
  console.log(
    "Chernobog OH-2J — Final Runtime Convergence Acceptance",
  );
  console.log(
    "======================================================",
  );

  const chatRoute =
    read(
      "app/api/chat/route.ts",
    );

  assert.equal(
    chatRoute.includes(
      "runCommandPipeline",
    ),
    true,
  );

  pass(
    "Ingress has one canonical chat pipeline entrypoint",
  );

  const runCommand =
    read(
      "lib/chernobog/pipeline/runCommand.ts",
    );

  assert.equal(
    runCommand.includes(
      "getDialogueRuntime().runTurn(",
    ),
    true,
  );

  assert.equal(
    runCommand.includes(
      "getRouterRuntime().resolveRoute(",
    ),
    true,
  );

  assert.equal(
    runCommand.includes(
      "getPlannerRuntime().runPlanning(",
    ),
    true,
  );

  assert.equal(
    runCommand.includes(
      "getPlannerRuntime().runOrchestration(",
    ),
    true,
  );

  assert.equal(
    runCommand.includes(
      "getStateRuntime().bindSession(",
    ),
    true,
  );

  pass(
    "command runtime converges through Dialogue, Router, Planner, and State authorities",
  );

  const runtimeDefinitions = [
    [
      "DialogueRuntime",
      /\bclass\s+DialogueRuntime\b/,
      "packages/runtime/src/dialogueRuntime.ts",
    ],
    [
      "RouterRuntime",
      /\bclass\s+RouterRuntime\b/,
      "packages/runtime/src/routerRuntime.ts",
    ],
    [
      "PlannerRuntime",
      /\bclass\s+PlannerRuntime\b/,
      "packages/runtime/src/plannerRuntime.ts",
    ],
    [
      "ActionRuntime",
      /\bclass\s+ActionRuntime\b/,
      "packages/runtime/src/actionRuntime.ts",
    ],
    [
      "StateRuntime",
      /\bclass\s+StateRuntime\b/,
      "packages/runtime/src/stateRuntime.ts",
    ],
    [
      "LifecycleRuntime",
      /\bclass\s+LifecycleRuntime\b/,
      "packages/runtime/src/lifecycleRuntime.ts",
    ],
  ] as const;

  for (
    const [
      name,
      pattern,
      expected,
    ]
    of runtimeDefinitions
  ) {
    const hits =
      countMatches(
        pattern,
      );

    assert.deepEqual(
      hits,
      [expected],
      `${name} has competing production definitions`,
    );
  }

  pass(
    "Dialogue, Router, Planner, Action, State, and Lifecycle authorities are singular",
  );

  const initiative =
    read(
      "lib/chernobog/cognition/initiativeDecision.ts",
    );

  assert.equal(
    initiative.includes(
      "getActionRuntime",
    ),
    true,
  );

  pass(
    "cognition initiative decision is an implementation leaf behind ActionRuntime",
  );

  const governed =
    read(
      "lib/chernobog/execution/governedToolExecution.ts",
    );

  assert.equal(
    governed.includes(
      "await ensureChernobogEventStateConvergence();",
    ),
    true,
  );

  assert.equal(
    governed.includes(
      "await runExecutionTask(",
    ),
    true,
  );

  const execution =
    read(
      "lib/chernobog/execution/runExecutionTask.ts",
    );

  assert.equal(
    execution.includes(
      "evaluateTaskRuntimeGovernance(",
    ) &&
      execution.includes(
        "evaluateStepRuntimeGovernance(",
      ),
    true,
  );

  assert.equal(
    execution.includes(
      "publishExecutionLifecycleEvent(",
    ) &&
      execution.includes(
        "publishExecutionStepLifecycleEvent(",
      ),
    true,
  );

  pass(
    "Trust -> governed ExecutionTask -> Tool -> Event path remains mandatory",
  );

  const convergence =
    read(
      "lib/chernobog/runtime/eventStateConvergence.ts",
    );

  assert.equal(
    convergence.includes(
      "eventBus.subscribe(",
    ) &&
      convergence.includes(
        "await eventBus.replay(",
      ),
    true,
  );

  for (
    const key
    of [
      "worldState",
      "execution",
      "activeTask",
      "runtimeHealth",
    ]
  ) {
    assert.equal(
      convergence.includes(
        `"${key}"`,
      ),
      true,
      `missing StateRuntime projection ${key}`,
    );
  }

  pass(
    "Event Spine -> StateRuntime convergence remains authoritative",
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

  pass(
    "runtimeHealth remains owned by LifecycleRuntime and projected by StateRuntime",
  );

  /*
   * OH-1E intentionally preserved one provider transport implementation at
   * lib/chernobog/llm/ollamaClient.ts. packages/models/providerAdapter delegates
   * to that single transport; this is an implementation leaf, not a second
   * model runtime authority.
   */
  const providerAdapterModules =
    moduleSpecifiers(
      "packages/models/src/providerAdapter.ts",
    );

  assert.equal(
    providerAdapterModules.some(
      (moduleName) =>
        moduleName.includes(
          "lib/chernobog/llm/ollamaClient",
        ) ||
        moduleName ===
          "../../../lib/chernobog/llm/ollamaClient" ||
        moduleName ===
          "@/lib/chernobog/llm/ollamaClient",
    ),
    true,
  );

  pass(
    "models providerAdapter delegates to the single accepted legacy-path Ollama transport implementation",
  );

  const internalHandlers =
    read(
      "lib/chernobog/execution/internalExecutionHandlers.ts",
    );

  assert.equal(
    internalHandlers.includes(
      'from "../llm/ollamaClient"',
    ),
    true,
  );

  assert.equal(
    internalHandlers.includes(
      'from "../llm/modelRouter"',
    ),
    true,
  );

  pass(
    "internal execution preserves accepted source-sensitive model compatibility edges",
  );

  /*
   * The remaining lib/chernobog/llm tree must not define competing runtime
   * authority classes/singletons. It can remain as provider implementation
   * and historical compatibility surface.
   */
  const legacyLlmFiles =
    walk(
      "lib/chernobog/llm",
    );

  for (
    const rel
    of legacyLlmFiles
  ) {
    const source =
      read(rel);

    assert.equal(
      /\bclass\s+(?:DialogueRuntime|RouterRuntime|PlannerRuntime|ActionRuntime|StateRuntime|LifecycleRuntime)\b/.test(
        source,
      ),
      false,
      `${rel} defines a competing Runtime authority`,
    );

    assert.equal(
      /\bfunction\s+get(?:Dialogue|Router|Planner|Action|State|Lifecycle)Runtime\b/.test(
        source,
      ),
      false,
      `${rel} defines a competing Runtime singleton`,
    );
  }

  pass(
    "legacy LLM tree contains no competing Dialogue/Router/Planner/Action/State/Lifecycle authority",
  );

  const lowLevelModelImports:
    string[] = [];

  const lowLevelModules =
    new Set([
      "@chernobog/models",
      "@chernobog/models/gateway",
    ]);

  for (
    const rel
    of productionFiles
  ) {
    if (
      rel.startsWith(
        "packages/models/src/",
      )
    ) {
      continue;
    }

    if (
      namedImportExists(
        rel,
        lowLevelModules,
        "generateWithModel",
      )
    ) {
      lowLevelModelImports.push(
        rel,
      );
    }
  }

  assert.deepEqual(
    lowLevelModelImports,
    [],
  );

  pass(
    "no external production caller imports the low-level Model Gateway generation entrypoint",
  );

  const fileWorkflow =
    read(
      "lib/modules/file-workflow/index.ts",
    );

  assert.equal(
    fileWorkflow.includes(
      "const executeTool = tool.execute as",
    ),
    true,
  );

  pass(
    "file-workflow executeTool is a local descriptor invocation, not a competing Tool Gateway",
  );

  assert.equal(
    convergence.includes(
      "const registry =\n    new ChernobogWorldStateRegistry();",
    ) &&
      convergence.includes(
        "registry.replace(",
      ),
    true,
  );

  pass(
    "World State replacement in convergence is a detached projection, not canonical domain mutation",
  );

  const finalAuthority =
    JSON.parse(
      read(
        "docs/overhaul/OH-2J-final-runtime-authority.json",
      ),
    );

  assert.equal(
    finalAuthority.stage,
    "OH-2J",
  );

  assert.deepEqual(
    finalAuthority.pipeline,
    [
      "Ingress",
      "Dialogue",
      "Route",
      "Plan / Action",
      "Trust",
      "Tool",
      "Event",
      "State",
      "Response",
    ],
  );

  assert.equal(
    finalAuthority.parallelLegacyRuntime,
    false,
  );

  assert.equal(
    finalAuthority.legacyLlmTree
      ?.classification,
    "IMPLEMENTATION-LEAF / COMPATIBILITY",
  );

  pass(
    "final authority manifest classifies remaining legacy-path model files as non-authoritative implementation/compatibility leaves",
  );

  console.log(
    "======================================================",
  );
  console.log(
    "PASS OH-2J Final Runtime Convergence Acceptance",
  );
}

void main().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);
