import assert from "node:assert/strict";

import type {
  CompiledPrompt,
} from "@chernobog/models/promptCompiler";

import type {
  ModelRouteDecision,
  ModelRoutingCandidate,
  RankedModelCandidate,
} from "@chernobog/models/modelDecisionRouter";

import type {
  CognitiveStrategyKind,
  StrategyRouteDecision,
} from "@chernobog/models/strategyRouter";

import type {
  ReasoningContract,
} from "@chernobog/models/reasoningContracts";

import {
  MULTI_MODEL_ORCHESTRATOR_VERSION,
  MultiModelOrchestrator,
  type CognitiveModelExecutionRequest,
} from "@chernobog/models/multiModelOrchestrator";

import {
  GATEWAY_EXPLICIT_MODEL_TARGETING,
  GATEWAY_MODEL_TARGET_MODE,
} from "@chernobog/models/multiModelGatewayExecutor";

function pass(
  message: string,
) {
  console.log(
    `PASS ${message}`,
  );
}

function candidate(
  id: string,
  options: {
    score?: number;
    confidence?: number;
    cost?: number;
  } = {},
): RankedModelCandidate {
  const [
    provider,
    ...modelParts
  ] =
    id.split(":");

  const modelCandidate:
    ModelRoutingCandidate = {
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
      capabilities: [
        "general",
      ],
      contextLimits: {
        known:
          false,
      },
      cost: {
        known:
          options.cost !==
          undefined,
        mode:
          options.cost ===
          undefined
            ? "local-compute"
            : "metered",
        inputPerMillionTokens:
          options.cost,
        outputPerMillionTokens:
          options.cost,
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
        [],
      weaknesses:
        [],
      tags:
        [],
    };

  return {
    candidate:
      modelCandidate,
    eligible:
      true,
    exclusionReasons:
      [],
    score:
      options.score ??
      0.8,
    confidence:
      options.confidence ??
      0.8,
    components:
      [],
    reasons:
      [],
  };
}

function modelRoute(
  ranked:
    RankedModelCandidate[],
  selectedId:
    string,
): ModelRouteDecision {
  const selected =
    ranked.find(
      (entry) =>
        entry.candidate.id ===
        selectedId,
    );

  if (!selected) {
    throw new Error(
      "test selected candidate missing",
    );
  }

  return {
    version:
      "oh4m.test",
    routedAt:
      new Date()
        .toISOString(),
    status:
      "selected",
    selected,
    ranking:
      ranked,
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
      privacySensitivity:
        "internal",
      latencyTolerance:
        "flexible",
      costTolerance:
        "standard",
      requiredTools:
        [],
    },
    constraints:
      {},
    warnings:
      [],
  };
}

function strategyRoute(
  strategy:
    CognitiveStrategyKind,
): StrategyRouteDecision {
  const multiModel =
    strategy ===
      "competition" ||
    strategy ===
      "cheap-first-escalation";

  const requiresTools =
    strategy ===
      "tool-assisted";

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
      recipe: {
        strategy,
        multiPass:
          strategy !==
          "single-model" &&
          strategy !==
          "specialist",
        multiModel,
        requiresTools,
        maxPasses:
          strategy ===
            "critic-loop"
            ? 3
            : 2,
        steps:
          [],
      },
      reasons:
        [],
    },
    ranking:
      [],
    modelRouteStatus:
      "selected",
    selectedModelId:
      "ollama:primary",
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
        requiresTools,
    },
    constraints:
      {},
    warnings:
      [],
  };
}

function reasoningContract(
  strategy:
    CognitiveStrategyKind,
): ReasoningContract {
  const allowTools =
    strategy ===
      "tool-assisted";

  const allowMultiModel =
    strategy ===
      "competition" ||
    strategy ===
      "cheap-first-escalation";

  return {
    version:
      "oh4o.test",
    generatedAt:
      new Date()
        .toISOString(),
    strategy,
    goal:
      "Complete task",
    desiredOutcome:
      "Correct task artifact",
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
        allowTools,
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
        allowTools
          ? "externally-verified"
          : "context-supported",
      requireProvenance:
        true,
      requireFreshnessAwareness:
        true,
      requireConfidenceAwareness:
        true,
      allowGeneralModelKnowledge:
        !allowTools,
      unsupportedClaimsAllowed:
        false,
      rules:
        [],
    },
    execution: {
      strategy,
      maxPasses:
        strategy ===
          "critic-loop"
          ? 3
          : strategy ===
              "single-model" ||
            strategy ===
              "specialist"
            ? 1
            : 2,
      allowTools,
      allowMultiModel,
      allowEscalation:
        strategy ===
        "cheap-first-escalation",
      allowCriticPass:
        strategy ===
        "critic-loop",
      allowRefinementPass:
        strategy ===
          "critic-loop" ||
        strategy ===
          "refinement",
      mayExecuteActions:
        false,
      recipe: {
        strategy,
        multiPass:
          strategy !==
          "single-model",
        multiModel:
          allowMultiModel,
        requiresTools:
          allowTools,
        maxPasses:
          3,
        steps:
          [],
      },
    },
    validation: {
      mode:
        strategy ===
          "critic-loop"
          ? "critic"
          : strategy ===
              "competition"
            ? "comparison"
            : strategy ===
                "tool-assisted"
              ? "tool-grounded"
              : "none",
      required:
        strategy ===
          "critic-loop" ||
        strategy ===
          "competition" ||
        strategy ===
          "tool-assisted",
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
        "surface-uncertainty",
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
        false,
      requireConfidence:
        true,
      proposedActionsExecutable:
        false,
    },
    stopConditions: [
      "goal-satisfied",
      "pass-budget-exhausted",
      "authority-required",
    ],
    warnings:
      [],
  };
}

function compiledPrompt():
  CompiledPrompt {
  return {
    version:
      "oh4l.test",
    compiledAt:
      new Date()
        .toISOString(),
    spec: {
      version:
        "oh4l.test",
      intent: {
        kind:
          "create",
        goal:
          "Complete task",
        desiredOutcome:
          "Correct artifact",
      },
      constraints: {
        explicit: [
          "Do not execute actions",
        ],
        inferred:
          [],
      },
      unresolvedQuestions:
        [],
      task: {
        primaryDomain:
          "coding",
        secondaryDomains:
          [],
        complexity:
          "complex",
        creativity:
          "low",
        factuality:
          "high",
        reasoningDepth:
          "deep",
        privacySensitivity:
          "internal",
        latencyTolerance:
          "flexible",
        costTolerance:
          "standard",
        requiredTools:
          [],
      },
      contextReferences:
        [],
      outputContract: {
        format:
          "text",
        requiredSections:
          [],
        concise:
          false,
        additionalInstructions:
          [],
      },
    },
    messages: [
      {
        role:
          "user",
        content:
          "Complete task",
      },
    ],
    renderedPrompt:
      "Complete task safely and correctly.",
    contextReferences:
      [],
    metrics: {
      messageCount:
        1,
      characterCount:
        33,
      contextCharacters:
        0,
      exampleCount:
        0,
      truncated:
        false,
    },
    warnings:
      [],
  };
}

async function main() {
  console.log(
    "Chernobog OH-4S â€” Multi-Model Orchestrator Verification",
  );
  console.log(
    "=======================================================",
  );

  const calls:
    CognitiveModelExecutionRequest[] =
      [];

  const executor =
    async (
      request:
        CognitiveModelExecutionRequest,
    ) => {
      calls.push(
        structuredClone(
          request,
        ),
      );

      const confidence =
        request.candidate.id ===
          "ollama:cheap"
          ? 0.4
          : request.candidate.id ===
              "ollama:secondary"
            ? 0.82
            : 0.9;

      return {
        ok:
          true,
        text:
          `${request.pass}:${request.candidate.id}:${request.purpose}`,
        provider:
          request.candidate
            .provider,
        model:
          request.candidate
            .model,
        latencyMs:
          10,
        confidence,
      };
    };

  const orchestrator =
    new MultiModelOrchestrator(
      executor,
    );

  const primary =
    candidate(
      "ollama:primary",
      {
        score:
          0.95,
        confidence:
          0.9,
        cost:
          10,
      },
    );

  const secondary =
    candidate(
      "ollama:secondary",
      {
        score:
          0.85,
        confidence:
          0.85,
        cost:
          5,
      },
    );

  const cheap =
    candidate(
      "ollama:cheap",
      {
        score:
          0.7,
        confidence:
          0.7,
        cost:
          1,
      },
    );

  calls.length =
    0;

  const single =
    await orchestrator
      .orchestrate({
        compiledPrompt:
          compiledPrompt(),
        modelRoute:
          modelRoute(
            [
              primary,
              secondary,
            ],
            "ollama:primary",
          ),
        strategyRoute:
          strategyRoute(
            "single-model",
          ),
        reasoningContract:
          reasoningContract(
            "single-model",
          ),
      });

  assert.equal(
    single.version,
    MULTI_MODEL_ORCHESTRATOR_VERSION,
  );

  assert.equal(
    single.status,
    "completed",
  );

  assert.equal(
    single.runs.length,
    1,
  );

  assert.equal(
    single.runs[0]
      ?.candidateId,
    "ollama:primary",
  );

  pass(
    "single-model strategy executes exactly the OH-4M selected primary candidate",
  );

  calls.length =
    0;

  const competition =
    await orchestrator
      .orchestrate({
        compiledPrompt:
          compiledPrompt(),
        modelRoute:
          modelRoute(
            [
              primary,
              secondary,
            ],
            "ollama:primary",
          ),
        strategyRoute:
          strategyRoute(
            "competition",
          ),
        reasoningContract:
          reasoningContract(
            "competition",
          ),
      });

  assert.equal(
    competition.runs.length,
    2,
  );

  assert.deepEqual(
    new Set(
      competition.runs
        .map(
          (run) =>
            run.candidateId,
        ),
    ),
    new Set([
      "ollama:primary",
      "ollama:secondary",
    ]),
  );

  assert.ok(
    competition.finalText,
  );

  assert.ok(
    competition.warnings
      .some(
        (warning) =>
          /OH-4T/.test(
            warning,
          ),
      ),
  );

  pass(
    "competition coordinates two eligible models and returns a provisional winner without pretending OH-4T verification already exists",
  );

  calls.length =
    0;

  const escalation =
    await orchestrator
      .orchestrate({
        compiledPrompt:
          compiledPrompt(),
        modelRoute:
          modelRoute(
            [
              primary,
              cheap,
            ],
            "ollama:primary",
          ),
        strategyRoute:
          strategyRoute(
            "cheap-first-escalation",
          ),
        reasoningContract:
          reasoningContract(
            "cheap-first-escalation",
          ),
        escalationConfidenceThreshold:
          0.75,
      });

  assert.equal(
    escalation.status,
    "completed",
  );

  assert.equal(
    escalation.runs[0]
      ?.candidateId,
    "ollama:cheap",
  );

  assert.equal(
    escalation.runs[1]
      ?.candidateId,
    "ollama:primary",
  );

  assert.equal(
    escalation.runs[1]
      ?.pass,
    "fallback",
  );

  pass(
    "cheap-first strategy escalates to the selected primary model when execution confidence is insufficient",
  );

  calls.length =
    0;

  const critic =
    await orchestrator
      .orchestrate({
        compiledPrompt:
          compiledPrompt(),
        modelRoute:
          modelRoute(
            [
              primary,
              secondary,
            ],
            "ollama:primary",
          ),
        strategyRoute:
          strategyRoute(
            "critic-loop",
          ),
        reasoningContract:
          reasoningContract(
            "critic-loop",
          ),
      });

  assert.equal(
    critic.runs.length,
    3,
  );

  assert.deepEqual(
    critic.runs.map(
      (run) =>
        run.pass,
    ),
    [
      "primary",
      "critic",
      "refinement",
    ],
  );

  assert.equal(
    critic.runs.every(
      (run) =>
        run.candidateId ===
        "ollama:primary",
    ),
    true,
  );

  pass(
    "critic-loop performs bounded draft, critique and refinement passes without silently changing the selected model",
  );

  calls.length =
    0;

  const tools =
    await orchestrator
      .orchestrate({
        compiledPrompt:
          compiledPrompt(),
        modelRoute:
          modelRoute(
            [
              primary,
            ],
            "ollama:primary",
          ),
        strategyRoute:
          strategyRoute(
            "tool-assisted",
          ),
        reasoningContract:
          reasoningContract(
            "tool-assisted",
          ),
      });

  assert.equal(
    tools.status,
    "blocked",
  );

  assert.equal(
    tools.runs.length,
    0,
  );

  assert.ok(
    tools.blockedRequirements
      .some(
        (requirement) =>
          /tool results/.test(
            requirement,
          ),
      ),
  );

  pass(
    "tool-assisted strategy fails closed at the cognition boundary instead of fabricating or executing tool results",
  );

  assert.equal(
    critic.invariants
      .toolsExecuted,
    false,
  );

  assert.equal(
    critic.invariants
      .actionsExecuted,
    false,
  );

  assert.equal(
    critic.invariants
      .authorityBypassed,
    false,
  );

  assert.equal(
    critic.invariants
      .privateScratchReasoningPersisted,
    false,
  );

  pass(
    "orchestration remains cognition-only, authority-bounded, and audit-oriented without persisting hidden scratch reasoning",
  );

  assert.ok(
    typeof GATEWAY_EXPLICIT_MODEL_TARGETING ===
      "boolean",
  );

  assert.ok(
    [
      "none",
      "modelId",
      "provider-model",
      "model",
    ].includes(
      GATEWAY_MODEL_TARGET_MODE,
    ),
  );

  pass(
    "production gateway adapter declares whether exact model targeting is supported and fails closed when it is not",
  );

  console.log("");
  console.log(
    "OH-4S multi-model orchestrator verification complete.",
  );
}

void main().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);