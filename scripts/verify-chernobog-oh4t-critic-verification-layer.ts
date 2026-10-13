import assert from "node:assert/strict";

import {
  CRITIC_VERIFICATION_LAYER_VERSION,
  CriticVerificationLayer,
} from "@chernobog/models/criticVerificationLayer";

import type {
  ModelRoutingCandidate,
} from "@chernobog/models/modelDecisionRouter";

import type {
  MultiModelOrchestrationResult,
  CognitiveModelExecutionRequest,
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

function candidate(
  id: string,
  local =
    true,
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
    local,
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
        local
          ? "local-compute"
          : "unknown",
    },
    privacy: {
      execution:
        local
          ? "local"
          : "remote",
      promptLeavesDevice:
        local
          ? false
          : true,
      retention:
        local
          ? "local-runtime"
          : "provider-policy",
    },
    strengths:
      [],
    weaknesses:
      [],
    tags:
      [],
  };
}

function orchestration(
  options: {
    status?:
      MultiModelOrchestrationResult[
        "status"
      ];
    sourceCandidateId?:
      string;
    text?:
      string;
  } = {},
): MultiModelOrchestrationResult {
  const sourceCandidateId =
    options
      .sourceCandidateId ??
    "ollama:primary";

  const runId =
    `oh4s:1:primary:${sourceCandidateId}`;

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
      sourceCandidateId,
    finalText:
      options.text ??
      "Verified-looking candidate output.",
    finalSourceRunId:
      runId,
    runs: [
      {
        id:
          runId,
        sequence:
          1,
        candidateId:
          sourceCandidateId,
        pass:
          "primary",
        purpose:
          "test",
        ok:
          true,
        text:
          options.text ??
          "Verified-looking candidate output.",
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

function contract(
  mode:
    ReasoningContract[
      "validation"
    ]["mode"] =
      "none",
  privacySensitivity =
    "internal",
): ReasoningContract {
  return {
    version:
      "oh4o.test",
    generatedAt:
      new Date()
        .toISOString(),
    strategy:
      mode ===
        "critic"
        ? "critic-loop"
        : mode ===
            "comparison"
          ? "competition"
          : "single-model",
    goal:
      "Produce correct result",
    desiredOutcome:
      "A correct verified result",
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
      privacySensitivity,
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
        "context-supported",
      requireProvenance:
        true,
      requireFreshnessAwareness:
        true,
      requireConfidenceAwareness:
        true,
      allowGeneralModelKnowledge:
        true,
      unsupportedClaimsAllowed:
        false,
      rules:
        [],
    },
    execution: {
      strategy:
        mode ===
          "critic"
          ? "critic-loop"
          : mode ===
              "comparison"
            ? "competition"
            : "single-model",
      maxPasses:
        3,
      allowTools:
        false,
      allowMultiModel:
        mode ===
        "comparison",
      allowEscalation:
        false,
      allowCriticPass:
        mode ===
        "critic",
      allowRefinementPass:
        false,
      mayExecuteActions:
        false,
      recipe: {
        strategy:
          mode ===
            "critic"
            ? "critic-loop"
            : mode ===
                "comparison"
              ? "competition"
              : "single-model",
        multiPass:
          mode !==
          "none",
        multiModel:
          mode ===
          "comparison",
        requiresTools:
          false,
        maxPasses:
          3,
        steps:
          [],
      },
    },
    validation: {
      mode,
      required:
        mode !==
        "none",
      minimumChecks:
        mode ===
          "comparison"
          ? 2
          : mode ===
              "none"
            ? 0
            : 1,
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
        mode !==
        "none",
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

const fullEvidence = {
  deterministicTests: [
    {
      id:
        "tests",
      name:
        "Acceptance suite",
      passed:
        true,
      evidenceRef:
        "test:acceptance",
    },
  ],
  constraintChecks: [
    {
      id:
        "constraint-1",
      constraint:
        "Do not execute actions",
      passed:
        true,
    },
  ],
  factualChecks: [
    {
      id:
        "fact-1",
      claim:
        "Candidate matches fixture truth",
      passed:
        true,
      sourceRef:
        "fixture:truth",
    },
  ],
  evidenceReferences: [
    {
      id:
        "evidence-1",
      sourceRef:
        "fixture:truth",
      freshness:
        "fresh" as const,
      confidence:
        1,
    },
  ],
};

async function main() {
  console.log(
    "Chernobog OH-4T â€” Critic & Verification Layer Verification",
  );
  console.log(
    "==========================================================",
  );

  const deterministicLayer =
    new CriticVerificationLayer();

  const deterministicPass =
    await deterministicLayer
      .verify({
        orchestration:
          orchestration(),
        reasoningContract:
          contract(
            "none",
          ),
        evidence:
          fullEvidence,
        requireIndependentCritic:
          false,
      });

  assert.equal(
    deterministicPass.version,
    CRITIC_VERIFICATION_LAYER_VERSION,
  );

  assert.equal(
    deterministicPass.verdict,
    "pass",
  );

  assert.equal(
    deterministicPass.trustedConclusion,
    true,
  );

  pass(
    "deterministic tests, constraints, factual checks, and evidence can independently establish a passing verification result",
  );

  const deterministicFailure =
    await deterministicLayer
      .verify({
        orchestration:
          orchestration(),
        reasoningContract:
          contract(
            "none",
          ),
        evidence: {
          ...fullEvidence,
          deterministicTests: [
            {
              id:
                "tests",
              name:
                "Acceptance suite",
              passed:
                false,
              detail:
                "2 assertions failed",
            },
          ],
        },
        requireIndependentCritic:
          false,
      });

  assert.equal(
    deterministicFailure.verdict,
    "reject",
  );

  assert.equal(
    deterministicFailure.trustedConclusion,
    false,
  );

  assert.ok(
    deterministicFailure.findings
      .some(
        (finding) =>
          finding.code ===
          "deterministic-test:tests",
      ),
  );

  pass(
    "failed deterministic verification rejects the candidate rather than allowing model judgment to overrule objective failure",
  );

  const missingCritic =
    await deterministicLayer
      .verify({
        orchestration:
          orchestration(),
        reasoningContract:
          contract(
            "critic",
          ),
        evidence:
          fullEvidence,
      });

  assert.equal(
    missingCritic.verdict,
    "blocked",
  );

  assert.ok(
    missingCritic.findings
      .some(
        (finding) =>
          finding.code ===
          "independent-critic-executor-missing",
      ),
  );

  pass(
    "judgment-required contracts fail closed when an independent critic cannot actually run",
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

      return {
        ok:
          true,
        text:
          JSON.stringify({
            verdict:
              "revise",
            summary:
              "One material gap remains.",
            findings: [
              {
                code:
                  "missing-edge-case",
                severity:
                  "warning",
                message:
                  "The candidate does not address the supplied edge case.",
              },
            ],
          }),
        provider:
          request.candidate
            .provider,
        model:
          request.candidate
            .model,
      };
    };

  const criticLayer =
    new CriticVerificationLayer(
      executor,
    );

  const revised =
    await criticLayer
      .verify({
        orchestration:
          orchestration(),
        reasoningContract:
          contract(
            "critic",
          ),
        evidence:
          fullEvidence,
        criticCandidate:
          candidate(
            "ollama:critic",
          ),
      });

  assert.equal(
    revised.verdict,
    "revise",
  );

  assert.equal(
    revised.independentCritic
      .attempted,
    true,
  );

  assert.equal(
    revised.independentCritic
      .parsed,
    true,
  );

  assert.equal(
    revised.independentCritic
      .independentFromFinalSource,
    true,
  );

  assert.ok(
    revised.findings
      .some(
        (finding) =>
          finding.code ===
          "critic:missing-edge-case",
      ),
  );

  pass(
    "independent model critique can downgrade an otherwise deterministic pass to revise",
  );

  const sameModel =
    await criticLayer
      .verify({
        orchestration:
          orchestration({
            sourceCandidateId:
              "ollama:primary",
          }),
        reasoningContract:
          contract(
            "critic",
          ),
        evidence:
          fullEvidence,
        criticCandidate:
          candidate(
            "ollama:primary",
          ),
      });

  assert.equal(
    sameModel.verdict,
    "blocked",
  );

  assert.ok(
    sameModel.findings
      .some(
        (finding) =>
          finding.code ===
          "critic-not-independent",
      ),
  );

  pass(
    "the final-source model cannot masquerade as an independent critic",
  );

  const privacyBlocked =
    await criticLayer
      .verify({
        orchestration:
          orchestration(),
        reasoningContract:
          contract(
            "critic",
            "highly-sensitive",
          ),
        evidence:
          fullEvidence,
        criticCandidate:
          candidate(
            "remote:critic",
            false,
          ),
      });

  assert.equal(
    privacyBlocked.verdict,
    "blocked",
  );

  assert.ok(
    privacyBlocked.findings
      .some(
        (finding) =>
          finding.code ===
          "critic-privacy-ineligible",
      ),
  );

  pass(
    "independent verification preserves the privacy boundary for highly-sensitive work",
  );

  const passExecutor =
    async (
      request:
        CognitiveModelExecutionRequest,
    ) => {
      calls.push(
        structuredClone(
          request,
        ),
      );

      return {
        ok:
          true,
        text:
          JSON.stringify({
            verdict:
              "pass",
            summary:
              "Candidate satisfies the supplied verification contract.",
            findings:
              [],
          }),
        provider:
          request.candidate
            .provider,
        model:
          request.candidate
            .model,
      };
    };

  const passingCriticLayer =
    new CriticVerificationLayer(
      passExecutor,
    );

  const criticPass =
    await passingCriticLayer
      .verify({
        orchestration:
          orchestration(),
        reasoningContract:
          contract(
            "critic",
          ),
        evidence:
          fullEvidence,
        criticCandidate:
          candidate(
            "ollama:critic",
          ),
      });

  assert.equal(
    criticPass.verdict,
    "pass",
  );

  assert.equal(
    criticPass.trustedConclusion,
    true,
  );

  pass(
    "candidate becomes trusted only when deterministic checks and required independent critique both pass",
  );

  assert.equal(
    criticPass.invariants
      .toolsExecuted,
    false,
  );

  assert.equal(
    criticPass.invariants
      .actionsExecuted,
    false,
  );

  assert.equal(
    criticPass.invariants
      .authorityBypassed,
    false,
  );

  assert.equal(
    criticPass.invariants
      .resultRewritten,
    false,
  );

  assert.equal(
    criticPass.invariants
      .hiddenScratchReasoningRequested,
    false,
  );

  assert.equal(
    criticPass.invariants
      .hiddenScratchReasoningPersisted,
    false,
  );

  pass(
    "OH-4T verifies without rewriting results, executing tools/actions, bypassing authority, or requesting hidden scratch reasoning",
  );

  console.log("");
  console.log(
    "OH-4T critic & verification layer verification complete.",
  );
}

void main().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);