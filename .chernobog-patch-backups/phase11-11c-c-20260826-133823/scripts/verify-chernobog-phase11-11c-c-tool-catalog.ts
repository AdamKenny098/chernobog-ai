import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";

import {
  getToolCatalogSnapshot,
} from "../lib/chernobog/execution/toolCapabilities";
import {
  toolRegistry,
} from "../lib/chernobog/tools/registry";

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
    "Chernobog Phase 11C-C - Tool Catalog, Capability Diagnostics & Execution Integration",
  );
  console.log(
    "===============================================================================",
  );

  const snapshot =
    getToolCatalogSnapshot();

  const registryNames =
    Object.keys(
      toolRegistry,
    ).sort();

  assert.deepEqual(
    snapshot.tools.map(
      (tool) =>
        tool.name,
    ),
    registryNames,
  );

  assert.equal(
    snapshot.toolCount,
    registryNames.length,
  );

  pass(
    "tool catalog is derived directly from the authoritative registry with no independent tool list",
  );

  assert.equal(
    snapshot.orphanExecutionHandlers.length,
    0,
    `Execution handlers without registered tools: ${snapshot.orphanExecutionHandlers.join(", ")}`,
  );

  pass(
    "every execution-task tool handler resolves to a tool that actually exists in the authoritative registry",
  );

  assert.equal(
    snapshot.executionTaskCoveredToolCount,
    snapshot.executionTaskHandlerCount,
  );

  pass(
    "execution-task coverage count is derived from the same registry/handler intersection",
  );

  assert.equal(
    snapshot.builtinToolCount +
      snapshot.moduleToolCount,
    snapshot.toolCount,
  );

  for (
    const tool
    of snapshot.tools
  ) {
    assert.equal(
      typeof tool.name,
      "string",
    );

    assert.equal(
      typeof tool.description,
      "string",
    );

    assert.equal(
      tool.source ===
        "builtin" ||
        tool.source ===
          "module",
      true,
    );

    if (
      tool.source ===
      "module"
    ) {
      assert.equal(
        typeof tool.moduleId,
        "string",
      );
    }
  }

  pass(
    "catalog distinguishes builtin and module-owned capabilities while preserving module provenance",
  );

  const encoded =
    JSON.stringify(
      snapshot,
    );

  assert.equal(
    encoded.includes(
      "inputSchema",
    ),
    false,
  );

  assert.equal(
    encoded.includes(
      '"execute"',
    ),
    false,
  );

  assert.equal(
    encoded.includes(
      "ToolExecutionContext",
    ),
    false,
  );

  pass(
    "catalog is metadata-only and does not serialize schemas, executable functions, or execution context",
  );

  const sorted =
    [...snapshot.tools]
      .map(
        (tool) =>
          tool.name,
      )
      .sort();

  assert.deepEqual(
    snapshot.tools.map(
      (tool) =>
        tool.name,
    ),
    sorted,
  );

  assert.deepEqual(
    getToolCatalogSnapshot(),
    snapshot,
  );

  pass(
    "tool catalog output is sorted and deterministic for identical registry state",
  );

  const catalogSource =
    await readFile(
      "lib/chernobog/execution/toolCapabilities.ts",
      "utf8",
    );

  assert.equal(
    catalogSource.includes(
      "getRegisteredModules",
    ),
    true,
  );

  assert.equal(
    catalogSource.includes(
      "toolRegistry",
    ),
    true,
  );

  assert.equal(
    catalogSource.includes(
      "createToolExecutionHandlers",
    ),
    true,
  );

  pass(
    "capability diagnostics join module ownership, authoritative registry state, and execution-task coverage",
  );

  const apiSource =
    await readFile(
      "app/api/tool-catalog/route.ts",
      "utf8",
    );

  assert.equal(
    apiSource.includes(
      "export async function GET",
    ),
    true,
  );

  assert.equal(
    /\bPOST\b/.test(
      apiSource,
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
      "acceptsToolInput",
    ),
    true,
  );

  pass(
    "tool catalog API is read-only and explicitly has no tool-execution or tool-input surface",
  );

  const gatewaySource =
    await readFile(
      "lib/chernobog/execution/toolGateway.ts",
      "utf8",
    );

  assert.equal(
    gatewaySource.includes(
      "executeOrchestrationTool",
    ),
    true,
  );

  assert.equal(
    gatewaySource.includes(
      "executePipelineTool",
    ),
    true,
  );

  assert.equal(
    gatewaySource.includes(
      "executeExecutionTaskTool",
    ),
    true,
  );

  pass(
    "catalog diagnostics sit above the completed unified gateway used by execution-task, orchestration, and pipeline callers",
  );

  console.log(
    "===============================================================================",
  );
  console.log(
    "PASS Phase 11C-C Tool Catalog, Capability Diagnostics & Execution Integration acceptance",
  );
}

void main().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);
