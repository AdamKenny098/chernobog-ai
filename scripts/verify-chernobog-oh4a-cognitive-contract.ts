import assert from "node:assert/strict";
import {
  COGNITIVE_CONTRACT_VERSION,
  assertCognitiveResult,
  assertCognitiveTask,
  createCognitiveTask,
  createEmptyCognitiveResult,
  isCognitiveResult,
  type CognitiveResult,
} from "../lib/chernobog/cognition/contract";

function pass(message: string) {
  console.log(`PASS ${message}`);
}

console.log(
  "Chernobog OH-4A Ã¢â‚¬â€ Cognitive Contract Verification",
);
console.log(
  "=================================================",
);

const task = createCognitiveTask({
  id: "oh4a:test-task",
  source: "user",
  rawInput:
    "Turn a messy human goal into a governed cognitive task.",
  createdAt: "2026-10-04T22:50:00.000Z",
});

assert.equal(
  task.contractVersion,
  COGNITIVE_CONTRACT_VERSION,
);
assert.equal(task.constraints.length, 0);
assertCognitiveTask(task);
pass("cognitive task has stable machine-readable schema");

const result = createEmptyCognitiveResult(
  task,
  "needs_authorization",
  "2026-10-04T22:50:01.000Z",
);

result.conclusions.push({
  id: "conclusion:1",
  statement: "A bounded action is appropriate.",
  evidenceIds: ["evidence:1"],
});

result.assumptions.push({
  id: "assumption:1",
  statement:
    "The target resource remains available.",
  material: true,
});

result.uncertainties.push({
  id: "uncertainty:1",
  statement:
    "Final execution permission has not been established.",
  impact: "high",
});

result.evidence.push({
  id: "evidence:1",
  kind: "context",
  statement:
    "The user requested construction of OH-4A.",
  strength: 1,
});

result.proposedActions.push({
  id: "action:1",
  actionType: "example.write",
  parameters: {
    target: "example",
  },
  reason:
    "Demonstrate the cognitive/action boundary.",
  expectedOutcome:
    "Governance receives a proposal, not an executed side effect.",
  risk: "medium",
  authorityRequirement:
    "governance approval",
  reversible: true,
  executable: false,
});

result.confidence = {
  modelReported: 0.95,
  systemEstimated: 0.8,
  validationStrength: 1,
  evidenceCoverage: 0.75,
  disagreement: 0,
  final: 0.82,
};

assertCognitiveResult(result);
pass("cognitive result has stable machine-readable schema");

assert.notEqual(
  result.conclusions[0].id,
  result.assumptions[0].id,
);
assert.notEqual(
  result.assumptions[0].id,
  result.uncertainties[0].id,
);
pass(
  "conclusions, assumptions and uncertainties are distinct",
);

assert.equal(
  result.proposedActions[0].executable,
  false,
);
pass(
  "cognitive actions remain proposals and cannot directly represent execution",
);

assert.equal(
  result.status,
  "needs_authorization",
);
pass(
  "authorization is represented as a cognitive outcome rather than implicit execution",
);

assert.equal(
  result.provenance.taskId,
  task.id,
);
pass("provenance links result to originating task");

const roundTrip = JSON.parse(
  JSON.stringify(result),
) as unknown;

assert.equal(
  isCognitiveResult(roundTrip),
  true,
);
pass(
  "contract survives JSON serialization/deserialization",
);

const forged = structuredClone(
  result,
) as unknown as {
  proposedActions: Array<{
    executable: boolean;
  }>;
};

forged.proposedActions[0].executable = true;

assert.equal(
  isCognitiveResult(forged),
  false,
);
pass(
  "runtime validation rejects executable cognitive proposals",
);

const invalidConfidence = structuredClone(
  result,
) as CognitiveResult;
invalidConfidence.confidence.final = 1.5;

assert.equal(
  isCognitiveResult(invalidConfidence),
  false,
);
pass(
  "confidence scores are bounded and machine-validatable",
);

const clarification =
  createEmptyCognitiveResult(
    task,
    "needs_clarification",
  );
assertCognitiveResult(clarification);

const uncertain =
  createEmptyCognitiveResult(
    task,
    "uncertain",
  );
assertCognitiveResult(uncertain);

const failed =
  createEmptyCognitiveResult(
    task,
    "failed",
  );
failed.failure = {
  code: "test-failure",
  message:
    "Failure is first-class contract data.",
  retryable: true,
};
assertCognitiveResult(failed);

pass(
  "clarification, uncertainty and failure are valid first-class outcomes",
);

console.log("");
console.log("OH-4A cognitive contract verification complete.");