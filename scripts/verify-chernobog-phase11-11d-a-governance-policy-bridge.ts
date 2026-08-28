import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";

import {
  gateCognitiveResponse,
} from "../lib/chernobog/cognition/actionGate";
import type {
  CognitiveActionOpportunity,
  CognitiveGovernanceSnapshot,
} from "../lib/chernobog/cognition/actionTypes";
import {
  evaluateUnifiedGovernance,
  mapExecutionModeToDisposition,
  mostRestrictiveDisposition,
} from "../lib/chernobog/governance/policyBridge";

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

function governance(
  options: {
    permission?:
      "allow" |
      "confirm" |
      "deny";
    autonomy?:
      "disabled" |
      "advisory" |
      "bounded";
    userInteractionAvailable?: boolean;
  } = {},
): CognitiveGovernanceSnapshot {
  return {
    permission:
      options.permission ??
      "allow",
    autonomy:
      options.autonomy ??
      "bounded",
    userInteractionAvailable:
      options.userInteractionAvailable ??
      true,
  };
}

function opportunity(
  options: {
    risk?:
      "low" |
      "medium" |
      "high" |
      "critical";
    effect?:
      "observe" |
      "read" |
      "write" |
      "external";
    reversible?: boolean;
    requiresUserInput?: boolean;
  } = {},
): CognitiveActionOpportunity {
  return {
    id: "test-opportunity",
    description:
      "Governance bridge verifier fixture",
    capability: "test",
    effect:
      options.effect ??
      "write",
    risk:
      options.risk ??
      "low",
    reversible:
      options.reversible ??
      true,
    requiresUserInput:
      options.requiresUserInput,
  };
}

async function main(): Promise<void> {
  console.log(
    "Chernobog Phase 11D-A - Governance Policy Bridge",
  );
  console.log(
    "=================================================",
  );

  assert.equal(
    mapExecutionModeToDisposition("auto"),
    "allow",
  );
  assert.equal(
    mapExecutionModeToDisposition("notice"),
    "allow",
  );
  assert.equal(
    mapExecutionModeToDisposition("approval"),
    "confirm",
  );
  assert.equal(
    mapExecutionModeToDisposition("blocked"),
    "deny",
  );

  pass(
    "legacy execution modes map deterministically into allow, confirm, or deny",
  );

  assert.equal(
    mostRestrictiveDisposition(
      "allow",
      "confirm",
      "deny",
    ),
    "deny",
  );
  assert.equal(
    mostRestrictiveDisposition(
      "allow",
      "confirm",
    ),
    "confirm",
  );

  pass(
    "the bridge is monotonic and always preserves the most restrictive disposition",
  );

  assert.equal(
    evaluateUnifiedGovernance({
      executionRisk: "safe",
    }).disposition,
    "allow",
  );
  assert.equal(
    evaluateUnifiedGovernance({
      executionRisk: "notice",
    }).disposition,
    "allow",
  );
  assert.equal(
    evaluateUnifiedGovernance({
      executionRisk:
        "approval_required",
    }).disposition,
    "confirm",
  );
  assert.equal(
    evaluateUnifiedGovernance({
      executionRisk: "blocked",
    }).disposition,
    "deny",
  );

  pass(
    "existing execution risk behavior is preserved when no cognitive governance context exists",
  );

  assert.equal(
    evaluateUnifiedGovernance({
      executionRisk: "safe",
      cognitive: {
        governance: governance({
          permission: "deny",
        }),
        opportunity: opportunity(),
      },
    }).disposition,
    "deny",
  );

  assert.equal(
    evaluateUnifiedGovernance({
      executionRisk: "safe",
      cognitive: {
        governance: governance({
          permission: "confirm",
        }),
        opportunity: opportunity(),
      },
    }).disposition,
    "confirm",
  );

  pass(
    "cognitive permission denial and confirmation can tighten otherwise safe execution",
  );

  for (
    const autonomy
    of [
      "disabled",
      "advisory",
    ] as const
  ) {
    assert.equal(
      evaluateUnifiedGovernance({
        executionRisk: "safe",
        cognitive: {
          governance: governance({
            autonomy,
          }),
          opportunity: opportunity(),
        },
      }).disposition,
      "confirm",
    );
  }

  pass(
    "disabled or advisory autonomy cannot authorize automatic execution",
  );

  assert.equal(
    evaluateUnifiedGovernance({
      executionRisk: "safe",
      cognitive: {
        governance: governance(),
        opportunity: opportunity({
          risk: "low",
          reversible: true,
        }),
      },
    }).disposition,
    "allow",
  );

  assert.equal(
    evaluateUnifiedGovernance({
      executionRisk: "safe",
      cognitive: {
        governance: governance(),
        opportunity: opportunity({
          risk: "medium",
          reversible: true,
        }),
      },
    }).disposition,
    "allow",
  );

  pass(
    "bounded autonomy may still authorize reversible low or medium risk actions",
  );

  for (
    const risk
    of [
      "high",
      "critical",
    ] as const
  ) {
    assert.equal(
      evaluateUnifiedGovernance({
        executionRisk: "safe",
        cognitive: {
          governance: governance(),
          opportunity: opportunity({
            risk,
          }),
        },
      }).disposition,
      "confirm",
    );
  }

  pass(
    "high and critical cognitive action risk cannot silently become automatic execution",
  );

  assert.equal(
    evaluateUnifiedGovernance({
      executionRisk: "safe",
      cognitive: {
        governance: governance(),
        opportunity: opportunity({
          effect: "write",
          reversible: false,
        }),
      },
    }).disposition,
    "confirm",
  );

  assert.equal(
    evaluateUnifiedGovernance({
      executionRisk: "safe",
      cognitive: {
        governance: governance(),
        opportunity: opportunity({
          requiresUserInput: true,
        }),
      },
    }).disposition,
    "confirm",
  );

  pass(
    "irreversible effects and missing required user input remain human-gated",
  );

  assert.equal(
    evaluateUnifiedGovernance({
      executionRisk:
        "approval_required",
      cognitive: {
        governance: governance(),
        opportunity: opportunity(),
      },
    }).disposition,
    "confirm",
  );

  assert.equal(
    evaluateUnifiedGovernance({
      executionRisk: "blocked",
      cognitive: {
        governance: governance(),
        opportunity: opportunity(),
      },
    }).disposition,
    "deny",
  );

  pass(
    "cognitive allow can never loosen execution approval or blocked risk policy",
  );

  const boundedOpportunity =
    opportunity({
      risk: "low",
      reversible: true,
    });

  const boundedGovernance =
    governance();

  const cognitiveAllowed =
    gateCognitiveResponse(
      "act",
      {
        focus: {
          generatedAt:
            "2026-08-26T12:00:00.000Z",
          attention: [],
          goals: [],
        } as never,
        opportunity:
          boundedOpportunity,
        governance:
          boundedGovernance,
      },
    );

  assert.equal(
    cognitiveAllowed
      .permittedToExecute,
    true,
  );

  assert.equal(
    evaluateUnifiedGovernance({
      executionRisk: "safe",
      cognitive: {
        governance:
          boundedGovernance,
        opportunity:
          boundedOpportunity,
      },
    }).disposition,
    "allow",
  );

  pass(
    "bridge preserves the existing 11H bounded-action allow case",
  );

  const highOpportunity =
    opportunity({
      risk: "high",
    });

  const cognitiveHigh =
    gateCognitiveResponse(
      "act",
      {
        focus: {
          generatedAt:
            "2026-08-26T12:00:00.000Z",
          attention: [],
          goals: [],
        } as never,
        opportunity:
          highOpportunity,
        governance:
          boundedGovernance,
      },
    );

  assert.equal(
    cognitiveHigh
      .permittedToExecute,
    false,
  );

  assert.equal(
    evaluateUnifiedGovernance({
      executionRisk: "safe",
      cognitive: {
        governance:
          boundedGovernance,
        opportunity:
          highOpportunity,
      },
    }).disposition,
    "confirm",
  );

  pass(
    "bridge preserves the existing 11H high-risk human-gating behavior",
  );

  const bridgeSource =
    await readFile(
      "lib/chernobog/governance/policyBridge.ts",
      "utf8",
    );

  assert.equal(
    bridgeSource.includes(
      "getRiskPolicy",
    ),
    true,
  );
  assert.equal(
    bridgeSource.includes(
      "CognitiveGovernanceSnapshot",
    ),
    true,
  );
  assert.equal(
    bridgeSource.includes(
      "executeTool",
    ),
    false,
  );
  assert.equal(
    bridgeSource.includes(
      "runExecutionTask(",
    ),
    false,
  );

  pass(
    "11D-A is a pure policy bridge and creates no execution or tool bypass",
  );

  console.log(
    "=================================================",
  );
  console.log(
    "PASS Phase 11D-A Governance Policy Bridge acceptance",
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
