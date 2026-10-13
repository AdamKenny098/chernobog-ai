import assert from "node:assert/strict";

import {
  InputInterpreter,
} from "@chernobog/models/inputInterpreter";

import {
  REASONING_CONTRACT_VERSION,
  ReasoningContractBuilder,
} from "@chernobog/models/reasoningContracts";

import type {
  StrategyRouteDecision,
  CognitiveStrategyKind,
  StrategyRecipe,
} from "@chernobog/models/strategyRouter";

function pass(
  message: string,
) {
  console.log(
    `PASS ${message}`,
  );
}

function recipe(
  strategy:
    CognitiveStrategyKind,
): StrategyRecipe {
  switch (
    strategy
  ) {
    case "critic-loop":
      return {
        strategy,
        multiPass:
          true,
        multiModel:
          false,
        requiresTools:
          false,
        maxPasses:
          3,
        steps: [
          {
            order:
              1,
            action:
              "reason",
            purpose:
              "draft",
            modelRole:
              "primary",
            toolUseAllowed:
              false,
          },
          {
            order:
              2,
            action:
              "critique",
            purpose:
              "critic",
            modelRole:
              "critic",
            toolUseAllowed:
              false,
          },
          {
            order:
              3,
            action:
              "refine",
            purpose:
              "repair",
            modelRole:
              "primary",
            toolUseAllowed:
              false,
          },
        ],
      };

    case "tool-assisted":
      return {
        strategy,
        multiPass:
          true,
        multiModel:
          false,
        requiresTools:
          true,
        maxPasses:
          3,
        steps: [
          {
            order:
              1,
            action:
              "use-tools",
            purpose:
              "retrieve evidence",
            modelRole:
              "primary",
            toolUseAllowed:
              true,
          },
          {
            order:
              2,
            action:
              "reason",
            purpose:
              "reason from evidence",
            modelRole:
              "primary",
            toolUseAllowed:
              true,
          },
        ],
      };

    case "competition":
      return {
        strategy,
        multiPass:
          true,
        multiModel:
          true,
        requiresTools:
          false,
        maxPasses:
          3,
        steps: [
          {
            order:
              1,
            action:
              "reason",
            purpose:
              "candidate one",
            modelRole:
              "primary",
            toolUseAllowed:
              false,
          },
          {
            order:
              2,
            action:
              "reason",
            purpose:
              "candidate two",
            modelRole:
              "secondary",
            toolUseAllowed:
              false,
          },
          {
            order:
              3,
            action:
              "compare",
            purpose:
              "compare",
            modelRole:
              "critic",
            toolUseAllowed:
              false,
          },
        ],
      };

    default:
      return {
        strategy,
        multiPass:
          false,
        multiModel:
          false,
        requiresTools:
          false,
        maxPasses:
          1,
        steps: [
          {
            order:
              1,
            action:
              "reason",
            purpose:
              "complete task",
            modelRole:
              "primary",
            toolUseAllowed:
              false,
          },
        ],
      };
  }
}

function strategyDecision(
  strategy:
    CognitiveStrategyKind,
): StrategyRouteDecision {
  const selectedRecipe =
    recipe(
      strategy,
    );

  return {
    version:
      "oh4n.test",
    routedAt:
      new Date()
        .toISOString(),
    status:
      "selected",
    selected: {
      strategy,
      eligible:
        true,
      exclusionReasons:
        [],
      score:
        0.9,
      confidence:
        0.9,
      components:
        [],
      recipe:
        selectedRecipe,
      reasons: [
        "test",
      ],
    },
    ranking:
      [],
    modelRouteStatus:
      "selected",
    selectedModelId:
      "test:model",
    taskSummary: {
      primaryDomain:
        "coding",
      complexity:
        "complex",
      creativity:
        "low",
      factuality:
        "high",
      reasoningDepth:
        "deep",
      latencyTolerance:
        "flexible",
      costTolerance:
        "standard",
      toolUseRequired:
        strategy ===
        "tool-assisted",
    },
    constraints:
      {},
    warnings:
      [],
  };
}

async function interpretationFor(
  mode:
    "normal"
    | "critical"
    | "tools"
    | "ambiguous",
) {
  const interpreter =
    new InputInterpreter(
      async () => ({
        intentKind:
          "create",
        goal:
          "Produce a correct result",
        desiredOutcome:
          "A verified result",
        explicitConstraints: [
          "Do not execute changes",
        ],
        unresolvedQuestions:
          mode ===
            "ambiguous"
            ? [
                {
                  question:
                    "Which target?",
                  blocking:
                    true,
                  reason:
                    "Target is missing.",
                },
              ]
            : [],
        domains: [
          "coding",
        ],
        requiredTools:
          mode ===
            "tools"
            ? [
                "files",
                "runtime",
              ]
            : [],
        estimatedSteps:
          6,
        dependencyCount:
          3,
        ambiguityLevel:
          mode ===
            "ambiguous"
            ? 0.95
            : 0.05,
        factualVerification:
          mode ===
            "critical"
            ? 1
            : 0.7,
        evidenceDependency:
          mode ===
            "critical" ||
          mode ===
            "tools"
            ? 1
            : 0.5,
        consequenceSeverity:
          mode ===
            "critical"
            ? 1
            : 0.4,
        reasoningSteps:
          8,
        crossDomainReasoning:
          false,
        confidence:
          0.95,
      }),
    );

  return interpreter.interpret({
    modality:
      "typed",
    text:
      mode ===
        "ambiguous"
        ? "Change it."
        : "Produce a correct result.",
  });
}

async function main() {
  console.log(
    "Chernobog OH-4O â€” Reasoning Contracts Verification",
  );
  console.log(
    "=================================================",
  );

  const builder =
    new ReasoningContractBuilder();

  const normal =
    await interpretationFor(
      "normal",
    );

  const normalContract =
    builder.build({
      interpretation:
        normal,
      strategyRoute:
        strategyDecision(
          "single-model",
        ),
    });

  assert.equal(
    normalContract.version,
    REASONING_CONTRACT_VERSION,
  );

  assert.equal(
    normalContract.execution
      .mayExecuteActions,
    false,
  );

  assert.equal(
    normalContract.authority
      .reasoningMayAuthorizeActions,
    false,
  );

  assert.equal(
    normalContract.authority
      .reasoningMayExecuteActions,
    false,
  );

  pass(
    "reasoning may propose but cannot authorize or execute actions",
  );

  assert.equal(
    normalContract.visibility
      .privateScratchReasoningRequired,
    false,
  );

  assert.equal(
    normalContract.visibility
      .privateScratchReasoningPersisted,
    false,
  );

  assert.ok(
    normalContract.visibility
      .retain.includes(
        "conclusions",
      ),
  );

  assert.ok(
    normalContract.visibility
      .retain.includes(
        "evidence-references",
      ),
  );

  pass(
    "contract retains audit artifacts without requiring or persisting private scratch reasoning",
  );

  const critical =
    await interpretationFor(
      "critical",
    );

  const criticContract =
    builder.build({
      interpretation:
        critical,
      strategyRoute:
        strategyDecision(
          "critic-loop",
        ),
    });

  assert.equal(
    criticContract.validation
      .mode,
    "critic",
  );

  assert.equal(
    criticContract.validation
      .required,
    true,
  );

  assert.equal(
    criticContract.evidence
      .requireProvenance,
    true,
  );

  assert.equal(
    criticContract.evidence
      .unsupportedClaimsAllowed,
    false,
  );

  assert.ok(
    criticContract.stopConditions
      .includes(
        "validation-failed",
      ),
  );

  pass(
    "high-risk critic-loop reasoning requires evidence-aware validation and explicit failure handling",
  );

  const tools =
    await interpretationFor(
      "tools",
    );

  const toolContract =
    builder.build({
      interpretation:
        tools,
      strategyRoute:
        strategyDecision(
          "tool-assisted",
        ),
    });

  assert.equal(
    toolContract.execution
      .allowTools,
    true,
  );

  assert.equal(
    toolContract.evidence
      .requirement,
    "externally-verified",
  );

  assert.ok(
    toolContract.stopConditions
      .includes(
        "tool-unavailable",
      ),
  );

  assert.ok(
    toolContract.warnings
      .some(
        (warning) =>
          /authority\/action layers/.test(
            warning,
          ),
      ),
  );

  pass(
    "tool-assisted reasoning permits evidence acquisition without granting tool authority",
  );

  const competitionContract =
    builder.build({
      interpretation:
        critical,
      strategyRoute:
        strategyDecision(
          "competition",
        ),
    });

  assert.equal(
    competitionContract.execution
      .allowMultiModel,
    true,
  );

  assert.equal(
    competitionContract.validation
      .mode,
    "comparison",
  );

  assert.equal(
    competitionContract.evidence
      .requirement,
    "cross-checked",
  );

  assert.ok(
    competitionContract.warnings
      .some(
        (warning) =>
          /OH-4S/.test(
            warning,
          ),
      ),
  );

  pass(
    "multi-model competition is described contractually but execution remains deferred to OH-4S",
  );

  const ambiguous =
    await interpretationFor(
      "ambiguous",
    );

  const ambiguousContract =
    builder.build({
      interpretation:
        ambiguous,
      strategyRoute:
        strategyDecision(
          "single-model",
        ),
    });

  assert.equal(
    ambiguousContract.inputs
      .blockingQuestionsMustStop,
    true,
  );

  assert.ok(
    ambiguousContract.stopConditions
      .includes(
        "blocking-ambiguity",
      ),
  );

  assert.ok(
    ambiguousContract.warnings
      .some(
        (warning) =>
          /blocking ambiguity/.test(
            warning,
          ),
      ),
  );

  pass(
    "blocking unresolved intent becomes a deterministic stop condition instead of an invitation to guess",
  );

  const noStrategy:
    StrategyRouteDecision = {
      ...strategyDecision(
        "single-model",
      ),
      status:
        "no-eligible-strategy",
      selected:
        undefined,
    };

  assert.throws(
    () =>
      builder.build({
        interpretation:
          normal,
        strategyRoute:
          noStrategy,
      }),
    /requires an OH-4N selected strategy/,
  );

  pass(
    "OH-4O refuses to create a reasoning contract without a valid OH-4N strategy decision",
  );

  console.log("");
  console.log(
    "OH-4O reasoning contracts verification complete.",
  );
}

void main().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);