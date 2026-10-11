import assert from "node:assert/strict";

import {
  ESCALATION_ENGINE_VERSION,
  EscalationEngine,
} from "@chernobog/models/escalationEngine";

import type {
  ConfidenceAssessment,
} from "@chernobog/models/confidenceEngine";

import type {
  CriticVerificationResult,
} from "@chernobog/models/criticVerificationLayer";

import type {
  ModelRouteDecision,
} from "@chernobog/models/modelDecisionRouter";

import type {
  MultiModelOrchestrationResult,
} from "@chernobog/models/multiModelOrchestrator";

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

function confidence(
  score: number,
  overrides: {
    evidence?: number;
    history?: number;
    disagreement?: number;
    novelty?: number;
    uncertainty?: number;
    verdict?:
      "pass"
      | "revise"
      | "reject"
      | "blocked";
  } = {},
): ConfidenceAssessment {
  const verdict =
    overrides.verdict ??
    "pass";

  return {
    version:
      "oh4u.test",
    assessedAt:
      new Date()
        .toISOString(),
    score,
    percentage:
      Math.round(
        score *
        100,
      ),
    band:
      score >=
        0.9
        ? "very-high"
        : score >=
            0.75
          ? "high"
          : score >=
              0.55
            ? "moderate"
            : score >=
                0.3
              ? "low"
              : "very-low",
    verificationVerdict:
      verdict,
    trustedByVerification:
      verdict ===
      "pass",
    components: [
      {
        kind:
          "verification",
        weight:
          0.35,
        value:
          verdict ===
            "pass"
            ? 1
            : 0.2,
        weightedValue:
          verdict ===
            "pass"
            ? 0.35
            : 0.07,
        evidenceQuality:
          "strong",
        reasons:
          [],
      },
      {
        kind:
          "evidence-quality",
        weight:
          0.08,
        value:
          overrides.evidence ??
          0.9,
        weightedValue:
          (
            overrides.evidence ??
            0.9
          ) *
          0.08,
        evidenceQuality:
          (
            overrides.evidence ??
            0.9
          ) <
          0.45
            ? "weak"
            : "strong",
        reasons:
          [],
      },
      {
        kind:
          "model-history",
        weight:
          0.08,
        value:
          overrides.history ??
          0.8,
        weightedValue:
          (
            overrides.history ??
            0.8
          ) *
          0.08,
        evidenceQuality:
          "strong",
        reasons:
          [],
      },
      {
        kind:
          "disagreement",
        weight:
          0.04,
        value:
          overrides.disagreement ??
          0.9,
        weightedValue:
          (
            overrides.disagreement ??
            0.9
          ) *
          0.04,
        evidenceQuality:
          "moderate",
        reasons:
          [],
      },
      {
        kind:
          "task-novelty",
        weight:
          0.02,
        value:
          overrides.novelty ??
          0.9,
        weightedValue:
          (
            overrides.novelty ??
            0.9
          ) *
          0.02,
        evidenceQuality:
          "moderate",
        reasons:
          [],
      },
      {
        kind:
          "uncertainty",
        weight:
          0.02,
        value:
          overrides.uncertainty ??
          0.9,
        weightedValue:
          (
            overrides.uncertainty ??
            0.9
          ) *
          0.02,
        evidenceQuality:
          "moderate",
        reasons:
          [],
      },
    ],
    caps:
      [],
    strongestPositiveSignals:
      [],
    strongestNegativeSignals:
      [],
    dataQuality: {
      score:
        0.9,
      missingSignals:
        [],
    },
    warnings:
      [],
    provenance: {
      criticVerificationVersion:
        "oh4t.test",
      orchestratorVersion:
        "oh4s.test",
      modelRouterVersion:
        "oh4m.test",
      reasoningContractVersion:
        "oh4o.test",
    },
    invariants: {
      modelSelfConfidenceAuthoritative:
        false,
      escalationDecided:
        false,
      toolsExecuted:
        false,
      actionsExecuted:
        false,
      authorityBypassed:
        false,
    },
  } as unknown as ConfidenceAssessment;
}

function verification(
  verdict:
    "pass"
    | "revise"
    | "reject"
    | "blocked",
  options: {
    criticRequired?: boolean;
    criticParsed?: boolean;
    findingCodes?: string[];
  } = {},
): CriticVerificationResult {
  return {
    version:
      "oh4t.test",
    verdict,
    trustedConclusion:
      verdict ===
      "pass",
    findings:
      (
        options.findingCodes ??
        []
      ).map(
        (code) => ({
          code,
          severity:
            "warning",
          source:
            "contract",
          message:
            code,
        }),
      ),
    independentCritic: {
      required:
        options.criticRequired ??
        false,
      parsed:
        options.criticParsed ??
        false,
    },
  } as unknown as CriticVerificationResult;
}

function orchestration(
  status:
    "completed"
    | "partial"
    | "blocked"
    | "failed" =
      "completed",
): MultiModelOrchestrationResult {
  return {
    version:
      "oh4s.test",
    status,
  } as unknown as MultiModelOrchestrationResult;
}

function modelRoute(
  includeAlternate =
    true,
): ModelRouteDecision {
  const primary = {
    candidate: {
      id:
        "ollama:primary",
    },
    eligible:
      true,
    score:
      0.9,
    confidence:
      0.9,
  };

  const alternate = {
    candidate: {
      id:
        "ollama:alternate",
    },
    eligible:
      true,
    score:
      0.8,
    confidence:
      0.82,
  };

  return {
    version:
      "oh4m.test",
    status:
      "selected",
    selected:
      primary,
    ranking:
      includeAlternate
        ? [
            primary,
            alternate,
          ]
        : [
            primary,
          ],
  } as unknown as ModelRouteDecision;
}

function contract(
  reasoningDepth =
    "deep",
): ReasoningContract {
  return {
    version:
      "oh4o.test",
    taskProfile: {
      reasoningDepth,
    },
  } as unknown as ReasoningContract;
}

function baseInput(
  score:
    number,
  options: {
    verificationVerdict?:
      "pass"
      | "revise"
      | "reject"
      | "blocked";
    orchestrationStatus?:
      "completed"
      | "partial"
      | "blocked"
      | "failed";
    confidenceOverrides?: {
      evidence?: number;
      history?: number;
      disagreement?: number;
      novelty?: number;
      uncertainty?: number;
    };
  } = {},
) {
  const verdict =
    options.verificationVerdict ??
    "pass";

  return {
    confidence:
      confidence(
        score,
        {
          ...options
            .confidenceOverrides,
          verdict,
        },
      ),
    verification:
      verification(
        verdict,
      ),
    orchestration:
      orchestration(
        options.orchestrationStatus ??
        "completed",
      ),
    modelRoute:
      modelRoute(),
    reasoningContract:
      contract(),
  };
}

function main() {
  console.log(
    "Chernobog OH-4V â€” Escalation Engine Verification",
  );
  console.log(
    "===============================================",
  );

  const engine =
    new EscalationEngine();

  const accepted =
    engine.decide({
      ...baseInput(
        0.88,
      ),
    });

  assert.equal(
    accepted.version,
    ESCALATION_ENGINE_VERSION,
  );

  assert.equal(
    accepted.required,
    false,
  );

  assert.equal(
    accepted.selected.kind,
    "none",
  );

  assert.equal(
    accepted.selected
      .reasonCode,
    "confidence-sufficient",
  );

  pass(
    "trusted high-confidence results do not escalate",
  );

  const clarification =
    engine.decide({
      ...baseInput(
        0.40,
        {
          verificationVerdict:
            "blocked",
        },
      ),
      context: {
        unresolvedQuestions: [
          {
            question:
              "Which repository should be modified?",
            blocking:
              true,
            reason:
              "Target repository is unresolved.",
          },
        ],
        humanClarificationNeeded:
          true,
      },
    });

  assert.equal(
    clarification
      .selected.kind,
    "request-human-clarification",
  );

  assert.deepEqual(
    clarification
      .selected
      .clarificationQuestions,
    [
      "Which repository should be modified?",
    ],
  );

  pass(
    "blocking ambiguity escalates to human clarification before speculative retries",
  );

  const contextEnrichment =
    engine.decide({
      ...baseInput(
        0.52,
        {
          confidenceOverrides: {
            evidence:
              0.25,
          },
        },
      ),
      context: {
        contextCanBeEnriched:
          true,
        contextGapCount:
          2,
      },
    });

  assert.equal(
    contextEnrichment
      .selected.kind,
    "enrich-context",
  );

  pass(
    "missing or weak evidence/context escalates to OH-4K-style context enrichment",
  );

  const criticNeeded =
    engine.decide({
      ...baseInput(
        0.48,
        {
          verificationVerdict:
            "blocked",
        },
      ),
      verification:
        verification(
          "blocked",
          {
            criticRequired:
              true,
            criticParsed:
              false,
            findingCodes: [
              "independent-critic-candidate-missing",
            ],
          },
        ),
      context: {
        criticAvailable:
          true,
        criticCandidateId:
          "ollama:critic",
      },
    });

  assert.equal(
    criticNeeded
      .selected.kind,
    "invoke-critic",
  );

  assert.equal(
    criticNeeded
      .selected
      .criticCandidateId,
    "ollama:critic",
  );

  pass(
    "missing required independent critique escalates to an explicit critic directive when a critic is available",
  );

  const transientRetry =
    engine.decide({
      ...baseInput(
        0.45,
        {
          orchestrationStatus:
            "partial",
        },
      ),
      context: {
        transientFailureCount:
          1,
        attemptCount:
          1,
        maxAttempts:
          3,
      },
    });

  assert.equal(
    transientRetry
      .selected.kind,
    "retry",
  );

  assert.equal(
    transientRetry
      .selected
      .reasonCode,
    "transient-failure",
  );

  assert.equal(
    transientRetry
      .selected
      .attemptNumber,
    2,
  );

  pass(
    "transient failures produce bounded retry directives inside the attempt budget",
  );

  const switchModel =
    engine.decide({
      ...baseInput(
        0.40,
        {
          confidenceOverrides: {
            history:
              0.25,
            disagreement:
              0.3,
          },
        },
      ),
      context: {
        modelFailureCount:
          2,
      },
    });

  assert.equal(
    switchModel
      .selected.kind,
    "switch-model",
  );

  assert.equal(
    switchModel
      .selected
      .targetModelId,
    "ollama:alternate",
  );

  pass(
    "model underperformance selects the next eligible OH-4M candidate without mutating the route",
  );

  const deeperReasoning =
    engine.decide({
      ...baseInput(
        0.56,
        {
          confidenceOverrides: {
            novelty:
              0.2,
            uncertainty:
              0.3,
          },
        },
      ),
      context: {
        currentReasoningEffort:
          "standard",
        maxReasoningEffort:
          "maximum",
        allowModelSwitch:
          false,
      },
    });

  assert.equal(
    deeperReasoning
      .selected.kind,
    "increase-reasoning-effort",
  );

  assert.equal(
    deeperReasoning
      .selected
      .nextReasoningEffort,
    "deep",
  );

  pass(
    "novel or uncertain work can escalate reasoning effort without granting action authority",
  );

  const exhausted =
    engine.decide({
      ...baseInput(
        0.30,
        {
          verificationVerdict:
            "reject",
        },
      ),
      modelRoute:
        modelRoute(
          false,
        ),
      context: {
        attemptCount:
          3,
        maxAttempts:
          3,
        allowContextEnrichment:
          false,
        allowModelSwitch:
          false,
        allowReasoningIncrease:
          false,
        allowCritic:
          false,
        allowHumanClarification:
          false,
      },
    });

  assert.equal(
    exhausted
      .selected.kind,
    "stop-safely",
  );

  assert.equal(
    exhausted
      .selected
      .reasonCode,
    "attempt-budget-exhausted",
  );

  pass(
    "exhausted attempts with no safe recovery path stop instead of looping indefinitely",
  );

  const blockedRetry =
    engine.decide({
      ...baseInput(
        0.25,
      ),
      context: {
        attemptCount:
          2,
        maxAttempts:
          2,
        transientFailureCount:
          1,
        allowContextEnrichment:
          false,
        allowModelSwitch:
          false,
        allowReasoningIncrease:
          false,
        allowCritic:
          false,
        allowHumanClarification:
          false,
      },
    });

  assert.notEqual(
    blockedRetry
      .selected.kind,
    "retry",
  );

  pass(
    "retry cannot bypass the configured attempt budget",
  );

  assert.equal(
    switchModel
      .selected
      .mayExecute,
    false,
  );

  assert.equal(
    switchModel
      .selected
      .authorityGranted,
    false,
  );

  assert.equal(
    switchModel
      .invariants
      .escalationExecuted,
    false,
  );

  assert.equal(
    switchModel
      .invariants
      .toolsExecuted,
    false,
  );

  assert.equal(
    switchModel
      .invariants
      .actionsExecuted,
    false,
  );

  assert.equal(
    switchModel
      .invariants
      .authorityBypassed,
    false,
  );

  assert.equal(
    switchModel
      .invariants
      .modelRouteMutated,
    false,
  );

  pass(
    "OH-4V decides escalation only; execution, authority and state mutation remain downstream",
  );

  console.log("");
  console.log(
    "OH-4V escalation engine verification complete.",
  );
}

main();