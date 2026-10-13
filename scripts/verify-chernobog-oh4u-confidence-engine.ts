import assert from "node:assert/strict";

import {
  CONFIDENCE_ENGINE_VERSION,
  ConfidenceEngine,
} from "@chernobog/models/confidenceEngine";

import type {
  CriticVerificationResult,
} from "@chernobog/models/criticVerificationLayer";

import type {
  ModelRouteDecision,
  ModelRoutingCandidate,
  RankedModelCandidate,
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

function candidate():
  RankedModelCandidate {
  const value:
    ModelRoutingCandidate = {
      id:
        "ollama:primary",
      provider:
        "ollama",
      model:
        "primary",
      displayName:
        "Primary",
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
        [],
      weaknesses:
        [],
      tags:
        [],
    };

  return {
    candidate:
      value,
    eligible:
      true,
    exclusionReasons:
      [],
    score:
      0.92,
    confidence:
      0.90,
    components:
      [],
    reasons:
      [],
  };
}

function modelRoute():
  ModelRouteDecision {
  const selected =
    candidate();

  return {
    version:
      "oh4m.test",
    routedAt:
      new Date()
        .toISOString(),
    status:
      "selected",
    selected,
    ranking: [
      selected,
    ],
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

function orchestration(
  options: {
    status?:
      MultiModelOrchestrationResult[
        "status"
      ];
    confidence?:
      number;
  } = {},
): MultiModelOrchestrationResult {
  const runId =
    "oh4s:1:primary:ollama:primary";

  return {
    version:
      "oh4s.test",
    startedAt:
      new Date()
        .toISOString(),
    completedAt:
      new Date()
        .toISOString(),
    status:
      options.status ??
      "completed",
    strategy:
      "single-model",
    selectedModelId:
      "ollama:primary",
    finalText:
      "Candidate output",
    finalSourceRunId:
      runId,
    runs: [
      {
        id:
          runId,
        sequence:
          1,
        candidateId:
          "ollama:primary",
        pass:
          "primary",
        purpose:
          "test",
        ok:
          true,
        text:
          "Candidate output",
        confidence:
          options.confidence ??
          0.99,
        retainedAsAuditArtifact:
          true,
      },
    ],
    blockedRequirements:
      [],
    warnings:
      [],
    provenance: {
      promptCompilerVersion:
        "oh4l.test",
      modelRouterVersion:
        "oh4m.test",
      strategyRouterVersion:
        "oh4n.test",
      reasoningContractVersion:
        "oh4o.test",
    },
    invariants: {
      toolsExecuted:
        false,
      actionsExecuted:
        false,
      authorityBypassed:
        false,
      privateScratchReasoningRequired:
        false,
      privateScratchReasoningPersisted:
        false,
    },
  };
}

function verification(
  verdict:
    CriticVerificationResult[
      "verdict"
    ],
): CriticVerificationResult {
  return {
    version:
      "oh4t.test",
    startedAt:
      new Date()
        .toISOString(),
    completedAt:
      new Date()
        .toISOString(),
    verdict,
    trustedConclusion:
      verdict ===
      "pass",
    orchestrationStatus:
      "completed",
    finalSourceRunId:
      "oh4s:1:primary:ollama:primary",
    findings:
      [],
    deterministic: {
      checksRun:
        1,
      checksPassed:
        verdict ===
          "pass"
          ? 1
          : 0,
      checksFailed:
        verdict ===
          "reject"
          ? 1
          : 0,
      constraintChecksRun:
        1,
      factualChecksRun:
        1,
      evidenceReferenceCount:
        2,
    },
    independentCritic: {
      required:
        true,
      attempted:
        true,
      candidateId:
        "ollama:critic",
      independentFromFinalSource:
        true,
      parsed:
        true,
      verdict:
        verdict ===
          "pass"
          ? "pass"
          : verdict ===
              "revise"
            ? "revise"
            : "reject",
      summary:
        "test critic",
    },
    provenance: {
      reasoningContractVersion:
        "oh4o.test",
      orchestratorVersion:
        "oh4s.test",
      criticLayerVersion:
        "oh4t.test",
    },
    invariants: {
      toolsExecuted:
        false,
      actionsExecuted:
        false,
      authorityBypassed:
        false,
      resultRewritten:
        false,
      hiddenScratchReasoningRequested:
        false,
      hiddenScratchReasoningPersisted:
        false,
    },
    warnings:
      [],
  };
}

function contract():
  ReasoningContract {
  return {
    version:
      "oh4o.test",
    generatedAt:
      new Date()
        .toISOString(),
    strategy:
      "single-model",
    goal:
      "Produce correct result",
    desiredOutcome:
      "Verified result",
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
        "single-model",
      maxPasses:
        1,
      allowTools:
        false,
      allowMultiModel:
        false,
      allowEscalation:
        false,
      allowCriticPass:
        false,
      allowRefinementPass:
        false,
      mayExecuteActions:
        false,
      recipe: {
        strategy:
          "single-model",
        multiPass:
          false,
        multiModel:
          false,
        requiresTools:
          false,
        maxPasses:
          1,
        steps:
          [],
      },
    },
    validation: {
      mode:
        "critic",
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
        "revise",
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
      "validation-failed",
      "validation-passed",
      "authority-required",
    ],
    warnings:
      [],
  };
}

function strongContext() {
  return {
    taskNovelty:
      0.1,
    disagreement:
      0.05,
    evidenceFreshness:
      "fresh" as const,
    evidenceConfidence:
      0.95,
    uncertaintySignals: {
      assumptions:
        0,
      unresolvedQuestions:
        0,
      contradictions:
        0,
      explicitUncertainties:
        0,
    },
    modelHistory: {
      sampleCount:
        50,
      successRate:
        0.94,
      verificationPassRate:
        0.92,
      recentFailureRate:
        0.05,
      calibratedScore:
        0.93,
    },
  };
}

function main() {
  console.log(
    "Chernobog OH-4U â€” Confidence Engine Verification",
  );
  console.log(
    "===============================================",
  );

  const engine =
    new ConfidenceEngine();

  const strong =
    engine.assess({
      verification:
        verification(
          "pass",
        ),
      orchestration:
        orchestration(),
      modelRoute:
        modelRoute(),
      reasoningContract:
        contract(),
      context:
        strongContext(),
    });

  assert.equal(
    strong.version,
    CONFIDENCE_ENGINE_VERSION,
  );

  assert.ok(
    strong.score >=
    0.80,
  );

  assert.ok(
    strong.band ===
      "high" ||
    strong.band ===
      "very-high",
  );

  assert.equal(
    strong.trustedByVerification,
    true,
  );

  pass(
    "strong verification, reliable history, fresh evidence, low novelty and low disagreement produce high confidence",
  );

  const rejected =
    engine.assess({
      verification:
        verification(
          "reject",
        ),
      orchestration:
        orchestration({
          confidence:
            1,
        }),
      modelRoute:
        modelRoute(),
      reasoningContract:
        contract(),
      context:
        strongContext(),
    });

  assert.ok(
    rejected.score <=
    0.15,
  );

  assert.equal(
    rejected.modelReportedConfidence
      ?.value,
    1,
  );

  assert.equal(
    rejected.modelReportedConfidence
      ?.advisoryOnly,
    true,
  );

  assert.equal(
    rejected.invariants
      .modelSelfConfidenceAuthoritative,
    false,
  );

  pass(
    "a model claiming 100% confidence cannot overcome an OH-4T rejection",
  );

  const familiar =
    engine.assess({
      verification:
        verification(
          "pass",
        ),
      orchestration:
        orchestration(),
      modelRoute:
        modelRoute(),
      reasoningContract:
        contract(),
      context: {
        ...strongContext(),
        taskNovelty:
          0.05,
        disagreement:
          0.05,
      },
    });

  const novelDisagreement =
    engine.assess({
      verification:
        verification(
          "pass",
        ),
      orchestration:
        orchestration(),
      modelRoute:
        modelRoute(),
      reasoningContract:
        contract(),
      context: {
        ...strongContext(),
        taskNovelty:
          0.95,
        disagreement:
          0.95,
      },
    });

  assert.ok(
    familiar.score >
    novelDisagreement.score,
  );

  pass(
    "task novelty and model/result disagreement reduce confidence without becoming standalone vetoes",
  );

  const reliableHistory =
    engine.assess({
      verification:
        verification(
          "pass",
        ),
      orchestration:
        orchestration(),
      modelRoute:
        modelRoute(),
      reasoningContract:
        contract(),
      context:
        strongContext(),
    });

  const poorHistory =
    engine.assess({
      verification:
        verification(
          "pass",
        ),
      orchestration:
        orchestration(),
      modelRoute:
        modelRoute(),
      reasoningContract:
        contract(),
      context: {
        ...strongContext(),
        modelHistory: {
          sampleCount:
            50,
          successRate:
            0.35,
          verificationPassRate:
            0.30,
          recentFailureRate:
            0.65,
          calibratedScore:
            0.32,
        },
      },
    });

  assert.ok(
    reliableHistory.score >
    poorHistory.score,
  );

  pass(
    "empirical model history influences confidence independently of the current model's self-assessment",
  );

  const freshEvidence =
    engine.assess({
      verification:
        verification(
          "pass",
        ),
      orchestration:
        orchestration(),
      modelRoute:
        modelRoute(),
      reasoningContract:
        contract(),
      context:
        strongContext(),
    });

  const staleEvidence =
    engine.assess({
      verification:
        verification(
          "pass",
        ),
      orchestration:
        orchestration(),
      modelRoute:
        modelRoute(),
      reasoningContract:
        contract(),
      context: {
        ...strongContext(),
        evidenceFreshness:
          "stale",
        evidenceConfidence:
          0.45,
      },
    });

  assert.ok(
    freshEvidence.score >
    staleEvidence.score,
  );

  pass(
    "stale and low-confidence evidence lower the confidence estimate",
  );

  const blocked =
    engine.assess({
      verification: {
        ...verification(
          "pass",
        ),
        verdict:
          "blocked",
        trustedConclusion:
          false,
      },
      orchestration:
        orchestration({
          status:
            "blocked",
        }),
      modelRoute:
        modelRoute(),
      reasoningContract:
        contract(),
      context:
        strongContext(),
    });

  assert.ok(
    blocked.score <=
    0.05,
  );

  assert.ok(
    blocked.caps.some(
      (cap) =>
        cap.id ===
        "verification-blocked",
    ),
  );

  pass(
    "blocked verification/orchestration applies a hard confidence ceiling regardless of other positive signals",
  );

  const uncertain =
    engine.assess({
      verification:
        verification(
          "pass",
        ),
      orchestration:
        orchestration(),
      modelRoute:
        modelRoute(),
      reasoningContract:
        contract(),
      context: {
        ...strongContext(),
        uncertaintySignals: {
          assumptions:
            3,
          unresolvedQuestions:
            2,
          contradictions:
            1,
          explicitUncertainties:
            4,
        },
      },
    });

  assert.ok(
    uncertain.score <
    strong.score,
  );

  pass(
    "structured assumptions, unresolved questions and contradictions lower confidence transparently",
  );

  assert.equal(
    strong.invariants
      .escalationDecided,
    false,
  );

  assert.equal(
    strong.invariants
      .toolsExecuted,
    false,
  );

  assert.equal(
    strong.invariants
      .actionsExecuted,
    false,
  );

  assert.equal(
    strong.invariants
      .authorityBypassed,
    false,
  );

  pass(
    "OH-4U measures confidence only; escalation, tools, actions and authority remain downstream",
  );

  console.log("");
  console.log(
    "OH-4U confidence engine verification complete.",
  );
}

main();