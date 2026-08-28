import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";

import type {
  CognitiveActionOpportunity,
  CognitiveGovernanceSnapshot,
} from "../lib/chernobog/cognition/actionTypes";
import {
  runExecutionTask,
} from "../lib/chernobog/execution/runExecutionTask";
import type {
  ExecutionTask,
} from "../lib/chernobog/execution/types";

function pass(message: string): void {
  console.log(`PASS ${message}`);
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

function opportunity(
  risk:
    "low" |
    "medium" |
    "high" |
    "critical" = "low",
): CognitiveActionOpportunity {
  return {
    id: "11d-b-test",
    description: "11D-B verifier action",
    capability: "test",
    effect: "write",
    risk,
    reversible: true,
  };
}

let serial = 0;

function task(
  options: {
    taskRisk?:
      "safe" |
      "notice" |
      "approval_required" |
      "blocked";
    stepRisk?:
      "safe" |
      "notice" |
      "approval_required" |
      "blocked";
    required?: boolean;
    approved?: boolean;
  } = {},
): ExecutionTask {
  serial += 1;

  return {
    id: `11d-b-${serial}`,
    category: "system_operation",
    input: "11D-B verifier",
    goal: "verify runtime governance",
    status: "pending",
    risk: options.taskRisk ?? "safe",
    steps: [
      {
        id: "step-1",
        kind: "tool",
        label: "Verifier tool step",
        status: "pending",
        action: "verifier.test",
        input: {},
        risk: options.stepRisk ?? "safe",
      },
    ],
    currentStepId: "step-1",
    approval: {
      required: options.required ?? false,
      approved: options.approved,
    },
    context: {},
    createdAt: "2026-08-27T10:00:00.000Z",
    updatedAt: "2026-08-27T10:00:00.000Z",
  };
}

async function main(): Promise<void> {
  console.log(
    "Chernobog Phase 11D-B - Runtime Governance Enforcement",
  );
  console.log(
    "=======================================================",
  );

  let calls = 0;

  const handlers = {
    "verifier.test": async () => {
      calls += 1;
      return {
        success: true,
        output: { ok: true },
      };
    },
  };

  calls = 0;
  const legacy = await runExecutionTask(
    task(),
    { handlers },
  );

  assert.equal(legacy.status, "completed");
  assert.equal(calls, 1);

  pass(
    "legacy safe execution remains unchanged when no cognitive governance is supplied",
  );

  calls = 0;
  const denied = await runExecutionTask(
    task(),
    {
      handlers,
      governance: {
        governance: governance("deny"),
        opportunity: opportunity(),
      },
    },
  );

  assert.equal(denied.status, "failed");
  assert.equal(calls, 0);

  pass(
    "cognitive deny stops a legacy-safe task before handler dispatch",
  );

  calls = 0;
  const confirmation =
    await runExecutionTask(
      task(),
      {
        handlers,
        governance: {
          governance:
            governance("confirm"),
          opportunity:
            opportunity(),
        },
      },
    );

  assert.equal(
    confirmation.status,
    "waiting_for_approval",
  );
  assert.equal(
    confirmation.approval.required,
    true,
  );
  assert.equal(
    typeof confirmation.approval.reason,
    "string",
  );
  assert.equal(calls, 0);

  pass(
    "cognitive confirm enters the existing approval flow and marks approval as required",
  );

  calls = 0;
  const approved =
    await runExecutionTask(
      task({
        approved: true,
      }),
      {
        handlers,
        governance: {
          governance:
            governance("confirm"),
          opportunity:
            opportunity(),
        },
      },
    );

  assert.equal(approved.status, "completed");
  assert.equal(calls, 1);

  pass(
    "existing approved state satisfies confirmation without creating a parallel approval mechanism",
  );

  calls = 0;
  const blocked =
    await runExecutionTask(
      task({
        taskRisk: "blocked",
        approved: true,
      }),
      {
        handlers,
        governance: {
          governance:
            governance("allow"),
          opportunity:
            opportunity(),
        },
      },
    );

  assert.equal(blocked.status, "failed");
  assert.equal(calls, 0);

  pass(
    "cognitive allow cannot loosen blocked execution risk",
  );

  calls = 0;
  const stepDenied =
    await runExecutionTask(
      task(),
      {
        handlers,
        governance: {
          governance:
            governance("allow"),
          opportunity:
            opportunity(),
        },
        resolveStepGovernance:
          () => ({
            governance:
              governance("deny"),
            opportunity:
              opportunity(),
          }),
      },
    );

  assert.equal(stepDenied.status, "failed");
  assert.equal(
    stepDenied.steps[0].status,
    "blocked",
  );
  assert.equal(calls, 0);

  pass(
    "per-step governance can tighten task-level governance before execution",
  );

  calls = 0;
  const highRisk =
    await runExecutionTask(
      task(),
      {
        handlers,
        governance: {
          governance:
            governance("allow"),
          opportunity:
            opportunity("high"),
        },
      },
    );

  assert.equal(
    highRisk.status,
    "waiting_for_approval",
  );
  assert.equal(
    highRisk.approval.required,
    true,
  );
  assert.equal(calls, 0);

  pass(
    "high cognitive risk becomes an approval pause rather than automatic execution",
  );

  calls = 0;
  const legacyStepApproval =
    await runExecutionTask(
      task({
        stepRisk:
          "approval_required",
      }),
      { handlers },
    );

  assert.equal(
    legacyStepApproval.status,
    "waiting_for_approval",
  );
  assert.equal(
    legacyStepApproval.approval.required,
    true,
  );
  assert.equal(calls, 0);

  pass(
    "legacy approval-required steps still use the same approval state",
  );

  const source = await readFile(
    "lib/chernobog/execution/runExecutionTask.ts",
    "utf8",
  );

  for (const required of [
    "evaluateTaskRuntimeGovernance",
    "evaluateStepRuntimeGovernance",
    "getRiskPolicyForStep",
    "shouldPauseForApproval",
    "resolveStepGovernance",
  ]) {
    assert.equal(
      source.includes(required),
      true,
      `Missing runtime integration: ${required}`,
    );
  }

  pass(
    "runExecutionTask consumes unified governance while retaining legacy risk and approval integration",
  );

  const runtimeSource = await readFile(
    "lib/chernobog/governance/runtimeGovernance.ts",
    "utf8",
  );

  assert.equal(
    runtimeSource.includes(
      "evaluateUnifiedGovernance",
    ),
    true,
  );
  assert.equal(
    runtimeSource.includes("executeTool"),
    false,
  );

  pass(
    "runtime governance delegates to 11D-A policy and creates no direct tool path",
  );

  console.log(
    "=======================================================",
  );
  console.log(
    "PASS Phase 11D-B Runtime Governance Enforcement acceptance",
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
