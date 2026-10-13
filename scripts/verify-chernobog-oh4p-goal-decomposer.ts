import assert from "node:assert/strict";

import {
  GoalDecomposer,
  GOAL_DECOMPOSER_VERSION,
} from "@chernobog/models/goalDecomposer";

import {
  InputInterpreter,
} from "@chernobog/models/inputInterpreter";

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

async function interpretation(
  options: {
    ambiguous?: boolean;
    tools?: boolean;
  } = {},
) {
  const interpreter =
    new InputInterpreter(
      async () => ({
        intentKind:
          "plan",
        goal:
          options.ambiguous
            ? "Modify the target"
            : "Build the new release pipeline",
        desiredOutcome:
          options.ambiguous
            ? "Updated target"
            : "A verified release pipeline ready for planning",
        explicitConstraints: [
          "Do not execute changes",
        ],
        unresolvedQuestions:
          options.ambiguous
            ? [
                {
                  question:
                    "Which target?",
                  blocking:
                    true,
                  reason:
                    "No target was identified.",
                },
              ]
            : [],
        domains: [
          "coding",
          "planning",
        ],
        requiredTools:
          options.tools
            ? [
                "files",
                "runtime",
              ]
            : [],
        estimatedSteps:
          8,
        dependencyCount:
          4,
        ambiguityLevel:
          options.ambiguous
            ? 0.95
            : 0.05,
        factualVerification:
          0.9,
        evidenceDependency:
          0.9,
        consequenceSeverity:
          0.7,
        reasoningSteps:
          8,
        crossDomainReasoning:
          true,
        confidence:
          0.96,
      }),
    );

  return interpreter.interpret({
    modality:
      "typed",
    text:
      options.ambiguous
        ? "Change it."
        : "Build the new release pipeline.",
  });
}

function contract(
  options: {
    validation?: boolean;
    tools?: boolean;
    evidence?:
      "none"
      | "context-supported"
      | "externally-verified"
      | "cross-checked";
  } = {},
): ReasoningContract {
  const validation =
    options.validation ??
    true;

  return {
    version:
      "oh4o.test",
    generatedAt:
      new Date()
        .toISOString(),
    strategy:
      options.tools
        ? "tool-assisted"
        : validation
          ? "critic-loop"
          : "single-model",
    goal:
      "Build the new release pipeline",
    desiredOutcome:
      "A verified release pipeline ready for planning",
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
        options.tools ??
        false,
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
        options.evidence ??
        (
          options.tools
            ? "externally-verified"
            : "context-supported"
        ),
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
        options.tools
          ? "tool-assisted"
          : validation
            ? "critic-loop"
            : "single-model",
      maxPasses:
        3,
      allowTools:
        options.tools ??
        false,
      allowMultiModel:
        false,
      allowEscalation:
        false,
      allowCriticPass:
        validation,
      allowRefinementPass:
        validation,
      mayExecuteActions:
        false,
      recipe: {
        strategy:
          options.tools
            ? "tool-assisted"
            : validation
              ? "critic-loop"
              : "single-model",
        multiPass:
          validation,
        multiModel:
          false,
        requiresTools:
          options.tools ??
          false,
        maxPasses:
          3,
        steps:
          [],
      },
    },
    validation: {
      mode:
        validation
          ? "critic"
          : "none",
      required:
        validation,
      minimumChecks:
        validation
          ? 1
          : 0,
      validateConstraints:
        true,
      validateEvidence:
        true,
      validateFactuality:
        true,
      validateOutputContract:
        true,
      failureBehavior:
        validation
          ? "revise"
          : "surface-uncertainty",
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
        validation,
      requireConfidence:
        true,
      proposedActionsExecutable:
        false,
    },
    stopConditions: [
      "goal-satisfied",
      "blocking-ambiguity",
      "pass-budget-exhausted",
      "authority-required",
    ],
    warnings:
      [],
  };
}

async function main() {
  console.log(
    "Chernobog OH-4P â€” Goal Decomposer Verification",
  );
  console.log(
    "=============================================",
  );

  const interpreted =
    await interpretation({
      tools:
        true,
    });

  const decomposer =
    new GoalDecomposer();

  const result =
    await decomposer.decompose({
      interpretation:
        interpreted,
      reasoningContract:
        contract({
          tools:
            true,
          validation:
            true,
          evidence:
            "externally-verified",
        }),
    });

  assert.equal(
    result.version,
    GOAL_DECOMPOSER_VERSION,
  );

  assert.equal(
    result.nodes[0]
      ?.kind,
    "root",
  );

  assert.equal(
    result.nodes[0]
      ?.title,
    "Build the new release pipeline",
  );

  assert.ok(
    result.nodes.some(
      (node) =>
        node.id ===
        "secure-evidence",
    ),
  );

  assert.ok(
    result.nodes.some(
      (node) =>
        node.id ===
        "validate-result" &&
        node.kind ===
        "verification",
    ),
  );

  assert.ok(
    result.nodes.some(
      (node) =>
        node.id ===
        "finalize-outcome" &&
        node.kind ===
        "integration",
    ),
  );

  pass(
    "default decomposition derives requirement, evidence, production, validation and integration goals from OH-4J/OH-4O",
  );

  const secureEvidence =
    result.nodes.find(
      (node) =>
        node.id ===
        "secure-evidence",
    );

  assert.ok(
    secureEvidence
      ?.requiredTools.includes(
        "files",
      ),
  );

  assert.ok(
    secureEvidence
      ?.requiredTools.includes(
        "runtime",
      ),
  );

  assert.ok(
    secureEvidence
      ?.evidenceNeeds.some(
        (need) =>
          need.required &&
          need.kind ===
          "tool",
      ),
  );

  pass(
    "tool/evidence requirements propagate into the goal graph without executing tools",
  );

  assert.ok(
    result.edges.some(
      (edge) =>
        edge.fromGoalId ===
        "produce-result" &&
        edge.toGoalId ===
        "validate-result" &&
        edge.kind ===
        "verifies",
    ),
  );

  assert.ok(
    result.edges.some(
      (edge) =>
        edge.toGoalId ===
        "finalize-outcome" &&
        edge.kind ===
        "integrates",
    ),
  );

  assert.ok(
    result.maxDepth >=
    1,
  );

  assert.equal(
    result.complete,
    true,
  );

  assert.equal(
    result.planningReady,
    true,
  );

  pass(
    "decomposition exposes explicit dependency edges and planning-readiness without sequencing execution",
  );

  const custom =
    new GoalDecomposer(
      async () => ({
        rootTitle:
          "Custom root",
        rootObjective:
          "Custom result",
        nodes: [
          {
            id:
              "design",
            title:
              "Design",
            objective:
              "Design the change",
            acceptanceCriteria: [
              "Design approved",
            ],
          },
          {
            id:
              "implement",
            title:
              "Implement",
            objective:
              "Implement the design",
            dependsOn: [
              "design",
            ],
            acceptanceCriteria: [
              "Implementation complete",
            ],
          },
        ],
      }),
    );

  const customResult =
    await custom.decompose({
      interpretation:
        interpreted,
      reasoningContract:
        contract({
          validation:
            false,
        }),
    });

  assert.equal(
    customResult.nodes
      .find(
        (node) =>
          node.id ===
          "implement",
      )
      ?.dependsOn[0],
    "design",
  );

  assert.equal(
    customResult.planningReady,
    true,
  );

  pass(
    "replaceable decomposition analyzer can provide richer subgoals while preserving the same contract",
  );

  const cyclic =
    new GoalDecomposer(
      async () => ({
        nodes: [
          {
            id:
              "a",
            title:
              "A",
            objective:
              "A",
            dependsOn: [
              "b",
            ],
            acceptanceCriteria: [
              "A done",
            ],
          },
          {
            id:
              "b",
            title:
              "B",
            objective:
              "B",
            dependsOn: [
              "a",
            ],
            acceptanceCriteria: [
              "B done",
            ],
          },
        ],
      }),
    );

  await assert.rejects(
    () =>
      cyclic.decompose({
        interpretation:
          interpreted,
        reasoningContract:
          contract(),
      }),
    /dependency cycle/,
  );

  pass(
    "dependency cycles are rejected before OH-4Q planning can consume the graph",
  );

  const ambiguous =
    await interpretation({
      ambiguous:
        true,
    });

  const blocked =
    await decomposer.decompose({
      interpretation:
        ambiguous,
      reasoningContract:
        contract(),
    });

  assert.equal(
    blocked.complete,
    false,
  );

  assert.equal(
    blocked.planningReady,
    false,
  );

  assert.equal(
    blocked.nodes.length,
    1,
  );

  assert.equal(
    blocked.nodes[0]
      ?.status,
    "blocked",
  );

  assert.ok(
    blocked.unresolvedQuestions
      .some(
        (question) =>
          question.blocking,
      ),
  );

  pass(
    "blocking ambiguity stops decomposition rather than fabricating subgoals",
  );

  assert.ok(
    result.nodes.every(
      (node) =>
        node.provenance
          .sourceRef.length >
        0,
    ),
  );

  assert.equal(
    result.nodes.some(
      (node) =>
        "executable" in
        node,
    ),
    false,
  );

  pass(
    "goal graph remains provenance-bearing and non-executable; authority is still downstream",
  );

  console.log("");
  console.log(
    "OH-4P goal decomposer verification complete.",
  );
}

void main().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);