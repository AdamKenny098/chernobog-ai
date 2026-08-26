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
  getToolInvocationFailureKind,
} from "../lib/chernobog/execution/toolGateway";
import {
  createToolFailure,
  createToolSuccess,
} from "../lib/chernobog/tools/types";

function pass(
  message: string,
): void {
  console.log(
    `PASS ${message}`,
  );
}

async function collectFiles(
  root: string,
): Promise<string[]> {
  const output:
    string[] = [];

  async function walk(
    current: string,
  ): Promise<void> {
    const entries =
      await readdir(
        current,
      );

    for (
      const name
      of entries
    ) {
      const full =
        join(
          current,
          name,
        );

      const info =
        await stat(full);

      if (
        info.isDirectory()
      ) {
        await walk(full);
        continue;
      }

      if (
        info.isFile() &&
        (
          name.endsWith(
            ".ts",
          ) ||
          name.endsWith(
            ".tsx",
          )
        )
      ) {
        output.push(full);
      }
    }
  }

  await walk(root);

  return output;
}

async function main():
  Promise<void> {
  console.log(
    "Chernobog Phase 11C-B - Direct Tool Path Consolidation & Invocation Semantics",
  );
  console.log(
    "=========================================================================",
  );

  assert.equal(
    getToolInvocationFailureKind(
      createToolFailure(
        "missing",
        "not found",
        "unknown-tool",
      ),
    ),
    "unknown-tool",
  );

  assert.equal(
    getToolInvocationFailureKind(
      createToolFailure(
        "read_text_file",
        "bad input",
        "invalid-input",
      ),
    ),
    "invalid-input",
  );

  assert.equal(
    getToolInvocationFailureKind(
      createToolFailure(
        "open_file",
        "runtime failure",
        "execution-failed",
      ),
    ),
    "execution-failed",
  );

  assert.equal(
    getToolInvocationFailureKind(
      createToolSuccess(
        "get_time",
        {
          now: "ok",
        },
      ),
    ),
    undefined,
  );

  pass(
    "gateway exposes a finite machine-readable failure taxonomy without parsing error text",
  );

  const executorSource =
    await readFile(
      "lib/chernobog/tools/executor.ts",
      "utf8",
    );

  assert.equal(
    executorSource.includes(
      '"unknown-tool"',
    ),
    true,
  );

  assert.equal(
    executorSource.includes(
      "error instanceof z.ZodError",
    ),
    true,
  );

  assert.equal(
    executorSource.includes(
      '"invalid-input"',
    ),
    true,
  );

  assert.equal(
    executorSource.includes(
      '"execution-failed"',
    ),
    true,
  );

  pass(
    "low-level executor assigns failure categories at the point where the cause is actually known",
  );

  const gatewaySource =
    await readFile(
      "lib/chernobog/execution/toolGateway.ts",
      "utf8",
    );

  assert.equal(
    gatewaySource.includes(
      "invokeToolDetailed",
    ),
    true,
  );

  assert.equal(
    gatewaySource.includes(
      '"tool.invocation.completed"',
    ),
    true,
  );

  assert.equal(
    gatewaySource.includes(
      '"tool.invocation.failed"',
    ),
    true,
  );

  const routedEventStart =
    gatewaySource.indexOf(
      '"tool.invocation.routed"',
    );

  const resultCall =
    gatewaySource.indexOf(
      "await executeTool(",
    );

  const routingBlock =
    gatewaySource.slice(
      routedEventStart,
      resultCall,
    );

  assert.equal(
    routingBlock.includes(
      "invocation.input",
    ),
    false,
  );

  pass(
    "gateway provides detailed invocation results and completion/failure telemetry without copying tool input into events",
  );

  const files = [
    ...(
      await collectFiles(
        "lib",
      )
    ),
    ...(
      await collectFiles(
        "app",
      )
    ),
  ];

  const directImports:
    string[] = [];

  for (
    const file
    of files
  ) {
    const normalized =
      relative(
        process.cwd(),
        file,
      ).split(sep).join("/");

    if (
      normalized ===
      "lib/chernobog/execution/toolGateway.ts" ||
      normalized ===
      "lib/chernobog/tools/executor.ts"
    ) {
      continue;
    }

    const source =
      await readFile(
        file,
        "utf8",
      );

    const importsExecutor =
      /from\s+["'][^"']*tools\/executor["']/.test(
        source,
      ) ||
      /from\s+["']\.\/executor["']/.test(
        source,
      );

    if (
      importsExecutor
    ) {
      directImports.push(
        normalized,
      );
    }
  }

  assert.deepEqual(
    directImports,
    [],
    `Production direct tools/executor imports remain: ${directImports.join(", ")}`,
  );

  pass(
    "all production tool invocations are forced through the unified gateway; only the gateway may import the low-level executor",
  );

  const orchestrationSource =
    await readFile(
      "lib/chernobog/orchestration/orchestrator.ts",
      "utf8",
    );

  assert.equal(
    orchestrationSource.includes(
      "executeOrchestrationTool as executeTool",
    ),
    true,
  );

  const pipelineSource =
    await readFile(
      "lib/chernobog/pipeline/toolExecution.ts",
      "utf8",
    );

  assert.equal(
    pipelineSource.includes(
      "executePipelineTool as executeTool",
    ),
    true,
  );

  assert.equal(
    gatewaySource.includes(
      '"orchestration"',
    ),
    true,
  );

  assert.equal(
    gatewaySource.includes(
      '"pipeline"',
    ),
    true,
  );

  pass(
    "orchestration and pipeline production callers route through the gateway with explicit invocation provenance",
  );

  const handlerSource =
    await readFile(
      "lib/chernobog/execution/toolExecutionHandlers.ts",
      "utf8",
    );

  assert.equal(
    handlerSource.includes(
      "executeExecutionTaskTool as executeTool",
    ),
    true,
  );

  pass(
    "execution-task handlers remain consolidated on the gateway path",
  );

  const taskSource =
    await readFile(
      "lib/chernobog/execution/runExecutionTask.ts",
      "utf8",
    );

  assert.equal(
    taskSource.includes(
      "shouldPauseForApproval",
    ),
    true,
  );

  assert.equal(
    taskSource.includes(
      "getRiskPolicyForStep",
    ),
    true,
  );

  pass(
    "tool failure semantics do not move approval or risk authority out of runExecutionTask",
  );

  console.log(
    "=========================================================================",
  );
  console.log(
    "PASS Phase 11C-B Direct Tool Path Consolidation & Invocation Semantics acceptance",
  );
}

void main().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);
