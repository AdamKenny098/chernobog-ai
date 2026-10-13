import assert from "node:assert/strict";

import {
  InputInterpreter,
} from "@chernobog/models/inputInterpreter";

import {
  ModelRouter,
  type ModelRoutingCandidate,
} from "@chernobog/models/modelDecisionRouter";

import {
  STRATEGY_ROUTER_VERSION,
  StrategyRouter,
} from "@chernobog/models/strategyRouter";

function pass(
  message: string,
) {
  console.log(
    `PASS ${message}`,
  );
}

function candidate(
  id: string,
  capabilities:
    string[],
): ModelRoutingCandidate {
  const [
    provider,
    ...modelParts
  ] =
    id.split(":");

  return {
    id,
    provider:
      provider ||
      "test",
    model:
      modelParts.join(":") ||
      id,
    displayName:
      id,
    enabled:
      true,
    availability:
      "available",
    local:
      true,
    roles:
      [],
    capabilities,
    contextLimits: {
      known:
        false,
    },
    cost: {
      known:
        false,
      mode:
        "local-compute",
    },
    privacy: {
      execution:
        "local",
      promptLeavesDevice:
        false,
      retention:
        "local-runtime",
    },
    strengths:
      capabilities,
    weaknesses:
      [],
    tags:
      capabilities,
  };
}

async function interpretation(
  mode:
    "simple"
    | "tools"
    | "critical"
    | "creative",
) {
  const analyzer =
    new InputInterpreter(
      async () => ({
        intentKind:
          "create",
        goal:
          "Complete the requested task",
        desiredOutcome:
          "A high quality result",
        explicitConstraints:
          [],
        unresolvedQuestions:
          [],
        domains: [
          mode ===
            "creative"
            ? "creative"
            : "coding",
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
          mode ===
            "simple"
            ? 1
            : 8,
        dependencyCount:
          mode ===
            "simple"
            ? 0
            : 4,
        ambiguityLevel:
          0.05,
        noveltyLevel:
          mode ===
            "creative"
            ? 0.9
            : 0.3,
        creativeGeneration:
          mode ===
            "creative"
            ? 1
            : 0.1,
        styleSensitivity:
          mode ===
            "creative"
            ? 0.9
            : 0.1,
        factualVerification:
          mode ===
            "critical"
            ? 1
            : 0.5,
        evidenceDependency:
          mode ===
            "critical" ||
          mode ===
            "tools"
            ? 1
            : 0.4,
        consequenceSeverity:
          mode ===
            "critical"
            ? 1
            : 0.3,
        reasoningSteps:
          mode ===
            "simple"
            ? 1
            : 10,
        crossDomainReasoning:
          mode !==
          "simple",
        minimizeCost:
          mode ===
            "simple",
        requestedLatencyMs:
          mode ===
            "simple"
            ? 1_000
            : undefined,
        confidence:
          0.95,
      }),
    );

  return analyzer.interpret({
    modality:
      "typed",
    text:
      "Complete the requested task.",
  });
}

async function routeModels(
  input:
    Awaited<
      ReturnType<
        typeof interpretation
      >
    >,
  count = 2,
) {
  const candidates = [
    candidate(
      "ollama:primary",
      [
        "coding",
        "creative",
      ],
    ),
    candidate(
      "ollama:secondary",
      [
        "coding",
        "creative",
      ],
    ),
  ].slice(
    0,
    count,
  );

  return new ModelRouter(
    () =>
      candidates,
  ).route({
    interpretation:
      input,
    evidence: {
      objectiveCalibration: {
        "ollama:primary": {
          score:
            0.9,
          confidence:
            0.9,
        },
        "ollama:secondary": {
          score:
            0.85,
          confidence:
            0.85,
        },
      },
    },
  });
}

async function main() {
  console.log(
    "Chernobog OH-4N â€” Strategy Router Verification",
  );
  console.log(
    "==============================================",
  );

  const router =
    new StrategyRouter();

  const simple =
    await interpretation(
      "simple",
    );

  const simpleModels =
    await routeModels(
      simple,
    );

  const simpleDecision =
    router.route({
      interpretation:
        simple,
      modelRoute:
        simpleModels,
    });

  assert.equal(
    simpleDecision.version,
    STRATEGY_ROUTER_VERSION,
  );

  assert.equal(
    simpleDecision.status,
    "selected",
  );

  assert.equal(
    simpleDecision.selected
      ?.strategy,
    "single-model",
  );

  pass(
    "simple low-latency work selects the single-model strategy",
  );

  const tools =
    await interpretation(
      "tools",
    );

  const toolModels =
    await routeModels(
      tools,
    );

  const toolDecision =
    router.route({
      interpretation:
        tools,
      modelRoute:
        toolModels,
      constraints: {
        requireToolAssistance:
          true,
      },
    });

  assert.equal(
    toolDecision.selected
      ?.strategy,
    "tool-assisted",
  );

  assert.equal(
    toolDecision.selected
      ?.recipe
      .requiresTools,
    true,
  );

  assert.ok(
    toolDecision.warnings
      .some(
        (warning) =>
          /requires tools/.test(
            warning,
          ),
      ),
  );

  pass(
    "tool-required work selects an explicit tool-assisted reasoning recipe without executing tools",
  );

  const critical =
    await interpretation(
      "critical",
    );

  const criticalModels =
    await routeModels(
      critical,
    );

  const criticalDecision =
    router.route({
      interpretation:
        critical,
      modelRoute:
        criticalModels,
      constraints: {
        allowedStrategies: [
          "single-model",
          "critic-loop",
        ],
      },
    });

  assert.equal(
    criticalDecision.selected
      ?.strategy,
    "critic-loop",
  );

  assert.equal(
    criticalDecision.selected
      ?.recipe
      .multiPass,
    true,
  );

  assert.ok(
    criticalDecision.selected
      ?.recipe
      .steps.some(
        (step) =>
          step.action ===
          "critique",
      ),
  );

  pass(
    "high-factuality/deep reasoning selects a critic loop when that strategy set is available",
  );

  const creative =
    await interpretation(
      "creative",
    );

  const creativeModels =
    await routeModels(
      creative,
    );

  const creativeDecision =
    router.route({
      interpretation:
        creative,
      modelRoute:
        creativeModels,
      constraints: {
        allowedStrategies: [
          "single-model",
          "refinement",
        ],
      },
    });

  assert.equal(
    creativeDecision.selected
      ?.strategy,
    "refinement",
  );

  pass(
    "high-creativity work selects iterative refinement over a single pass",
  );

  const oneModel =
    await routeModels(
      critical,
      1,
    );

  const constrained =
    router.route({
      interpretation:
        critical,
      modelRoute:
        oneModel,
      constraints: {
        allowedStrategies: [
          "competition",
        ],
      },
    });

  assert.equal(
    constrained.status,
    "no-eligible-strategy",
  );

  assert.equal(
    constrained.selected,
    undefined,
  );

  assert.ok(
    constrained.ranking[0]
      ?.exclusionReasons
      .some(
        (reason) =>
          /at least two eligible models/.test(
            reason,
          ),
      ),
  );

  pass(
    "multi-model strategies become ineligible when OH-4M exposes fewer than two eligible models",
  );

  assert.equal(
    simpleDecision
      .selectedModelId,
    simpleModels
      .selected
      ?.candidate.id,
  );

  assert.equal(
    simpleDecision
      .selected
      ?.recipe
      .steps.some(
        (step) =>
          step.action ===
          "escalate" ||
          step.action ===
          "compare",
      ),
    false,
  );

  pass(
    "strategy routing consumes the OH-4M decision without replacing model selection",
  );

  console.log("");
  console.log(
    "OH-4N strategy router verification complete.",
  );
}

void main().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);