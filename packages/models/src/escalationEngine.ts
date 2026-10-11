import type {
  ConfidenceAssessment,
  ConfidenceBand,
  ConfidenceComponentKind,
} from "./confidenceEngine";

import type {
  CriticVerificationResult,
} from "./criticVerificationLayer";

import type {
  ModelRouteDecision,
  RankedModelCandidate,
} from "./modelDecisionRouter";

import type {
  MultiModelOrchestrationResult,
} from "./multiModelOrchestrator";

import type {
  ReasoningContract,
} from "./reasoningContracts";

export const ESCALATION_ENGINE_VERSION =
  "oh4v.v1";

export type EscalationActionKind =
  | "none"
  | "retry"
  | "enrich-context"
  | "switch-model"
  | "increase-reasoning-effort"
  | "invoke-critic"
  | "request-human-clarification"
  | "stop-safely";

export type EscalationReasonCode =
  | "confidence-sufficient"
  | "blocking-ambiguity"
  | "context-insufficient"
  | "verification-critic-needed"
  | "transient-failure"
  | "model-underperforming"
  | "reasoning-depth-insufficient"
  | "low-confidence-retry"
  | "attempt-budget-exhausted"
  | "no-safe-recovery-path";

export type EscalationReasoningEffort =
  | "standard"
  | "deep"
  | "very-deep"
  | "maximum";

export interface EscalationQuestion {
  question: string;
  blocking: boolean;
  reason?: string;
}

export interface EscalationContext {
  attemptCount?: number;
  maxAttempts?: number;

  unresolvedQuestions?:
    EscalationQuestion[];

  humanClarificationNeeded?:
    boolean;

  contextCanBeEnriched?:
    boolean;

  contextGapCount?:
    number;

  criticAvailable?:
    boolean;

  criticCandidateId?:
    string;

  transientFailureCount?:
    number;

  modelFailureCount?:
    number;

  currentReasoningEffort?:
    EscalationReasoningEffort;

  maxReasoningEffort?:
    EscalationReasoningEffort;

  allowRetry?:
    boolean;

  allowContextEnrichment?:
    boolean;

  allowModelSwitch?:
    boolean;

  allowReasoningIncrease?:
    boolean;

  allowCritic?:
    boolean;

  allowHumanClarification?:
    boolean;
}

export interface EscalationPolicy {
  acceptanceThreshold: number;

  contextEnrichmentThreshold:
    number;

  modelSwitchThreshold:
    number;

  reasoningIncreaseThreshold:
    number;

  retryThreshold:
    number;

  maxAttempts: number;

  maxClarificationQuestions:
    number;
}

export interface EscalationDirective {
  kind:
    EscalationActionKind;

  reasonCode:
    EscalationReasonCode;

  summary: string;

  prerequisites: string[];

  preservesCurrentArtifact:
    boolean;

  targetModelId?: string;

  nextReasoningEffort?:
    EscalationReasoningEffort;

  criticCandidateId?: string;

  clarificationQuestions?:
    string[];

  attemptNumber?: number;

  mayExecute: false;
  authorityGranted: false;
}

export interface EscalationDecision {
  version: string;
  decidedAt: string;

  required: boolean;

  confidence: {
    score: number;
    percentage: number;
    band:
      ConfidenceBand;
    acceptanceThreshold:
      number;
  };

  verificationVerdict:
    CriticVerificationResult[
      "verdict"
    ];

  selected:
    EscalationDirective;

  alternatives:
    EscalationDirective[];

  attemptBudget: {
    current: number;
    maximum: number;
    exhausted: boolean;
  };

  signals: {
    contextGapDetected:
      boolean;

    criticGapDetected:
      boolean;

    transientFailureDetected:
      boolean;

    modelUnderperformanceDetected:
      boolean;

    reasoningDepthGapDetected:
      boolean;

    blockingAmbiguityDetected:
      boolean;
  };

  warnings: string[];

  provenance: {
    confidenceEngineVersion:
      string;
    criticVerificationVersion:
      string;
    orchestratorVersion:
      string;
    modelRouterVersion:
      string;
    reasoningContractVersion:
      string;
  };

  invariants: {
    escalationExecuted: false;
    toolsExecuted: false;
    actionsExecuted: false;
    authorityBypassed: false;
    modelRouteMutated: false;
    verificationMutated: false;
  };
}

export const DEFAULT_ESCALATION_POLICY:
  EscalationPolicy = {
    acceptanceThreshold:
      0.75,

    contextEnrichmentThreshold:
      0.68,

    modelSwitchThreshold:
      0.58,

    reasoningIncreaseThreshold:
      0.64,

    retryThreshold:
      0.52,

    maxAttempts:
      3,

    maxClarificationQuestions:
      5,
  };

const REASONING_ORDER:
  EscalationReasoningEffort[] = [
    "standard",
    "deep",
    "very-deep",
    "maximum",
  ];

function clamp01(
  value: number,
  field: string,
): number {
  if (
    !Number.isFinite(
      value,
    ) ||
    value < 0 ||
    value > 1
  ) {
    throw new Error(
      `${field} must be between 0 and 1.`,
    );
  }

  return value;
}

function nonNegativeInteger(
  value:
    number
    | undefined,
  fallback:
    number,
  field:
    string,
): number {
  const normalized =
    value ??
    fallback;

  if (
    !Number.isInteger(
      normalized,
    ) ||
    normalized < 0
  ) {
    throw new Error(
      `${field} must be a non-negative integer.`,
    );
  }

  return normalized;
}

function positiveInteger(
  value:
    number
    | undefined,
  fallback:
    number,
  field:
    string,
): number {
  const normalized =
    value ??
    fallback;

  if (
    !Number.isInteger(
      normalized,
    ) ||
    normalized < 1
  ) {
    throw new Error(
      `${field} must be a positive integer.`,
    );
  }

  return normalized;
}

function policyWithOverrides(
  policy:
    Partial<
      EscalationPolicy
    >
    | undefined,
): EscalationPolicy {
  const merged = {
    ...DEFAULT_ESCALATION_POLICY,
    ...policy,
  };

  clamp01(
    merged.acceptanceThreshold,
    "acceptanceThreshold",
  );

  clamp01(
    merged.contextEnrichmentThreshold,
    "contextEnrichmentThreshold",
  );

  clamp01(
    merged.modelSwitchThreshold,
    "modelSwitchThreshold",
  );

  clamp01(
    merged.reasoningIncreaseThreshold,
    "reasoningIncreaseThreshold",
  );

  clamp01(
    merged.retryThreshold,
    "retryThreshold",
  );

  positiveInteger(
    merged.maxAttempts,
    DEFAULT_ESCALATION_POLICY
      .maxAttempts,
    "maxAttempts",
  );

  positiveInteger(
    merged.maxClarificationQuestions,
    DEFAULT_ESCALATION_POLICY
      .maxClarificationQuestions,
    "maxClarificationQuestions",
  );

  return merged;
}

function componentValue(
  confidence:
    ConfidenceAssessment,
  kind:
    ConfidenceComponentKind,
): number | undefined {
  return confidence.components
    .find(
      (component) =>
        component.kind ===
        kind,
    )
    ?.value;
}

function componentQuality(
  confidence:
    ConfidenceAssessment,
  kind:
    ConfidenceComponentKind,
):
  | "strong"
  | "moderate"
  | "weak"
  | "missing"
  | undefined {
  return confidence.components
    .find(
      (component) =>
        component.kind ===
        kind,
    )
    ?.evidenceQuality;
}

function eligibleAlternates(
  modelRoute:
    ModelRouteDecision,
): RankedModelCandidate[] {
  const currentId =
    modelRoute.selected
      ?.candidate.id;

  return modelRoute.ranking
    .filter(
      (entry) =>
        entry.eligible &&
        entry.candidate.id !==
          currentId,
    )
    .sort(
      (
        left,
        right,
      ) => {
        if (
          left.score !==
          right.score
        ) {
          return (
            right.score -
            left.score
          );
        }

        if (
          left.confidence !==
          right.confidence
        ) {
          return (
            right.confidence -
            left.confidence
          );
        }

        return left.candidate.id
          .localeCompare(
            right.candidate.id,
          );
      },
    );
}

function nextReasoningEffort(
  current:
    EscalationReasoningEffort,
  maximum:
    EscalationReasoningEffort,
):
  | EscalationReasoningEffort
  | undefined {
  const currentIndex =
    REASONING_ORDER
      .indexOf(
        current,
      );

  const maximumIndex =
    REASONING_ORDER
      .indexOf(
        maximum,
      );

  if (
    currentIndex <
      0 ||
    maximumIndex <
      0
  ) {
    return undefined;
  }

  if (
    currentIndex >=
    maximumIndex
  ) {
    return undefined;
  }

  return REASONING_ORDER[
    currentIndex +
    1
  ];
}

function findingCodes(
  verification:
    CriticVerificationResult,
): Set<string> {
  return new Set(
    verification.findings
      .map(
        (finding) =>
          finding.code,
      ),
  );
}

function directive(
  input: Omit<
    EscalationDirective,
    "mayExecute"
    | "authorityGranted"
  >,
): EscalationDirective {
  return {
    ...input,
    mayExecute:
      false,
    authorityGranted:
      false,
  };
}

function uniqueAlternatives(
  values:
    EscalationDirective[],
  selected:
    EscalationDirective,
): EscalationDirective[] {
  const seen =
    new Set<string>([
      `${selected.kind}:${selected.targetModelId ?? ""}:${selected.nextReasoningEffort ?? ""}`,
    ]);

  const output:
    EscalationDirective[] =
      [];

  for (
    const value
    of values
  ) {
    const key =
      `${value.kind}:${value.targetModelId ?? ""}:${value.nextReasoningEffort ?? ""}`;

    if (
      seen.has(
        key,
      )
    ) {
      continue;
    }

    seen.add(
      key,
    );

    output.push(
      value,
    );
  }

  return output;
}

export class EscalationEngine {
  decide(
    input: {
      confidence:
        ConfidenceAssessment;

      verification:
        CriticVerificationResult;

      orchestration:
        MultiModelOrchestrationResult;

      modelRoute:
        ModelRouteDecision;

      reasoningContract:
        ReasoningContract;

      context?:
        EscalationContext;

      policy?:
        Partial<
          EscalationPolicy
        >;
    },
  ): EscalationDecision {
    const policy =
      policyWithOverrides(
        input.policy,
      );

    const context =
      input.context ??
      {};

    const attemptCount =
      nonNegativeInteger(
        context.attemptCount,
        0,
        "attemptCount",
      );

    const maximumAttempts =
      positiveInteger(
        context.maxAttempts,
        policy.maxAttempts,
        "context.maxAttempts",
      );

    const attemptExhausted =
      attemptCount >=
      maximumAttempts;

    const allowRetry =
      context.allowRetry ??
      true;

    const allowContextEnrichment =
      context
        .allowContextEnrichment ??
      true;

    const allowModelSwitch =
      context.allowModelSwitch ??
      true;

    const allowReasoningIncrease =
      context
        .allowReasoningIncrease ??
      true;

    const allowCritic =
      context.allowCritic ??
      true;

    const allowHumanClarification =
      context
        .allowHumanClarification ??
      true;

    const unresolved =
      (
        context
          .unresolvedQuestions ??
        []
      )
        .filter(
          (question) =>
            question.question
              .trim()
              .length >
            0,
        );

    const blockingQuestions =
      unresolved.filter(
        (question) =>
          question.blocking,
      );

    const contextGapCount =
      nonNegativeInteger(
        context.contextGapCount,
        0,
        "contextGapCount",
      );

    const transientFailureCount =
      nonNegativeInteger(
        context.transientFailureCount,
        0,
        "transientFailureCount",
      );

    const modelFailureCount =
      nonNegativeInteger(
        context.modelFailureCount,
        0,
        "modelFailureCount",
      );

    const findingSet =
      findingCodes(
        input.verification,
      );

    const evidenceValue =
      componentValue(
        input.confidence,
        "evidence-quality",
      );

    const evidenceQuality =
      componentQuality(
        input.confidence,
        "evidence-quality",
      );

    const historyValue =
      componentValue(
        input.confidence,
        "model-history",
      );

    const disagreementValue =
      componentValue(
        input.confidence,
        "disagreement",
      );

    const noveltyValue =
      componentValue(
        input.confidence,
        "task-novelty",
      );

    const uncertaintyValue =
      componentValue(
        input.confidence,
        "uncertainty",
      );

    const criticGapDetected =
      (
        input.verification
          .independentCritic
          .required &&
        !input.verification
          .independentCritic
          .parsed
      ) ||
      findingSet.has(
        "independent-critic-executor-missing",
      ) ||
      findingSet.has(
        "independent-critic-candidate-missing",
      ) ||
      findingSet.has(
        "critic-unavailable",
      );

    const contextGapDetected =
      contextGapCount >
        0 ||
      (
        context.contextCanBeEnriched ===
          true &&
        (
          evidenceQuality ===
            "missing" ||
          evidenceQuality ===
            "weak" ||
          (
            evidenceValue !==
              undefined &&
            evidenceValue <
              policy
                .contextEnrichmentThreshold
          ) ||
          findingSet.has(
            "missing-evidence-references",
          ) ||
          findingSet.has(
            "constraint-coverage-missing",
          ) ||
          findingSet.has(
            "factual-coverage-missing",
          )
        )
      );

    const transientFailureDetected =
      transientFailureCount >
        0 ||
      input.orchestration
        .status ===
        "failed" ||
      input.orchestration
        .status ===
        "partial";

    const disagreementHigh =
      disagreementValue !==
        undefined &&
      disagreementValue <
        0.45;

    const historyWeak =
      historyValue !==
        undefined &&
      historyValue <
        0.45;

    const modelUnderperformanceDetected =
      modelFailureCount >
        0 ||
      disagreementHigh ||
      historyWeak;

    const noveltyHigh =
      noveltyValue !==
        undefined &&
      noveltyValue <
        0.45;

    const uncertaintyHigh =
      uncertaintyValue !==
        undefined &&
      uncertaintyValue <
        0.45;

    const currentReasoningEffort =
      context.currentReasoningEffort ??
      "standard";

    const maximumReasoningEffort =
      context.maxReasoningEffort ??
      "maximum";

    const increasedEffort =
      nextReasoningEffort(
        currentReasoningEffort,
        maximumReasoningEffort,
      );

    const reasoningDepthGapDetected =
      Boolean(
        increasedEffort,
      ) &&
      (
        noveltyHigh ||
        uncertaintyHigh ||
        (
          input.confidence.score <
            policy
              .reasoningIncreaseThreshold &&
          input.reasoningContract
            .taskProfile
            .reasoningDepth ===
            "very-deep"
        )
      );

    const blockingAmbiguityDetected =
      context.humanClarificationNeeded ===
        true ||
      blockingQuestions.length >
        0;

    const confidenceSufficient =
      input.confidence.score >=
        policy.acceptanceThreshold &&
      input.verification
        .verdict ===
        "pass" &&
      input.verification
        .trustedConclusion &&
      input.orchestration
        .status ===
        "completed";

    const candidates:
      EscalationDirective[] =
        [];

    if (
      blockingAmbiguityDetected &&
      allowHumanClarification
    ) {
      const questions =
        (
          blockingQuestions.length >
            0
            ? blockingQuestions
            : unresolved
        )
          .slice(
            0,
            policy
              .maxClarificationQuestions,
          )
          .map(
            (question) =>
              question.question
                .trim(),
          );

      candidates.push(
        directive({
          kind:
            "request-human-clarification",
          reasonCode:
            "blocking-ambiguity",
          summary:
            "Request human clarification because unresolved ambiguity blocks reliable continuation.",
          prerequisites: [
            "Present only the unresolved questions needed to continue.",
            "Preserve the current cognitive artifact while waiting for clarification.",
          ],
          preservesCurrentArtifact:
            true,
          clarificationQuestions:
            questions,
        }),
      );
    }

    if (
      contextGapDetected &&
      allowContextEnrichment
    ) {
      candidates.push(
        directive({
          kind:
            "enrich-context",
          reasonCode:
            "context-insufficient",
          summary:
            "Retrieve or assemble additional relevant context/evidence before reasoning again.",
          prerequisites: [
            "Use OH-4K context retrieval rules.",
            "Preserve source provenance and authority boundaries.",
            "Do not treat retrieved context as permission to act.",
          ],
          preservesCurrentArtifact:
            true,
        }),
      );
    }

    if (
      criticGapDetected &&
      allowCritic &&
      context.criticAvailable ===
        true
    ) {
      candidates.push(
        directive({
          kind:
            "invoke-critic",
          reasonCode:
            "verification-critic-needed",
          summary:
            "Run the missing independent critic verification required by the active reasoning contract.",
          prerequisites: [
            "Critic candidate must be independent from the final-source model.",
            "Critic candidate must satisfy privacy and availability gates.",
          ],
          preservesCurrentArtifact:
            true,
          criticCandidateId:
            context
              .criticCandidateId,
        }),
      );
    }

    if (
      transientFailureDetected &&
      allowRetry &&
      !attemptExhausted
    ) {
      candidates.push(
        directive({
          kind:
            "retry",
          reasonCode:
            "transient-failure",
          summary:
            "Retry the bounded cognitive operation because the current failure pattern may be transient.",
          prerequisites: [
            "Retry remains inside the configured attempt budget.",
            "Reuse authoritative inputs unless fresher context is explicitly gathered.",
          ],
          preservesCurrentArtifact:
            true,
          attemptNumber:
            attemptCount +
            1,
        }),
      );
    }

    const alternate =
      eligibleAlternates(
        input.modelRoute,
      )[0];

    if (
      modelUnderperformanceDetected &&
      allowModelSwitch &&
      alternate &&
      input.confidence.score <
        policy.modelSwitchThreshold
    ) {
      candidates.push(
        directive({
          kind:
            "switch-model",
          reasonCode:
            "model-underperforming",
          summary:
            "Switch to the next eligible OH-4M-ranked model because current-model evidence indicates underperformance or disagreement.",
          prerequisites: [
            "Use only an OH-4M eligible alternate candidate.",
            "Re-run the applicable strategy and verification steps after switching.",
          ],
          preservesCurrentArtifact:
            true,
          targetModelId:
            alternate
              .candidate.id,
        }),
      );
    }

    if (
      reasoningDepthGapDetected &&
      allowReasoningIncrease &&
      increasedEffort &&
      input.confidence.score <
        policy
          .reasoningIncreaseThreshold
    ) {
      candidates.push(
        directive({
          kind:
            "increase-reasoning-effort",
          reasonCode:
            "reasoning-depth-insufficient",
          summary:
            "Increase bounded reasoning effort because novelty, uncertainty, or required reasoning depth exceeds the current setting.",
          prerequisites: [
            "Remain inside the active reasoning contract pass budget.",
            "Do not treat increased reasoning effort as authority to act.",
          ],
          preservesCurrentArtifact:
            true,
          nextReasoningEffort:
            increasedEffort,
        }),
      );
    }

    if (
      allowRetry &&
      !attemptExhausted &&
      input.confidence.score <
        policy.retryThreshold
    ) {
      candidates.push(
        directive({
          kind:
            "retry",
          reasonCode:
            "low-confidence-retry",
          summary:
            "Retry the cognitive pass because confidence remains below the bounded retry threshold and no stronger prerequisite necessarily blocks continuation.",
          prerequisites: [
            "Retry remains inside the configured attempt budget.",
            "Re-run downstream verification after retry.",
          ],
          preservesCurrentArtifact:
            true,
          attemptNumber:
            attemptCount +
            1,
        }),
      );
    }

    let selected:
      EscalationDirective;

    if (
      confidenceSufficient
    ) {
      selected =
        directive({
          kind:
            "none",
          reasonCode:
            "confidence-sufficient",
          summary:
            "No escalation is required; confidence and verification satisfy the acceptance threshold.",
          prerequisites:
            [],
          preservesCurrentArtifact:
            true,
        });
    } else if (
      candidates.length >
        0
    ) {
      selected =
        candidates[0];
    } else if (
      attemptExhausted
    ) {
      selected =
        directive({
          kind:
            "stop-safely",
          reasonCode:
            "attempt-budget-exhausted",
          summary:
            "Stop safely because the configured cognitive attempt budget is exhausted and no higher-priority recovery path is available.",
          prerequisites: [
            "Surface the unresolved limitation and preserve the last verified/auditable artifacts.",
          ],
          preservesCurrentArtifact:
            true,
        });
    } else {
      selected =
        directive({
          kind:
            "stop-safely",
          reasonCode:
            "no-safe-recovery-path",
          summary:
            "Stop safely because confidence is insufficient and no permitted recovery path is currently available.",
          prerequisites: [
            "Surface the unresolved limitation instead of fabricating certainty.",
          ],
          preservesCurrentArtifact:
            true,
        });
    }

    const alternatives =
      uniqueAlternatives(
        candidates.slice(
          selected.kind ===
            "none"
            ? 0
            : 1,
        ),
        selected,
      );

    const warnings:
      string[] =
        [];

    if (
      input.confidence
        .dataQuality
        .missingSignals
        .length >
      0
    ) {
      warnings.push(
        `Confidence assessment is missing signals: ${input.confidence.dataQuality.missingSignals.join(", ")}.`,
      );
    }

    if (
      selected.kind ===
        "stop-safely"
    ) {
      warnings.push(
        "Escalation cannot recover automatically under the current evidence, permissions, or attempt budget.",
      );
    }

    if (
      selected.kind ===
        "switch-model" &&
      selected.targetModelId
    ) {
      warnings.push(
        "OH-4V selects an alternate model directive only; it does not mutate OH-4M routing state or execute the model.",
      );
    }

    return {
      version:
        ESCALATION_ENGINE_VERSION,
      decidedAt:
        new Date()
          .toISOString(),
      required:
        selected.kind !==
        "none",
      confidence: {
        score:
          input.confidence
            .score,
        percentage:
          input.confidence
            .percentage,
        band:
          input.confidence
            .band,
        acceptanceThreshold:
          policy
            .acceptanceThreshold,
      },
      verificationVerdict:
        input.verification
          .verdict,
      selected,
      alternatives,
      attemptBudget: {
        current:
          attemptCount,
        maximum:
          maximumAttempts,
        exhausted:
          attemptExhausted,
      },
      signals: {
        contextGapDetected,
        criticGapDetected,
        transientFailureDetected,
        modelUnderperformanceDetected,
        reasoningDepthGapDetected,
        blockingAmbiguityDetected,
      },
      warnings,
      provenance: {
        confidenceEngineVersion:
          input.confidence
            .version,
        criticVerificationVersion:
          input.verification
            .version,
        orchestratorVersion:
          input.orchestration
            .version,
        modelRouterVersion:
          input.modelRoute
            .version,
        reasoningContractVersion:
          input
            .reasoningContract
            .version,
      },
      invariants: {
        escalationExecuted:
          false,
        toolsExecuted:
          false,
        actionsExecuted:
          false,
        authorityBypassed:
          false,
        modelRouteMutated:
          false,
        verificationMutated:
          false,
      },
    };
  }
}

const defaultEscalationEngine =
  new EscalationEngine();

export function getEscalationEngine():
  EscalationEngine {
  return defaultEscalationEngine;
}