#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const repo = process.cwd();
const requireFromRepo =
  createRequire(
    path.join(repo, "package.json"),
  );
const ts =
  requireFromRepo("typescript");

let failures = 0;

function pass(message) {
  console.log(`PASS ${message}`);
}

function fail(message) {
  failures += 1;
  console.log(`FAIL ${message}`);
}

function read(rel) {
  const full =
    path.join(repo, rel);

  if (!fs.existsSync(full)) {
    fail(`required file missing: ${rel}`);
    return "";
  }

  return fs
    .readFileSync(full, "utf8")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

function parse(rel, text) {
  return ts.createSourceFile(
    rel,
    text,
    ts.ScriptTarget.Latest,
    true,
    rel.endsWith(".tsx")
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS,
  );
}

function callPosition(
  rel,
  text,
  functionName,
  calleeName,
) {
  const source =
    parse(rel, text);

  const positions = [];

  function functionContext(node) {
    let current = node;

    while (current) {
      if (
        ts.isFunctionDeclaration(
          current,
        )
      ) {
        return current.name?.text ??
          "<anonymous>";
      }

      if (
        ts.isArrowFunction(
          current,
        ) ||
        ts.isFunctionExpression(
          current,
        )
      ) {
        const parent =
          current.parent;

        if (
          parent &&
          ts.isVariableDeclaration(
            parent,
          ) &&
          ts.isIdentifier(
            parent.name,
          )
        ) {
          return parent.name.text;
        }

        return "<anonymous>";
      }

      current =
        current.parent;
    }

    return "<module>";
  }

  function visit(node) {
    if (
      ts.isCallExpression(node)
    ) {
      let name = null;

      if (
        ts.isIdentifier(
          node.expression,
        )
      ) {
        name =
          node.expression.text;
      } else if (
        ts.isPropertyAccessExpression(
          node.expression,
        )
      ) {
        name =
          node
            .expression
            .name.text;
      }

      if (
        name === calleeName &&
        functionContext(node) ===
          functionName
      ) {
        positions.push(
          node.getStart(source),
        );
      }
    }

    ts.forEachChild(
      node,
      visit,
    );
  }

  visit(source);

  return positions;
}

console.log(
  "Chernobog OH-2H V6 — Event -> State Convergence",
);
console.log(
  "===================================================",
);

const bridgeRel =
  "lib/chernobog/runtime/eventStateConvergence.ts";
const bridge =
  read(bridgeRel);

if (
  bridge.includes(
    "getChernobogEventBus",
  ) &&
  bridge.includes(
    "eventBus.subscribe",
  ) &&
  bridge.includes(
    "eventBus.replay",
  )
) {
  pass(
    "Event-State bridge consumes both live Event Spine subscription and replay",
  );
} else {
  fail(
    "Event-State bridge does not prove live + replay Event Spine consumption",
  );
}

for (
  const [key, authority] of
  [
    [
      "worldState",
      "World State domain",
    ],
    [
      "execution",
      "lib/chernobog/execution",
    ],
    [
      "activeTask",
      "lib/chernobog/execution",
    ],
  ]
) {
  const expected =
    `bindDomainProjection(\n      "${key}",\n      "${authority}"`;

  if (
    bridge.includes(expected)
  ) {
    pass(
      `StateRuntime binds ${key} to accepted authority ${authority}`,
    );
  } else {
    fail(
      `StateRuntime ${key} binding missing or authority changed`,
    );
  }
}

if (
  !bridge.includes(
    "saveSessionContext",
  ) &&
  !bridge.includes(
    "executeGovernedToolAction",
  ) &&
  !bridge.includes(
    "executePipelineTool",
  ) &&
  !bridge.includes(
    "executeOrchestrationTool",
  ) &&
  !bridge.includes(
    "invokeToolDetailed",
  )
) {
  pass(
    "Event-State bridge owns no session persistence or tool execution authority",
  );
} else {
  fail(
    "Event-State bridge acquired execution/session mutation authority",
  );
}

if (
  bridge.includes(
    "getChernobogStateRuntimeWorldStateRegistry",
  ) &&
  bridge.includes(
    "registry.replace(",
  ) &&
  bridge.includes(
    "projection.value as",
  )
) {
  pass(
    "StateRuntime exposes a detached World State registry view without acquiring persistence ownership",
  );
} else {
  fail(
    "StateRuntime detached World State registry view is missing",
  );
}

if (
  bridge.includes(
    'source: "event-spine"',
  ) &&
  bridge.includes(
    "execution.started",
  ) &&
  bridge.includes(
    "execution.completed",
  ) &&
  bridge.includes(
    "execution.failed",
  ) &&
  bridge.includes(
    "execution.waiting_for_approval",
  ) &&
  bridge.includes(
    "execution.step.started",
  ) &&
  bridge.includes(
    "execution.approval.required",
  )
) {
  pass(
    "execution/activeTask projection is derived from Event Spine lifecycle events",
  );
} else {
  fail(
    "execution projection is not demonstrably Event Spine-derived",
  );
}

const runCommandSource =
  read(
    "lib/chernobog/pipeline/runCommand.ts",
  );

if (
  !runCommandSource.includes(
    "ensureChernobogEventStateConvergence",
  )
) {
  pass(
    "OH-2H does not inject Event-State lifecycle ownership into runCommand",
  );
} else {
  fail(
    "runCommand unexpectedly acquired direct OH-2H convergence ownership",
  );
}

if (
  runCommandSource.includes(
    "const worldStateSystemText =",
  ) &&
  runCommandSource.includes(
    "await buildChernobogWorldStateContext({",
  ) &&
  runCommandSource.includes(
    "const worldModelSystemText =",
  ) &&
  runCommandSource.includes(
    "await buildChernobogWorldModelContext()",
  )
) {
  pass(
    "accepted routed pipeline still builds both World State and World Model response context",
  );
} else {
  fail(
    "accepted routed pipeline response-context construction changed",
  );
}

const governedRel =
  "lib/chernobog/execution/governedToolExecution.ts";
const governed =
  read(governedRel);

const ensurePositions =
  callPosition(
    governedRel,
    governed,
    "executeGovernedToolAction",
    "ensureChernobogEventStateConvergence",
  );

const runPositions =
  callPosition(
    governedRel,
    governed,
    "executeGovernedToolAction",
    "runExecutionTask",
  );

if (
  ensurePositions.length === 1 &&
  runPositions.length >= 1 &&
  ensurePositions[0] <
    Math.min(...runPositions)
) {
  pass(
    "Event-State convergence is established before governed execution emits lifecycle/tool events",
  );
} else {
  fail(
    "governed execution can emit events before Event-State convergence is established",
  );
}

const worldStateContextRel =
  "lib/chernobog/pipeline/worldStateContext.ts";
const worldStateContext =
  read(worldStateContextRel);

const worldModelContextRel =
  "lib/chernobog/pipeline/worldModelContext.ts";
const worldModelContext =
  read(worldModelContextRel);

if (
  bridge.includes(
    "export async function getChernobogStateRuntimeWorldStateRegistry",
  ) &&
  bridge.includes(
    "await ensureChernobogEventStateConvergence();",
  ) &&
  bridge.includes(
    "export async function getChernobogStateRuntimeWorldStateQuery",
  )
) {
  pass(
    "response-side StateRuntime World State helpers establish Event-State convergence internally",
  );
} else {
  fail(
    "response-side StateRuntime helpers do not establish Event-State convergence",
  );
}

if (
  worldStateContext.includes(
    "getChernobogStateRuntimeWorldStateQuery",
  ) &&
  worldModelContext.includes(
    "getChernobogStateRuntimeWorldStateRegistry",
  )
) {
  pass(
    "both World State and World Model response paths enter through convergence-aware StateRuntime helpers",
  );
} else {
  fail(
    "response context path bypasses convergence-aware StateRuntime helpers",
  );
}

{
  const rel =
    "lib/chernobog/pipeline/worldStateContext.ts";
  const text =
    read(rel);

  if (
    text.includes(
      "getChernobogStateRuntimeWorldStateQuery",
    ) &&
    !text.includes(
      "getChernobogWorldStateRuntime",
    )
  ) {
    pass(
      `${rel} reads World State through StateRuntime projection`,
    );
  } else {
    fail(
      `${rel} retains a direct World State runtime response read`,
    );
  }
}

{
  const rel =
    "lib/chernobog/pipeline/worldModelContext.ts";
  const text =
    read(rel);

  const canonicalCurrentnessShape =
    text.includes(
      "getChernobogWorldStateRuntime()",
    ) &&
    text.includes(
      "new ChernobogWorldStateQueryService(",
    ) &&
    text.includes(
      "runtime.model.snapshot()",
    );

  const stateRuntimeRegistryRead =
    text.includes(
      "getChernobogStateRuntimeWorldStateRegistry",
    );

  const directCanonicalRegistryRead =
    /new\s+ChernobogWorldStateQueryService\s*\(\s*worldStateRuntime\s*\.\s*engine\s*\.\s*worldState/s
      .test(text);

  if (
    canonicalCurrentnessShape &&
    stateRuntimeRegistryRead &&
    !directCanonicalRegistryRead
  ) {
    pass(
      `${rel} preserves canonical 11G/11J currentness shape while model-facing World State evidence reads through StateRuntime`,
    );
  } else {
    fail(
      `${rel} currentness compatibility or StateRuntime read convergence is incomplete`,
    );
  }
}

const runExecutionTask =
  read(
    "lib/chernobog/execution/runExecutionTask.ts",
  );

if (
  runExecutionTask.includes(
    'type: "execution.approval.required"',
  ) &&
  runExecutionTask.includes(
    '"execution.started"',
  ) &&
  runExecutionTask.includes(
    '"execution.completed"',
  ) &&
  runExecutionTask.includes(
    '"execution.failed"',
  ) &&
  runExecutionTask.includes(
    '"execution.step.started"',
  ) &&
  runExecutionTask.includes(
    '"execution.step.completed"',
  ) &&
  runExecutionTask.includes(
    "publishChernobogEventSafely",
  ) &&
  runExecutionTask.includes(
    "runWithChernobogEventContext",
  )
) {
  pass(
    "authoritative execution continues to publish correlated lifecycle/step/approval events",
  );
} else {
  fail(
    "execution lifecycle Event Spine publication contract changed",
  );
}

const gateway =
  read(
    "packages/tools/src/toolGateway.ts",
  );

if (
  gateway.includes(
    '"tool.invocation.routed"',
  ) &&
  gateway.includes(
    '"tool.invocation.completed"',
  ) &&
  gateway.includes(
    '"tool.invocation.failed"',
  ) &&
  gateway.includes(
    "publishChernobogEventSafely",
  )
) {
  pass(
    "Unified Tool Gateway continues to publish routed/completed/failed Event Spine events",
  );
} else {
  fail(
    "Unified Tool Gateway event publication contract changed",
  );
}

const worldRuntime =
  read(
    "lib/chernobog/worldState/runtimeIntegration.ts",
  );
const worldRecovery =
  read(
    "lib/chernobog/worldState/recovery.ts",
  );
const worldProjection =
  read(
    "lib/chernobog/worldState/projectionEngine.ts",
  );

if (
  worldRuntime.includes(
    "options.eventBus.subscribe",
  ) &&
  (
    worldRecovery.includes(
      "eventBus.replay",
    ) ||
    worldProjection.includes(
      "eventBus.replay",
    )
  )
) {
  pass(
    "World State preserves Event Spine live subscription and replay recovery",
  );
} else {
  fail(
    "World State live/replay Event Spine contract changed",
  );
}

const stateRuntime =
  read(
    "packages/runtime/src/stateRuntime.ts",
  );

if (
  stateRuntime.includes(
    "mutableThroughStateRuntime: false",
  ) &&
  stateRuntime.includes(
    'authority: "World State domain"',
  ) &&
  stateRuntime.includes(
    'authority: "lib/chernobog/execution"',
  )
) {
  pass(
    "StateRuntime remains read-only coordinator over accepted domain authorities",
  );
} else {
  fail(
    "StateRuntime authority/read-only contract changed",
  );
}

const roots =
  [
    "app",
    "apps",
    "components",
    "lib",
    "packages",
  ];

const productionFiles = [];

for (const rootRel of roots) {
  const root =
    path.join(repo, rootRel);

  if (!fs.existsSync(root)) {
    continue;
  }

  const stack = [root];

  while (stack.length) {
    const dir =
      stack.pop();

    for (
      const entry of
      fs.readdirSync(
        dir,
        { withFileTypes: true },
      )
    ) {
      if (
        [
          "node_modules",
          ".next",
          "dist",
          "build",
          "coverage",
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

      if (
        entry.isDirectory()
      ) {
        stack.push(full);
      } else if (
        /\.(ts|tsx)$/i.test(
          entry.name,
        )
      ) {
        productionFiles.push(
          path
            .relative(repo, full)
            .split(path.sep)
            .join("/"),
        );
      }
    }
  }
}

const bindCallers = [];

for (const rel of productionFiles) {
  const text =
    read(rel);

  if (
    !text.includes(
      "bindDomainProjection",
    )
  ) {
    continue;
  }

  if (
    rel ===
      "packages/runtime/src/stateRuntime.ts" ||
    rel === bridgeRel
  ) {
    continue;
  }

  bindCallers.push(rel);
}

if (
  bindCallers.length === 0
) {
  pass(
    "no competing production StateRuntime domain-projection binder remains",
  );
} else {
  fail(
    `competing StateRuntime domain-projection binder(s): ${bindCallers.join(", ")}`,
  );
}

const unexpectedWorldMutators = [];

for (const rel of productionFiles) {
  if (
    rel.startsWith(
      "lib/chernobog/worldState/",
    ) ||
    rel.startsWith(
      "packages/core/src/worldState/",
    ) ||
    rel === bridgeRel
  ) {
    continue;
  }

  const text =
    read(rel);

  if (
    text.includes(
      "ChernobogWorldStateRegistry",
    ) &&
    (
      text.includes(
        ".upsert(",
      ) ||
      text.includes(
        ".replace(",
      ) ||
      text.includes(
        ".clear(",
      )
    )
  ) {
    unexpectedWorldMutators.push(
      rel,
    );
  }
}

if (
  unexpectedWorldMutators.length === 0
) {
  pass(
    "no production module outside the World State domain mutates canonical World State",
  );
} else {
  fail(
    `unexpected canonical World State mutation candidate(s): ${unexpectedWorldMutators.join(", ")}`,
  );
}

for (
  const rel of
  [
    "lib/chernobog/pipeline/toolExecution.ts",
    "lib/chernobog/orchestration/orchestrator.ts",
  ]
) {
  const text =
    read(rel);

  if (
    text.includes(
      "updateSessionFromToolResult",
    ) &&
    !text.includes(
      "bindDomainProjection",
    ) &&
    !text.includes(
      "ChernobogWorldStateRegistry",
    ) &&
    !text.includes(
      ".worldState.upsert",
    )
  ) {
    pass(
      `${rel} retains session continuity only; it does not compete for Event/World State authority`,
    );
  } else {
    fail(
      `${rel} session compatibility boundary changed or acquired competing State authority`,
    );
  }
}

console.log("");

if (failures > 0) {
  console.log(
    `OH-2H V3 verifier: FAIL (${failures})`,
  );
  process.exit(1);
}

console.log(
  "OH-2H V6 verifier: PASS",
);
