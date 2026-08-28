import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";

import type {
  CognitiveActionDecision,
  CognitiveActionOpportunity,
  CognitiveGovernanceSnapshot,
} from "../lib/chernobog/cognition/actionTypes";
import {
  buildExecutionOptionsFromCognitiveDecision,
  canHandoffCognitiveDecision,
  runGovernedCognitiveExecution,
} from "../lib/chernobog/governance/cognitiveExecution";
import type {
  ExecutionTask,
} from "../lib/chernobog/execution/types";

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

function opportunity(
  risk:
    "low" |
    "medium" |
    "high" |
    "critical" = "low",
): CognitiveActionOpportunity {
  return {
    id: "11d-c-opportunity",
    description:
      "Concrete governed execution opportunity",
    capability:
      "verifier.test",
    effect: "write",
    risk,
    reversible: true,
  };
}

function governance(
  permission:
    "allow" |
    "confirm" |
    "deny" = "allow",
  autonomy:
    "disabled" |
    "advisory" |
    "bounded" = "bounded",
): CognitiveGovernanceSnapshot {
  return {
    permission,
    autonomy,
    userInteractionAvailable: true,
  };
}

function decision(
  options: {
    mode?:
      "act" |
      "ask" |
      "suggest" |
      "wait" |
      "ignore";
    permitted?: boolean;
    opportunity?:
      CognitiveActionOpportunity;
    governance?:
      CognitiveGovernanceSnapshot;
  } = {},
): CognitiveActionDecision {
  const mode =
    options.mode ??
    "act";

  return {
    id:
      "decision:11d-c",
    generatedAt:
      "2026-08-28T11:00:00.000Z",
    requestedMode:
      mode,
    mode,
    permittedToExecute:
      options.permitted ??
      true,
    opportunity:
      options.opportunity ===
      undefined
        ? opportunity()
        : options.opportunity,
    governance:
      options.governance ??
      governance(),
    reasons: [],
    focus: {
      cycle: 1,
      generatedAt:
        "2026-08-28T11:00:00.000Z",
      attention: [],
      goals: [],
    } as never,
  };
}

let serial = 0;

function task(): ExecutionTask {
  serial += 1;

  return {
    id:
      `11d-c-task-${serial}`,
    category:
      "system_operation",
    input:
      "11D-C verifier",
    goal:
      "verify governed cognitive handoff",
    status:
      "pending",
    risk:
      "safe",
    steps: [
      {
        id:
          "step-1",
        kind:
          "tool",
        label:
          "Verifier tool",
        status:
          "pending",
        action:
          "verifier.test",
        input: {},
        risk:
          "safe",
      },
    ],
    currentStepId:
      "step-1",
    approval: {
      required: false,
    },
    context: {},
    createdAt:
      "2026-08-28T11:00:00.000Z",
    updatedAt:
      "2026-08-28T11:00:00.000Z",
  };
}

async function main(): Promise<void> {
  console.log(
    "Chernobog Phase 11D-C - Cognitive-to-Execution Governance Integration",
  );
  console.log(
    "====================================================================",
  );

  assert.deepEqual(
    canHandoffCognitiveDecision(
      decision(),
    ),
    {
      allowed: true,
    },
  );

  assert.deepEqual(
    canHandoffCognitiveDecision(
      decision({
        mode: "suggest",
        permitted: false,
      }),
    ),
    {
      allowed: false,
      reason:
        "decision-not-act",
    },
  );

  assert.deepEqual(
    canHandoffCognitiveDecision(
      decision({
        mode: "act",
        permitted: false,
      }),
    ),
    {
      allowed: false,
      reason:
        "decision-not-permitted",
    },
  );

  assert.deepEqual(
    canHandoffCognitiveDecision({
      ...decision(),
      opportunity:
        undefined,
    }),
    {
      allowed: false,
      reason:
        "missing-opportunity",
    },
  );

  pass(
    "only an executable act decision with a concrete opportunity can enter the execution handoff",
  );

  const governedDecision =
    decision({
      governance:
        governance(
          "allow",
          "bounded",
        ),
      opportunity:
        opportunity("low"),
    });

  const executionOptions =
    buildExecutionOptionsFromCognitiveDecision(
      governedDecision,
      {
        handlers: {},
        maxSteps: 7,
      },
    );

  assert.deepEqual(
    executionOptions.governance,
    {
      governance:
        governedDecision
          .governance,
      opportunity:
        governedDecision
          .opportunity,
    },
  );

  assert.equal(
    executionOptions.maxSteps,
    7,
  );

  pass(
    "handoff derives runtime governance from the exact cognitive decision rather than caller-supplied policy",
  );

  governedDecision
    .governance.permission =
      "deny";

  assert.equal(
    executionOptions
      .governance
      ?.governance
      .permission,
    "allow",
  );

  pass(
    "handoff snapshots cognitive governance so later mutation cannot alter an in-flight execution decision",
  );

  let calls = 0;

  const handlers = {
    "verifier.test":
      async () => {
        calls += 1;

        return {
          success: true,
          output: {
            ok: true,
          },
        };
      },
  };

  calls = 0;

  const allowed =
    await runGovernedCognitiveExecution(
      decision(),
      task(),
      {
        handlers,
      },
    );

  assert.equal(
    allowed.status,
    "executed",
  );
  assert.equal(
    allowed.task?.status,
    "completed",
  );
  assert.equal(calls, 1);

  pass(
    "permitted cognitive act decisions reach runExecutionTask and execute through the existing runtime",
  );

  calls = 0;

  const nonExecutable =
    await runGovernedCognitiveExecution(
      decision({
        mode:
          "suggest",
        permitted:
          false,
      }),
      task(),
      {
        handlers,
      },
    );

  assert.equal(
    nonExecutable.status,
    "not-executable",
  );
  assert.equal(calls, 0);

  pass(
    "non-executable cognitive decisions cannot reach execution handlers",
  );

  calls = 0;

  const staleMismatch =
    decision({
      governance:
        governance(
          "deny",
          "bounded",
        ),
    });

  const deniedAtRuntime =
    await runGovernedCognitiveExecution(
      staleMismatch,
      task(),
      {
        handlers,
      },
    );

  assert.equal(
    deniedAtRuntime.status,
    "executed",
  );
  assert.equal(
    deniedAtRuntime.task?.status,
    "failed",
  );
  assert.equal(calls, 0);

  pass(
    "runtime governance remains authoritative even if a stale or inconsistent cognitive decision claims execution is permitted",
  );

  const source =
    await readFile(
      "lib/chernobog/governance/cognitiveExecution.ts",
      "utf8",
    );

  assert.equal(
    source.includes(
      "runExecutionTask",
    ),
    true,
  );

  assert.equal(
    source.includes(
      "decision.governance",
    ),
    true,
  );

  assert.equal(
    source.includes(
      "decision.opportunity",
    ),
    true,
  );

  assert.equal(
    source.includes(
      "executeTool",
    ),
    false,
  );

  pass(
    "cognitive handoff targets the governed execution runtime and has no direct tool-execution bypass",
  );

  const runtimeSource =
    await readFile(
      "lib/chernobog/cognition/cognitiveRuntime.ts",
      "utf8",
    );

  assert.equal(
    runtimeSource.includes(
      "decideCognitiveResponse",
    ),
    true,
  );

  assert.equal(
    runtimeSource.includes(
      "runExecutionTask",
    ),
    false,
  );

  pass(
    "cognitive runtime remains a decision producer; concrete execution requires the explicit governed handoff",
  );

  console.log(
    "====================================================================",
  );
  console.log(
    "PASS Phase 11D-C Cognitive-to-Execution Governance Integration acceptance",
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
