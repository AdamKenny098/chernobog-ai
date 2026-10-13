import assert from "node:assert/strict";

import {
  COGNITIVE_PLANNING_ENGINE_VERSION,
  CognitivePlanningEngine,
} from "@chernobog/models/cognitivePlanningEngine";

import type {
  GoalDecomposition,
  GoalNode,
} from "@chernobog/models/goalDecomposer";

import type {
  ReasoningContract,
} from "@chernobog/models/reasoningContracts";

function pass(
  message: string,
) {
  console.log(
    `PASS ${message}`,
  );
}

function node(
  input: {
    id: string;
    kind?:
      GoalNode["kind"];
    dependsOn?:
      string[];
    tools?:
      string[];
    blocked?:
      boolean;
    depth?:
      number;
  },
): GoalNode {
  return {
    id:
      input.id,
    parentId:
      "root:test",
    kind:
      input.kind ??
      "subgoal",
    title:
      input.id,
    objective:
      `Complete ${input.id}`,
    status:
      input.blocked
        ? "blocked"
        : (
            input.dependsOn
              ?.length
            ? "planned"
            : "ready"
          ),
    depth:
      input.depth ??
      1,
    dependsOn:
      input.dependsOn ??
      [],
    acceptanceCriteria: [
      {
        id:
          `${input.id}:criterion:1`,
        description:
          `${input.id} complete`,
        required:
          true,
      },
    ],
    evidenceNeeds:
      input.tools
        ?.length
        ? [
            {
              kind:
                "tool",
              description:
                `Evidence for ${input.id}`,
              required:
                true,
            },
          ]
        : [],
    requiredTools:
      input.tools ??
      [],
    assumptions:
      [],
    blockers:
      input.blocked
        ? [
            "Blocked by test condition",
          ]
        : [],
    provenance: {
      source:
        "decomposer",
      sourceRef:
        `test:${input.id}`,
    },
  };
}

function decomposition(
  options: {
    blocked?: boolean;
  } = {},
): GoalDecomposition {
  const root:
    GoalNode = {
      id:
        "root:test",
      kind:
        "root",
      title:
        "Build release pipeline",
      objective:
        "A verified release pipeline",
      status:
        options.blocked
          ? "blocked"
          : "ready",
      depth:
        0,
      dependsOn:
        [],
      acceptanceCriteria: [
        {
          id:
            "root:test:criterion:1",
          description:
            "Pipeline verified",
          required:
            true,
        },
      ],
      evidenceNeeds:
        [],
      requiredTools:
        [],
      assumptions:
        [],
      blockers:
        options.blocked
          ? [
              "Need target environment",
            ]
          : [],
      provenance: {
        source:
          "interpreted-goal",
        sourceRef:
          "oh4j.goal",
      },
    };

  const nodes = [
    root,
    node({
      id:
        "requirements",
      depth:
        1,
    }),
    node({
      id:
        "evidence",
      dependsOn: [
        "requirements",
      ],
      tools: [
        "files",
        "runtime",
      ],
      depth:
        1,
    }),
    node({
      id:
        "implement",
      dependsOn: [
        "evidence",
      ],
      depth:
        1,
    }),
    node({
      id:
        "verify",
      kind:
        "verification",
      dependsOn: [
        "implement",
      ],
      depth:
        1,
    }),
    node({
      id:
        "finalize",
      kind:
        "integration",
      dependsOn: [
        "verify",
      ],
      depth:
        1,
    }),
  ];

  return {
    version:
      "oh4p.test",
    generatedAt:
      new Date()
        .toISOString(),
    rootGoalId:
      "root:test",
    nodes,
    edges: [
      {
        fromGoalId:
          "requirements",
        toGoalId:
          "evidence",
        kind:
          "requires",
        reason:
          "evidence depends on requirements",
      },
      {
        fromGoalId:
          "evidence",
        toGoalId:
          "implement",
        kind:
          "requires",
        reason:
          "implementation depends on evidence",
      },
      {
        fromGoalId:
          "implement",
        toGoalId:
          "verify",
        kind:
          "verifies",
        reason:
          "verification follows implementation",
      },
      {
        fromGoalId:
          "verify",
        toGoalId:
          "finalize",
        kind:
          "integrates",
        reason:
          "finalization follows verification",
      },
    ],
    maxDepth:
      1,
    complete:
      !options.blocked,
    planningReady:
      !options.blocked,
    unresolvedQuestions:
      options.blocked
        ? [
            {
              question:
                "Which environment?",
              blocking:
                true,
              reason:
                "Target environment is unknown.",
            },
          ]
        : [],
    warnings:
      [],
  };
}

function reasoningContract():
  ReasoningContract {
  return {
    version:
      "oh4o.test",
    generatedAt:
      new Date()
        .toISOString(),
    strategy:
      "tool-assisted",
    goal:
      "Build release pipeline",
    desiredOutcome:
      "A verified release pipeline",
    taskProfile: {
      primaryDomain:
        "coding",
      complexity:
        "complex",
      factuality:
        "high",
      creativity:
        "low",
      reasoningDepth:
        "deep",
      privacySensitivity:
        "internal",
      toolUseRequired:
        true,
      highRiskIncorrectness:
        false,
    },
    inputs: {
      interpretedIntentRequired:
        true,
      selectedContextRequired:
        true,
      modelRouteRequired:
        true,
      strategyRouteRequired:
        true,
      blockingQuestionsMustStop:
        true,
      preserveExplicitConstraints:
        true,
      preserveInferredConstraintDistinction:
        true,
    },
    evidence: {
      requirement:
        "externally-verified",
      requireProvenance:
        true,
      requireFreshnessAwareness:
        true,
      requireConfidenceAwareness:
        true,
      allowGeneralModelKnowledge:
        false,
      unsupportedClaimsAllowed:
        false,
      rules:
        [],
    },
    execution: {
      strategy:
        "tool-assisted",
      maxPasses:
        3,
      allowTools:
        true,
      allowMultiModel:
        false,
      allowEscalation:
        false,
      allowCriticPass:
        false,
      allowRefinementPass:
        true,
      mayExecuteActions:
        false,
      recipe: {
        strategy:
          "tool-assisted",
        multiPass:
          true,
        multiModel:
          false,
        requiresTools:
          true,
        maxPasses:
          3,
        steps:
          [],
      },
    },
    validation: {
      mode:
        "tool-grounded",
      required:
        true,
      minimumChecks:
        1,
      validateConstraints:
        true,
      validateEvidence:
        true,
      validateFactuality:
        true,
      validateOutputContract:
        true,
      failureBehavior:
        "stop",
      rules:
        [],
    },
    uncertainty: {
      assumptionsMustBeExplicit:
        true,
      uncertaintiesMustBeExplicit:
        true,
      contradictionsMustBeSurfaced:
        true,
      unresolvedQuestionsMustBePreserved:
        true,
      confidenceRequired:
        true,
      rules:
        [],
    },
    authority: {
      reasoningMayProposeActions:
        true,
      reasoningMayAuthorizeActions:
        false,
      reasoningMayExecuteActions:
        false,
      approvalRequiredForExecution:
        true,
      rules:
        [],
    },
    visibility: {
      privateScratchReasoningRequired:
        false,
      privateScratchReasoningPersisted:
        false,
      auditSummaryRequired:
        true,
      retain: [
        "conclusions",
        "assumptions",
        "uncertainties",
        "evidence-references",
        "validation-results",
        "proposed-actions",
        "confidence",
      ],
      rules:
        [],
    },
    result: {
      requireConclusions:
        true,
      requireAssumptions:
        true,
      requireUncertainties:
        true,
      requireEvidenceReferences:
        true,
      requireValidationResults:
        true,
      requireConfidence:
        true,
      proposedActionsExecutable:
        false,
    },
    stopConditions: [
      "goal-satisfied",
      "required-evidence-missing",
      "validation-failed",
      "validation-passed",
      "authority-required",
    ],
    warnings:
      [],
  };
}

function indexOfGoal(
  plan:
    ReturnType<
      CognitivePlanningEngine[
        "plan"
      ]
    >,
  goalId: string,
): number {
  return plan.steps
    .findIndex(
      (step) =>
        step.goalId ===
        goalId,
    );
}

function main() {
  console.log(
    "Chernobog OH-4Q â€” Planning Engine Verification",
  );
  console.log(
    "============================================",
  );

  const engine =
    new CognitivePlanningEngine();

  const plan =
    engine.plan({
      decomposition:
        decomposition(),
      reasoningContract:
        reasoningContract(),
    });

  assert.equal(
    plan.version,
    COGNITIVE_PLANNING_ENGINE_VERSION,
  );

  assert.equal(
    plan.status,
    "ready",
  );

  assert.equal(
    plan.planningReady,
    true,
  );

  pass(
    "planning engine accepts a planning-ready OH-4P graph and OH-4O contract",
  );

  assert.ok(
    indexOfGoal(
      plan,
      "requirements",
    ) <
    indexOfGoal(
      plan,
      "evidence",
    ),
  );

  assert.ok(
    indexOfGoal(
      plan,
      "evidence",
    ) <
    indexOfGoal(
      plan,
      "implement",
    ),
  );

  assert.ok(
    indexOfGoal(
      plan,
      "implement",
    ) <
    indexOfGoal(
      plan,
      "verify",
    ),
  );

  assert.ok(
    indexOfGoal(
      plan,
      "verify",
    ) <
    indexOfGoal(
      plan,
      "finalize",
    ),
  );

  pass(
    "topological ordering guarantees every dependency appears before its dependent step",
  );

  const evidenceStep =
    plan.steps.find(
      (step) =>
        step.goalId ===
        "evidence",
    );

  assert.ok(
    evidenceStep
      ?.requiredTools.includes(
        "files",
      ),
  );

  assert.ok(
    evidenceStep
      ?.evidenceNeeds.some(
        (need) =>
          need.kind ===
          "tool" &&
          need.required,
      ),
  );

  assert.equal(
    evidenceStep
      ?.mayExecute,
    false,
  );

  pass(
    "tool/evidence requirements propagate into the plan without granting execution",
  );

  const verifyStep =
    plan.steps.find(
      (step) =>
        step.goalId ===
        "verify",
    );

  assert.equal(
    verifyStep
      ?.kind,
    "verification",
  );

  assert.equal(
    verifyStep
      ?.verification.required,
    true,
  );

  assert.equal(
    verifyStep
      ?.verification.mode,
    "tool-grounded",
  );

  assert.ok(
    verifyStep
      ?.verification.checks.some(
        (check) =>
          /evidence/.test(
            check.toLowerCase(),
          ),
      ),
  );

  pass(
    "reasoning-contract validation requirements become explicit plan verification checkpoints",
  );

  assert.ok(
    plan.stages.length >=
    1,
  );

  assert.equal(
    plan.invariants
      .schedulingPerformed,
    false,
  );

  assert.equal(
    plan.invariants
      .priorityAssigned,
    false,
  );

  assert.equal(
    plan.invariants
      .actionsExecutable,
    false,
  );

  assert.equal(
    plan.invariants
      .authorityBypassed,
    false,
  );

  pass(
    "OH-4Q orders dependencies but performs no scheduling, prioritization, execution, or authority bypass",
  );

  const blockedPlan =
    engine.plan({
      decomposition:
        decomposition({
          blocked:
            true,
        }),
      reasoningContract:
        reasoningContract(),
    });

  assert.equal(
    blockedPlan.status,
    "blocked",
  );

  assert.equal(
    blockedPlan.planningReady,
    false,
  );

  assert.ok(
    blockedPlan.steps.every(
      (step) =>
        step.readiness ===
        "blocked",
    ),
  );

  assert.ok(
    blockedPlan.unresolvedQuestions
      .some(
        (question) =>
          question.blocking,
      ),
  );

  pass(
    "blocking unresolved intent produces an inspectable blocked plan rather than fabricated execution readiness",
  );

  const invalid =
    decomposition();

  const implement =
    invalid.nodes.find(
      (entry) =>
        entry.id ===
        "implement",
    );

  if (!implement) {
    throw new Error(
      "test fixture missing implement node",
    );
  }

  implement.dependsOn = [
    "missing-goal",
  ];

  assert.throws(
    () =>
      engine.plan({
        decomposition:
          invalid,
        reasoningContract:
          reasoningContract(),
      }),
    /unknown dependency/,
  );

  pass(
    "planning engine defensively rejects invalid dependency references even if malformed input bypasses OH-4P",
  );

  assert.ok(
    plan.steps.every(
      (step) =>
        step.provenance
          .goalSourceRef.length >
        0 &&
        step
          .requiresAuthorityBeforeExecution ===
        true,
    ),
  );

  pass(
    "every plan step retains goal provenance and remains authority-gated",
  );

  console.log("");
  console.log(
    "OH-4Q planning engine verification complete.",
  );
}

main();