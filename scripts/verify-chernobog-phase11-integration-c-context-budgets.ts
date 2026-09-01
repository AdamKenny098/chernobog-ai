import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  buildBudgetedResponseContext,
} from "../lib/chernobog/pipeline/contextBudget";

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

function makeText(
  label: string,
  length: number,
): string {
  const seed = `${label}:`;
  return (
    seed +
    "x".repeat(
      Math.max(
        0,
        length - seed.length,
      ),
    )
  );
}

const shortMemory =
  "memory context";

const normal =
  buildBudgetedResponseContext({
    memorySystemText: shortMemory,
    worldStateSystemText: "",
    worldModelSystemText: "",
  });

assert.equal(
  normal.systemText,
  shortMemory,
);
assert.equal(
  normal.metrics.truncated,
  false,
);
pass("small ordinary context passes through unchanged");

const largeMemory =
  buildBudgetedResponseContext({
    memorySystemText:
      makeText("memory", 40_000),
    worldStateSystemText: "",
    worldModelSystemText: "",
  });

assert.ok(
  largeMemory.metrics.memoryIncludedChars <=
    16_000,
);
assert.ok(
  largeMemory.metrics.combinedChars <=
    16_000,
);
assert.equal(
  largeMemory.metrics.truncated,
  true,
);
assert.match(
  largeMemory.systemText,
  /memory context truncated/,
);
pass("ordinary memory context is capped at 16k characters");

const state =
  buildBudgetedResponseContext({
    memorySystemText:
      makeText("memory", 30_000),
    worldStateSystemText:
      makeText("world-state", 30_000),
    worldModelSystemText: "",
  });

assert.ok(
  state.metrics.memoryIncludedChars <=
    12_000,
);
assert.ok(
  state.metrics.worldStateIncludedChars <=
    10_000,
);
assert.ok(
  state.metrics.combinedChars <=
    22_002,
);
pass("World State response reserves separate bounded memory and 11G budgets");

const model =
  buildBudgetedResponseContext({
    memorySystemText:
      makeText("memory", 30_000),
    worldStateSystemText:
      makeText("world-state", 30_000),
    worldModelSystemText:
      [
        "WORLD MODEL CRITICAL DEPENDENCY BACKBONE",
        makeText("world-model", 40_000),
        "WORLD-MODEL-TAIL-EVIDENCE",
      ].join("\n"),
  });

assert.ok(
  model.metrics.memoryIncludedChars <=
    8_000,
);
assert.ok(
  model.metrics.worldStateIncludedChars <=
    5_000,
);
assert.ok(
  model.metrics.worldModelIncludedChars <=
    15_000,
);
assert.ok(
  model.metrics.combinedChars <=
    28_004,
);
assert.match(
  model.systemText,
  /WORLD MODEL CRITICAL DEPENDENCY BACKBONE/,
);
assert.match(
  model.systemText,
  /WORLD-MODEL-TAIL-EVIDENCE/,
);
pass("11J responses fit inside a roughly 28k selected-context budget while preserving head and tail evidence");

const runCommandPath = path.join(
  process.cwd(),
  "lib",
  "chernobog",
  "pipeline",
  "runCommand.ts",
);

const source =
  fs.readFileSync(
    runCommandPath,
    "utf8",
  );

assert.match(
  source,
  /const budgetedResponseContext\s*=\s*buildBudgetedResponseContext\(\{/,
);
pass("live pipeline applies the context budget");

assert.match(
  source,
  /memorySystemText:\s*memoryContext\.systemText/,
);
assert.match(
  source,
  /worldStateSystemText,/,
);
assert.match(
  source,
  /worldModelSystemText,/,
);
pass("memory, 11G and 11J are budgeted independently");

assert.match(
  source,
  /"Phase 11 response context budget applied"[\s\S]*?budgetedResponseContext\.metrics/,
);
pass("budget metrics are visible in the trust trace");

assert.match(
  source,
  /sessionSummary:\s*buildProjectGroundedSystemText\(\s*budgetedResponseContext\.systemText,/,
);
pass("only budgeted selected context reaches the routed response");

console.log("");
console.log(
  "PASS Phase 11 Integration C - Context Budgets",
);