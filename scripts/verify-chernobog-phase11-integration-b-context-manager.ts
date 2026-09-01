import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  selectResponseContext,
} from "../lib/chernobog/pipeline/contextSelection";

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

assert.deepEqual(
  selectResponseContext("Say hello."),
  {
    includeWorldState: false,
    includeWorldModel: false,
    reasons: [
      "memory-project-conversation-only",
    ],
  },
);
pass("ordinary chat excludes World State and World Model");

assert.deepEqual(
  selectResponseContext(
    "What temporary test word did I just give you?",
  ),
  {
    includeWorldState: false,
    includeWorldModel: false,
    reasons: [
      "memory-project-conversation-only",
    ],
  },
);
pass("memory recall excludes unrelated World State and World Model");

assert.deepEqual(
  selectResponseContext(
    "What are we currently working on in Chernobog?",
  ),
  {
    includeWorldState: false,
    includeWorldModel: false,
    reasons: [
      "memory-project-conversation-only",
    ],
  },
);
pass("project-current-work question relies on project and memory context, not 11J");

const stateSelection =
  selectResponseContext(
    "What is the current system health?",
  );

assert.equal(
  stateSelection.includeWorldState,
  true,
);
assert.equal(
  stateSelection.includeWorldModel,
  false,
);
pass("explicit operational state question selects 11G without 11J");

const worldStateSelection =
  selectResponseContext(
    "Show me the canonical World State.",
  );

assert.equal(
  worldStateSelection.includeWorldState,
  true,
);
assert.equal(
  worldStateSelection.includeWorldModel,
  false,
);
pass("explicit World State question selects 11G");

const dependencySelection =
  selectResponseContext(
    "What models depend on Ollama?",
  );

assert.equal(
  dependencySelection.includeWorldState,
  true,
);
assert.equal(
  dependencySelection.includeWorldModel,
  true,
);
pass("Ollama dependency question selects 11G and 11J");

const worldModelSelection =
  selectResponseContext(
    "What does the World Model say about dependency chains?",
  );

assert.equal(
  worldModelSelection.includeWorldState,
  true,
);
assert.equal(
  worldModelSelection.includeWorldModel,
  true,
);
pass("explicit World Model question selects authoritative 11J context");

const genericImpact =
  selectResponseContext(
    "Explain the impact of REST APIs on web development.",
  );

assert.equal(
  genericImpact.includeWorldState,
  false,
);
assert.equal(
  genericImpact.includeWorldModel,
  false,
);
pass("generic use of impact does not accidentally select 11J");

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
  /const responseContextSelection\s*=\s*selectResponseContext\(\s*userMessage,\s*\);/,
);
pass("live pipeline runs explicit response-context selection");

assert.match(
  source,
  /responseContextSelection\.includeWorldState\s*\?\s*\(\s*await buildChernobogWorldStateContext/,
);
pass("11G construction is relevance-gated");

assert.match(
  source,
  /responseContextSelection\.includeWorldModel\s*\?\s*\(\s*await buildChernobogWorldModelContext\(\)/,
);
pass("11J construction is relevance-gated");

assert.match(
  source,
  /const budgetedResponseContext\s*=\s*buildBudgetedResponseContext\(\{[\s\S]*?memorySystemText:\s*memoryContext\.systemText,[\s\S]*?worldStateSystemText,[\s\S]*?worldModelSystemText/,
);
assert.match(
  source,
  /sessionSummary:\s*buildProjectGroundedSystemText\(\s*budgetedResponseContext\.systemText,/,
);
pass("selected context is budgeted, then assembled into one project-grounded packet");

assert.doesNotMatch(
  source,
  /worldStateContext\.systemText|worldModelContext\.systemText/,
);
pass("old unconditional World State/World Model packet assembly is gone");

console.log("");
console.log(
  "PASS Phase 11 Integration B - Context Manager",
);