import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";

import {
  summarizeUnifiedToolInvocation,
} from "../lib/chernobog/execution/toolGateway";

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
    "Chernobog Phase 11C-A - Unified Tool Gateway",
  );
  console.log(
    "=============================================",
  );

  const summary =
    summarizeUnifiedToolInvocation({
      toolName:
        "read_text_file",
      input: {
        path:
          "secret-value-must-not-leak.txt",
      },
      origin:
        "execution-task",
      context: {
        platform:
          "win32",
      },
    });

  assert.deepEqual(
    summary,
    {
      toolName:
        "read_text_file",
      origin:
        "execution-task",
      platform:
        "win32",
    },
  );

  assert.equal(
    JSON.stringify(
      summary,
    ).includes(
      "secret-value-must-not-leak",
    ),
    false,
  );

  pass(
    "gateway invocation summary records provenance without copying tool input into routing telemetry",
  );

  const gatewaySource =
    await readFile(
      "lib/chernobog/execution/toolGateway.ts",
      "utf8",
    );

  assert.equal(
    gatewaySource.includes(
      'from "../tools/executor"',
    ),
    true,
  );

  assert.equal(
    gatewaySource.includes(
      "executeTool(",
    ),
    true,
  );

  assert.equal(
    gatewaySource.includes(
      '"tool.invocation.routed"',
    ),
    true,
  );

  assert.equal(
    gatewaySource.includes(
      "input:",
    ),
    true,
  );

  const eventStart =
    gatewaySource.indexOf(
      '"tool.invocation.routed"',
    );

  const eventEnd =
    gatewaySource.indexOf(
      "executeTool(",
      eventStart,
    );

  const eventBlock =
    gatewaySource.slice(
      eventStart,
      eventEnd,
    );

  assert.equal(
    eventBlock.includes(
      "invocation.input",
    ),
    false,
  );

  pass(
    "unified gateway delegates actual execution to the existing low-level tool executor and publishes only routing metadata",
  );

  const handlerSource =
    await readFile(
      "lib/chernobog/execution/toolExecutionHandlers.ts",
      "utf8",
    );

  assert.equal(
    handlerSource.includes(
      'from "../tools/executor"',
    ),
    false,
  );

  assert.equal(
    handlerSource.includes(
      "executeExecutionTaskTool as executeTool",
    ),
    true,
  );

  assert.equal(
    handlerSource.includes(
      'executeTool("read_text_file"',
    ),
    true,
  );

  pass(
    "execution-task tool handlers now route existing tool calls through the unified gateway without rewriting handler behavior",
  );

  const lowLevelSource =
    await readFile(
      "lib/chernobog/tools/executor.ts",
      "utf8",
    );

  assert.equal(
    /getTool\s*\(\s*toolName\s*,?\s*\)/.test(
      lowLevelSource,
    ),
    true,
  );

  assert.equal(
    /tool\.inputSchema\.parse\s*\(\s*input\s*,?\s*\)/.test(
      lowLevelSource,
    ),
    true,
  );

  assert.equal(
    lowLevelSource.includes(
      "tool.started",
    ),
    true,
  );

  assert.equal(
    lowLevelSource.includes(
      "tool.completed",
    ),
    true,
  );

  assert.equal(
    lowLevelSource.includes(
      "tool.failed",
    ),
    true,
  );

  pass(
    "registry lookup, Zod validation, execution and tool lifecycle events remain centralized in tools/executor.ts",
  );

  const taskSource =
    await readFile(
      "lib/chernobog/execution/runExecutionTask.ts",
      "utf8",
    );

  assert.equal(
    taskSource.includes(
      "getRiskPolicyForStep",
    ),
    true,
  );

  assert.equal(
    taskSource.includes(
      "shouldPauseForApproval",
    ),
    true,
  );

  assert.equal(
    taskSource.includes(
      "runWithChernobogEventContext",
    ),
    true,
  );

  assert.equal(
    /handler\s*\(/.test(
      taskSource,
    ),
    true,
  );

  pass(
    "execution-task runtime retains risk, approval, step lifecycle and event correlation authority above the tool gateway",
  );

  const indexSource =
    await readFile(
      "lib/chernobog/execution/index.ts",
      "utf8",
    );

  assert.equal(
    indexSource.includes(
      'export * from "./toolGateway";',
    ),
    true,
  );

  pass(
    "unified tool gateway is exported as the execution-layer invocation contract",
  );

  console.log(
    "=============================================",
  );
  console.log(
    "PASS Phase 11C-A Unified Tool Gateway acceptance",
  );
}

void main().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);
