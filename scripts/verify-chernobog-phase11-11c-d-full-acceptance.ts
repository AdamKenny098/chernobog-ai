import assert from "node:assert/strict";
import {
  readdir,
  readFile,
  stat,
} from "node:fs/promises";
import {
  join,
  relative,
  sep,
} from "node:path";

import {
  getUnifiedToolExecutionStatus,
} from "../lib/chernobog/execution/toolExecutionStatus";

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

async function collectFiles(root: string): Promise<string[]> {
  const output: string[] = [];

  async function walk(current: string): Promise<void> {
    for (const name of await readdir(current)) {
      const full = join(current, name);
      const info = await stat(full);

      if (info.isDirectory()) {
        await walk(full);
        continue;
      }

      if (
        info.isFile() &&
        (name.endsWith(".ts") || name.endsWith(".tsx"))
      ) {
        output.push(full);
      }
    }
  }

  await walk(root);
  return output;
}

async function main(): Promise<void> {
  console.log(
    "Chernobog Phase 11C-D - Unified Tool Execution Full Integration & Acceptance",
  );
  console.log(
    "===========================================================================",
  );

  const status = getUnifiedToolExecutionStatus({
    clock: () => new Date("2026-08-26T13:30:00.000Z"),
  });

  assert.equal(status.status, "ready");
  assert.equal(status.toolCount > 0, true);
  assert.equal(status.orphanExecutionHandlers.length, 0);
  assert.equal(
    status.builtinToolCount + status.moduleToolCount,
    status.toolCount,
  );

  pass(
    "unified execution status is ready when registry and execution-task coverage are internally consistent",
  );

  assert.deepEqual(status.invocationOrigins, [
    "execution-task",
    "orchestration",
    "pipeline",
    "direct",
  ]);

  assert.deepEqual(status.failureKinds, [
    "unknown-tool",
    "invalid-input",
    "execution-failed",
  ]);

  pass(
    "completed 11C invocation origins and failure taxonomy are exposed as one stable execution contract",
  );

  assert.deepEqual(status.authority, {
    gateway: "execution/toolGateway.ts",
    executor: "tools/executor.ts",
    registry: "tools/registry.ts",
    taskGovernance: "execution/runExecutionTask.ts",
  });

  pass(
    "execution diagnostics preserve explicit authority boundaries between gateway, executor, registry, and task governance",
  );

  const files = [
    ...(await collectFiles("lib")),
    ...(await collectFiles("app")),
  ];

  const directExecutorImports: string[] = [];

  for (const file of files) {
    const normalized = relative(process.cwd(), file)
      .split(sep)
      .join("/");

    if (
      normalized === "lib/chernobog/execution/toolGateway.ts" ||
      normalized === "lib/chernobog/tools/executor.ts"
    ) {
      continue;
    }

    const source = await readFile(file, "utf8");

    if (
      /from\s+["'][^"']*tools\/executor["']/.test(source) ||
      /from\s+["']\.\/executor["']/.test(source)
    ) {
      directExecutorImports.push(normalized);
    }
  }

  assert.deepEqual(
    directExecutorImports,
    [],
    `Direct production executor imports remain: ${directExecutorImports.join(", ")}`,
  );

  pass(
    "all production callers remain consolidated behind the unified tool gateway",
  );

  const gatewaySource = await readFile(
    "lib/chernobog/execution/toolGateway.ts",
    "utf8",
  );

  for (const required of [
    "executeExecutionTaskTool",
    "executeOrchestrationTool",
    "executePipelineTool",
    "executeDirectTool",
    "invokeToolDetailed",
  ]) {
    assert.equal(
      gatewaySource.includes(required),
      true,
      `Gateway contract missing ${required}`,
    );
  }

  for (const eventType of [
    "tool.invocation.routed",
    "tool.invocation.completed",
    "tool.invocation.failed",
  ]) {
    assert.equal(gatewaySource.includes(eventType), true);
  }

  pass(
    "gateway owns unified invocation provenance and invocation lifecycle telemetry",
  );

  const executorSource = await readFile(
    "lib/chernobog/tools/executor.ts",
    "utf8",
  );

  assert.equal(
    /getTool\s*\(\s*toolName\s*,?\s*\)/.test(executorSource),
    true,
  );

  assert.equal(
    /tool\.inputSchema\.parse\s*\(\s*input\s*,?\s*\)/.test(
      executorSource,
    ),
    true,
  );

  for (const eventType of [
    "tool.started",
    "tool.completed",
    "tool.failed",
  ]) {
    assert.equal(executorSource.includes(eventType), true);
  }

  pass(
    "low-level executor remains authoritative for registry lookup, validation, execution, and tool lifecycle telemetry",
  );

  const taskSource = await readFile(
    "lib/chernobog/execution/runExecutionTask.ts",
    "utf8",
  );

  assert.equal(taskSource.includes("getRiskPolicyForStep"), true);
  assert.equal(taskSource.includes("shouldPauseForApproval"), true);
  assert.equal(taskSource.includes("runWithChernobogEventContext"), true);

  pass(
    "risk, approval, task lifecycle, and correlation authority remain above the tool execution layer",
  );

  const apiSource = await readFile(
    "app/api/tool-execution/route.ts",
    "utf8",
  );

  assert.equal(apiSource.includes("export async function GET"), true);
  assert.equal(/\bPOST\b/.test(apiSource), false);
  assert.equal(apiSource.includes("executesTools"), true);
  assert.equal(apiSource.includes("acceptsToolInput"), true);
  assert.equal(apiSource.includes("grantsPermissions"), true);

  pass(
    "execution status API is read-only and creates no execution, input, or permission surface",
  );

  const catalogApiSource = await readFile(
    "app/api/tool-catalog/route.ts",
    "utf8",
  );

  assert.equal(
    catalogApiSource.includes("getToolCatalogSnapshot"),
    true,
  );

  pass(
    "tool capability diagnostics and execution diagnostics share the same authoritative registry-derived catalog",
  );

  console.log(
    "===========================================================================",
  );
  console.log(
    "PASS Phase 11C-D Unified Tool Execution Full Integration & Acceptance",
  );
  console.log(
    "PASS Phase 11C Unified Tool Execution COMPLETE",
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
