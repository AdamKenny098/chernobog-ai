import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  isConversationalFollowUp,
  resolveConversationalFollowUpRoute,
} from "../lib/chernobog/pipeline/followUpRouting";
import {
  parsePlannerCommand,
} from "../lib/chernobog/planner/parser";

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

const detailedPlan =
  "Create a detailed five-step plan for testing Phase 11, including success criteria for each step.";

assert.equal(
  parsePlannerCommand(detailedPlan).kind,
  "create_plan",
);
pass("detailed five-step Phase 11 request is explicit planner language");

assert.equal(
  isConversationalFollowUp(
    "Expand on your previous answer.",
  ),
  true,
);
pass("expand-previous-answer is detected as conversational follow-up");

assert.equal(
  resolveConversationalFollowUpRoute(
    "Expand on your previous answer.",
    "memory",
  ),
  "memory",
);
pass("memory follow-up inherits memory route");

assert.equal(
  resolveConversationalFollowUpRoute(
    "Tell me more about that.",
    "planner",
  ),
  "planner",
);
pass("planner follow-up inherits planner route");

assert.equal(
  resolveConversationalFollowUpRoute(
    "Go into more detail on that.",
    "tools",
  ),
  "chat",
);
pass("tool-result discussion becomes chat and never re-executes tools");

assert.equal(
  resolveConversationalFollowUpRoute(
    "Delete the file.",
    "chat",
  ),
  null,
);
pass("action request is not misclassified as conversational follow-up");

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

const earlyPlannerIndex =
  source.indexOf(
    "Explicit planner language handled before module routing",
  );

const moduleFollowUpIndex =
  source.indexOf(
    "const moduleFollowUp = await tryHandleModuleFollowUp",
  );

assert.ok(
  earlyPlannerIndex >= 0 &&
    moduleFollowUpIndex >= 0 &&
    earlyPlannerIndex < moduleFollowUpIndex,
);
pass("explicit planner handling now runs before module follow-up routing");

assert.match(
  source,
  /const previousUserRoute\s*=\s*getLastUserRoute\(sessionId\);/,
);
assert.match(
  source,
  /const inheritedFollowUpRoute\s*=\s*resolveConversationalFollowUpRoute\(/,
);
pass("pipeline resolves prior route before final fallback routing");

assert.match(
  source,
  /route\s*=\s*inheritedFollowUpRoute\s*\?\?\s*\(await routeMessage\(userMessage\)\);/,
);
pass("safe conversational follow-up bypasses fresh LLM route guessing");

assert.match(
  source,
  /"Conversational follow-up inherited previous route"/,
);
pass("trust trace records inherited follow-up routing");

const memoryPath = path.join(
  process.cwd(),
  "lib",
  "chernobog",
  "memory.ts",
);

const memorySource =
  fs.readFileSync(
    memoryPath,
    "utf8",
  );

assert.match(
  memorySource,
  /export function getLastUserRoute\(/,
);
assert.match(
  memorySource,
  /SELECT route[\s\S]*?WHERE role = 'user'[\s\S]*?ORDER BY id DESC[\s\S]*?LIMIT 1/,
);
pass("previous user route is read deterministically from session history");

console.log("");
console.log(
  "PASS Phase 11 Integration E - Routing and Follow-up Continuity",
);