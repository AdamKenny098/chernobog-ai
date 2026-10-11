import type {
  CriticVerificationResult,
  VerificationVerdict,
} from "./criticVerificationLayer";

import type {
  ModelRouteDecision,
} from "./modelDecisionRouter";

import type {
  MultiModelOrchestrationResult,
} from "./multiModelOrchestrator";

import type {
  ReasoningContract,
} from "./reasoningContracts";

export const CONFIDENCE_ENGINE_VERSION =
  "oh4u.v1";

export type ConfidenceBand =
  | "very-low"
  | "low"
  | "moderate"
  | "high"
  | "very-high";

export type ConfidenceEvidenceFreshness =
  | "fresh"
  | "aging"
  | "stale"
  | "unknown";

export interface ConfidenceModelHistory {
  sampleCount: number;

  successRate?: number;
  verificationPassRate?: number;
  recentFailureRate?: number;

  calibratedScore?: number;
}

export interface ConfidenceContextEvidence {
  taskNovelty?: number;
  disagreement?: number;

  evidenceFreshness?:
    ConfidenceEvidenceFreshness;

  evidenceConfidence?: number;

  uncertaintySignals?: {
    assumptions?: number;
    unresolvedQuestions?: number;
    contradictions?: number;
    explicitUncertainties?: number;
  };

  modelHistory?:
    ConfidenceModelHistory;
}

export type ConfidenceComponentKind =
  | "verification"
  | "deterministic-coverage"
  | "independent-critic"
  | "model-routing"
  | "orchestration"
  | "model-history"
  | "evidence-quality"
  | "disagreement"
  | "task-novelty"
  | "uncertainty";

export interface ConfidenceComponent {
  kind:
    ConfidenceComponentKind;

  weight: number;
  value: number;
  weightedValue: number;

  evidenceQuality:
    | "strong"
    | "moderate"
    | "weak"
    | "missing";

  reasons: string[];
}

export interface ConfidenceCap {
  id: string;

  maximum: number;

  reason: string;
}

export interface ConfidenceAssessment {
  version: string;
  assessedAt: string;

  score: number;
  percentage: number;

  band:
    ConfidenceBand;

  verificationVerdict:
    VerificationVerdict;

  trustedByVerification:
    boolean;

  components:
    ConfidenceComponent[];

  caps:
    ConfidenceCap[];

  strongestPositiveSignals:
    string[];

  strongestNegativeSignals:
    string[];

  dataQuality: {
    score: number;
    missingSignals:
      string[];
  };

  modelReportedConfidence?: {
    value: number;
    advisoryOnly: true;
    reason: string;
  };

  warnings: string[];

  provenance: {
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
    modelSelfConfidenceAuthoritative: false;
    escalationDecided: false;
    toolsExecuted: false;
    actionsExecuted: false;
    authorityBypassed: false;
  };
}

const WEIGHTS:
  Record<
    ConfidenceComponentKind,
    number
  > = {
    verification:
      0.35,

    "deterministic-coverage":
      0.15,

    "independent-critic":
      0.10,

    "model-routing":
      0.08,

    orchestration:
      0.08,

    "model-history":
      0.08,

    "evidence-quality":
      0.08,

    disagreement:
      0.04,

    "task-novelty":
      0.02,

    uncertainty:
      0.02,
  };

function clamp01(
  value:
    number,
  field:
    string,
): number {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    throw new Error(
      `${field} must be a finite number.`,
    );
  }

  if (
    value < 0 ||
    value > 1
  ) {
    throw new Error(
      `${field} must be between 0 and 1.`,
    );
  }

  return value;
}

function optionalUnit(
  value:
    number
    | undefined,
  field:
    string,
): number | undefined {
  return value ===
    undefined
    ? undefined
    : clamp01(
        value,
        field,
      );
}

function nonNegativeInteger(
  value:
    number
    | undefined,
  field:
    string,
): number {
  const normalized =
    value ??
    0;

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

function bandForScore(
  score: number,
): ConfidenceBand {
  if (
    score >=
    0.90
  ) {
    return "very-high";
  }

  if (
    score >=
    0.75
  ) {
    return "high";
  }

  if (
    score >=
    0.55
  ) {
    return "moderate";
  }

  if (
    score >=
    0.30
  ) {
    return "low";
  }

  return "very-low";
}

function verificationValue(
  verdict:
    VerificationVerdict,
): number {
  switch (
    verdict
  ) {
    case "pass":
      return 1;

    case "revise":
      return 0.52;

    case "reject":
      return 0.08;

    case "blocked":
      return 0;
  }
}

function deterministicCoverageValue(
  verification:
    CriticVerificationResult,
): {
  value: number;
  quality:
    ConfidenceComponent[
      "evidenceQuality"
    ];
  reasons: string[];
} {
  const summary =
    verification
      .deterministic;

  const explicitChecks =
    summary.checksRun +
    summary.constraintChecksRun +
    summary.factualChecksRun;

  const reasons:
    string[] =
      [];

  if (
    explicitChecks ===
    0
  ) {
    reasons.push(
      "No explicit deterministic, constraint, or factual checks were supplied.",
    );

    return {
      value:
        0.45,
      quality:
        "missing",
      reasons,
    };
  }

  if (
    summary.checksFailed >
    0
  ) {
    reasons.push(
      `${summary.checksFailed} deterministic checks failed.`,
    );

    return {
      value:
        0,
      quality:
        "strong",
      reasons,
    };
  }

  const coverageKinds =
    [
      summary.checksRun >
        0,
      summary.constraintChecksRun >
        0,
      summary.factualChecksRun >
        0,
    ].filter(
      Boolean,
    ).length;

  const value =
    coverageKinds ===
      3
      ? 1
      : coverageKinds ===
          2
        ? 0.85
        : 0.7;

  reasons.push(
    `${coverageKinds} deterministic verification categories supplied with no recorded deterministic failures.`,
  );

  return {
    value,
    quality:
      coverageKinds >=
        2
        ? "strong"
        : "moderate",
    reasons,
  };
}

function criticValue(
  verification:
    CriticVerificationResult,
): {
  value: number;
  quality:
    ConfidenceComponent[
      "evidenceQuality"
    ];
  reasons: string[];
} {
  const critic =
    verification
      .independentCritic;

  if (
    !critic.required
  ) {
    return {
      value:
        0.72,
      quality:
        "moderate",
      reasons: [
        "Independent critic was not required by the active reasoning contract.",
      ],
    };
  }

  if (
    !critic.attempted ||
    !critic.parsed
  ) {
    return {
      value:
        0,
      quality:
        "missing",
      reasons: [
        "Independent critic was required but did not produce a parsed verification result.",
      ],
    };
  }

  switch (
    critic.verdict
  ) {
    case "pass":
      return {
        value:
          critic
            .independentFromFinalSource
            ? 1
            : 0.35,
        quality:
          critic
            .independentFromFinalSource
            ? "strong"
            : "weak",
        reasons: [
          critic
            .independentFromFinalSource
            ? "Independent critic passed the candidate."
            : "Critic passed, but independence from the final-source model was not established.",
        ],
      };

    case "revise":
      return {
        value:
          0.42,
        quality:
          "strong",
        reasons: [
          "Independent critic requested revision.",
        ],
      };

    case "reject":
      return {
        value:
          0,
        quality:
          "strong",
        reasons: [
          "Independent critic rejected the candidate.",
        ],
      };

    default:
      return {
        value:
          0,
        quality:
          "missing",
        reasons: [
          "Independent critic verdict is unavailable.",
        ],
      };
  }
}

function routeValue(
  modelRoute:
    ModelRouteDecision,
): {
  value: number;
  quality:
    ConfidenceComponent[
      "evidenceQuality"
    ];
  reasons: string[];
} {
  if (
    modelRoute.status !==
      "selected" ||
    !modelRoute.selected
  ) {
    return {
      value:
        0,
      quality:
        "missing",
      reasons: [
        "No eligible model was selected by OH-4M.",
      ],
    };
  }

  return {
    value:
      clamp01(
        modelRoute
          .selected
          .confidence,
        "modelRoute.selected.confidence",
      ),
    quality:
      "moderate",
    reasons: [
      `OH-4M route confidence=${modelRoute.selected.confidence.toFixed(2)}.`,
    ],
  };
}

function orchestrationValue(
  orchestration:
    MultiModelOrchestrationResult,
): {
  value: number;
  quality:
    ConfidenceComponent[
      "evidenceQuality"
    ];
  reasons: string[];
} {
  switch (
    orchestration.status
  ) {
    case "completed":
      return {
        value:
          1,
        quality:
          "strong",
        reasons: [
          "OH-4S completed the selected strategy.",
        ],
      };

    case "partial":
      return {
        value:
          0.5,
        quality:
          "strong",
        reasons: [
          "OH-4S returned only a partial strategy result.",
        ],
      };

    case "blocked":
      return {
        value:
          0,
        quality:
          "strong",
        reasons: [
          "OH-4S orchestration was blocked.",
        ],
      };

    case "failed":
      return {
        value:
          0,
        quality:
          "strong",
        reasons: [
          "OH-4S orchestration failed.",
        ],
      };
  }
}

function historyValue(
  history:
    ConfidenceModelHistory
    | undefined,
): {
  value: number;
  quality:
    ConfidenceComponent[
      "evidenceQuality"
    ];
  reasons: string[];
} {
  if (
    !history
  ) {
    return {
      value:
        0.5,
      quality:
        "missing",
      reasons: [
        "No empirical model-history evidence was supplied.",
      ],
    };
  }

  const sampleCount =
    nonNegativeInteger(
      history.sampleCount,
      "modelHistory.sampleCount",
    );

  const success =
    optionalUnit(
      history.successRate,
      "modelHistory.successRate",
    );

  const verificationPass =
    optionalUnit(
      history.verificationPassRate,
      "modelHistory.verificationPassRate",
    );

  const recentFailure =
    optionalUnit(
      history.recentFailureRate,
      "modelHistory.recentFailureRate",
    );

  const calibrated =
    optionalUnit(
      history.calibratedScore,
      "modelHistory.calibratedScore",
    );

  const signals =
    [
      success,
      verificationPass,
      calibrated,
      recentFailure ===
        undefined
        ? undefined
        : 1 -
          recentFailure,
    ].filter(
      (
        value,
      ): value is number =>
        value !==
        undefined,
    );

  if (
    signals.length ===
    0
  ) {
    return {
      value:
        0.5,
      quality:
        sampleCount >
          0
          ? "weak"
          : "missing",
      reasons: [
        "Model-history record contains no usable reliability rates.",
      ],
    };
  }

  const mean =
    signals.reduce(
      (
        total,
        value,
      ) =>
        total +
        value,
      0,
    ) /
    signals.length;

  const sampleFactor =
    Math.min(
      1,
      sampleCount /
        25,
    );

  const value =
    0.5 +
    (
      mean -
      0.5
    ) *
      sampleFactor;

  return {
    value:
      clamp01(
        value,
        "modelHistory.value",
      ),
    quality:
      sampleCount >=
        25
        ? "strong"
        : sampleCount >=
            8
          ? "moderate"
          : "weak",
    reasons: [
      `Model history uses ${sampleCount} samples across ${signals.length} reliability signals.`,
    ],
  };
}

function evidenceValue(
  context:
    ConfidenceContextEvidence,
  verification:
    CriticVerificationResult,
): {
  value: number;
  quality:
    ConfidenceComponent[
      "evidenceQuality"
    ];
  reasons: string[];
} {
  const freshness =
    context
      .evidenceFreshness ??
    "unknown";

  const freshnessScore =
    freshness ===
      "fresh"
      ? 1
      : freshness ===
          "aging"
        ? 0.72
        : freshness ===
            "stale"
          ? 0.2
          : 0.5;

  const confidence =
    optionalUnit(
      context.evidenceConfidence,
      "evidenceConfidence",
    );

  const referenceFactor =
    verification
      .deterministic
      .evidenceReferenceCount >
    0
      ? 1
      : 0.55;

  const value =
    (
      freshnessScore *
        0.45 +
      (
        confidence ??
        0.5
      ) *
        0.35 +
      referenceFactor *
        0.20
    );

  return {
    value:
      clamp01(
        value,
        "evidenceQuality.value",
      ),
    quality:
      freshness ===
        "fresh" &&
      confidence !==
        undefined &&
      verification
        .deterministic
        .evidenceReferenceCount >
        0
        ? "strong"
        : freshness ===
            "stale"
          ? "weak"
          : "moderate",
    reasons: [
      `Evidence freshness=${freshness}.`,
      confidence ===
        undefined
        ? "No aggregate evidence-confidence signal supplied."
        : `Aggregate evidence confidence=${confidence.toFixed(2)}.`,
      `${verification.deterministic.evidenceReferenceCount} evidence references recorded by OH-4T.`,
    ],
  };
}

function inverseSignal(
  value:
    number
    | undefined,
  field:
    string,
  missingReason:
    string,
  suppliedReason:
    (
      normalized: number,
    ) => string,
): {
  value: number;
  quality:
    ConfidenceComponent[
      "evidenceQuality"
    ];
  reasons: string[];
} {
  if (
    value ===
    undefined
  ) {
    return {
      value:
        0.5,
      quality:
        "missing",
      reasons: [
        missingReason,
      ],
    };
  }

  const normalized =
    clamp01(
      value,
      field,
    );

  return {
    value:
      1 -
      normalized,
    quality:
      "moderate",
    reasons: [
      suppliedReason(
        normalized,
      ),
    ],
  };
}

function uncertaintyValue(
  signals:
    ConfidenceContextEvidence[
      "uncertaintySignals"
    ],
): {
  value: number;
  quality:
    ConfidenceComponent[
      "evidenceQuality"
    ];
  reasons: string[];
} {
  if (
    !signals
  ) {
    return {
      value:
        0.5,
      quality:
        "missing",
      reasons: [
        "No structured uncertainty-signal counts were supplied.",
      ],
    };
  }

  const assumptions =
    nonNegativeInteger(
      signals.assumptions,
      "uncertaintySignals.assumptions",
    );

  const unresolved =
    nonNegativeInteger(
      signals.unresolvedQuestions,
      "uncertaintySignals.unresolvedQuestions",
    );

  const contradictions =
    nonNegativeInteger(
      signals.contradictions,
      "uncertaintySignals.contradictions",
    );

  const explicitUncertainties =
    nonNegativeInteger(
      signals.explicitUncertainties,
      "uncertaintySignals.explicitUncertainties",
    );

  const penalty =
    Math.min(
      1,
      assumptions *
        0.05 +
      unresolved *
        0.16 +
      contradictions *
        0.28 +
      explicitUncertainties *
        0.08,
    );

  return {
    value:
      1 -
      penalty,
    quality:
      "moderate",
    reasons: [
      `Uncertainty counts: assumptions=${assumptions}, unresolved=${unresolved}, contradictions=${contradictions}, explicit=${explicitUncertainties}.`,
    ],
  };
}

function component(
  kind:
    ConfidenceComponentKind,
  assessed: {
    value: number;
    quality:
      ConfidenceComponent[
        "evidenceQuality"
      ];
    reasons: string[];
  },
): ConfidenceComponent {
  const weight =
    WEIGHTS[kind];

  return {
    kind,
    weight,
    value:
      assessed.value,
    weightedValue:
      assessed.value *
      weight,
    evidenceQuality:
      assessed.quality,
    reasons:
      assessed.reasons,
  };
}

function confidenceCaps(
  input: {
    verification:
      CriticVerificationResult;
    orchestration:
      MultiModelOrchestrationResult;
    contract:
      ReasoningContract;
  },
): ConfidenceCap[] {
  const caps:
    ConfidenceCap[] =
      [];

  switch (
    input.verification
      .verdict
  ) {
    case "blocked":
      caps.push({
        id:
          "verification-blocked",
        maximum:
          0.05,
        reason:
          "OH-4T verification is blocked.",
      });
      break;

    case "reject":
      caps.push({
        id:
          "verification-rejected",
        maximum:
          0.15,
        reason:
          "OH-4T rejected the candidate.",
      });
      break;

    case "revise":
      caps.push({
        id:
          "verification-revision-required",
        maximum:
          0.64,
        reason:
          "OH-4T requires revision before the conclusion can be trusted.",
      });
      break;

    case "pass":
      break;
  }

  if (
    input.orchestration
      .status ===
      "partial"
  ) {
    caps.push({
      id:
        "partial-orchestration",
      maximum:
        0.68,
      reason:
        "OH-4S produced only a partial orchestration result.",
    });
  }

  if (
    input.orchestration
      .status ===
        "blocked" ||
    input.orchestration
      .status ===
        "failed"
  ) {
    caps.push({
      id:
        "orchestration-unusable",
      maximum:
        0.05,
      reason:
        "OH-4S did not produce a completed or partial usable result.",
    });
  }

  if (
    input.contract
      .validation
      .required &&
    !input.verification
      .trustedConclusion
  ) {
    caps.push({
      id:
        "required-validation-not-trusted",
      maximum:
        0.64,
      reason:
        "The reasoning contract requires validation and OH-4T has not marked the conclusion trusted.",
    });
  }

  return caps;
}

function finalRunModelConfidence(
  orchestration:
    MultiModelOrchestrationResult,
): number | undefined {
  if (
    !orchestration
      .finalSourceRunId
  ) {
    return undefined;
  }

  const value =
    orchestration.runs
      .find(
        (run) =>
          run.id ===
          orchestration
            .finalSourceRunId,
      )
      ?.confidence;

  return value ===
    undefined
    ? undefined
    : clamp01(
        value,
        "modelReportedConfidence",
      );
}

function dataQuality(
  components:
    readonly ConfidenceComponent[],
): {
  score: number;
  missingSignals: string[];
} {
  const qualityScore = {
    strong:
      1,
    moderate:
      0.75,
    weak:
      0.45,
    missing:
      0.2,
  } as const;

  const weighted =
    components.reduce(
      (
        total,
        item,
      ) =>
        total +
        qualityScore[
          item.evidenceQuality
        ] *
          item.weight,
      0,
    );

  const missingSignals =
    components
      .filter(
        (item) =>
          item.evidenceQuality ===
          "missing",
      )
      .map(
        (item) =>
          item.kind,
      );

  return {
    score:
      clamp01(
        weighted,
        "dataQuality.score",
      ),
    missingSignals,
  };
}

export class ConfidenceEngine {
  assess(
    input: {
      verification:
        CriticVerificationResult;

      orchestration:
        MultiModelOrchestrationResult;

      modelRoute:
        ModelRouteDecision;

      reasoningContract:
        ReasoningContract;

      context?:
        ConfidenceContextEvidence;
    },
  ): ConfidenceAssessment {
    const context =
      input.context ??
      {};

    const verificationComponent =
      component(
        "verification",
        {
          value:
            verificationValue(
              input.verification
                .verdict,
            ),
          quality:
            "strong",
          reasons: [
            `OH-4T verdict=${input.verification.verdict}.`,
            input.verification
              .trustedConclusion
              ? "OH-4T marked the conclusion trusted."
              : "OH-4T did not mark the conclusion trusted.",
          ],
        },
      );

    const deterministicComponent =
      component(
        "deterministic-coverage",
        deterministicCoverageValue(
          input.verification,
        ),
      );

    const criticComponent =
      component(
        "independent-critic",
        criticValue(
          input.verification,
        ),
      );

    const routingComponent =
      component(
        "model-routing",
        routeValue(
          input.modelRoute,
        ),
      );

    const orchestrationComponent =
      component(
        "orchestration",
        orchestrationValue(
          input.orchestration,
        ),
      );

    const historyComponent =
      component(
        "model-history",
        historyValue(
          context.modelHistory,
        ),
      );

    const evidenceComponent =
      component(
        "evidence-quality",
        evidenceValue(
          context,
          input.verification,
        ),
      );

    const disagreementComponent =
      component(
        "disagreement",
        inverseSignal(
          context.disagreement,
          "disagreement",
          "No cross-model/result disagreement signal was supplied.",
          (value) =>
            `Observed disagreement=${value.toFixed(2)}; higher disagreement lowers confidence.`,
        ),
      );

    const noveltyComponent =
      component(
        "task-novelty",
        inverseSignal(
          context.taskNovelty,
          "taskNovelty",
          "No task-novelty signal was supplied.",
          (value) =>
            `Task novelty=${value.toFixed(2)}; unfamiliar tasks reduce confidence.`,
        ),
      );

    const uncertaintyComponent =
      component(
        "uncertainty",
        uncertaintyValue(
          context
            .uncertaintySignals,
        ),
      );

    const components = [
      verificationComponent,
      deterministicComponent,
      criticComponent,
      routingComponent,
      orchestrationComponent,
      historyComponent,
      evidenceComponent,
      disagreementComponent,
      noveltyComponent,
      uncertaintyComponent,
    ];

    const rawScore =
      components.reduce(
        (
          total,
          item,
        ) =>
          total +
          item.weightedValue,
        0,
      );

    const caps =
      confidenceCaps({
        verification:
          input.verification,
        orchestration:
          input.orchestration,
        contract:
          input
            .reasoningContract,
      });

    const maximum =
      caps.length >
        0
        ? Math.min(
            ...caps.map(
              (cap) =>
                cap.maximum,
            ),
          )
        : 1;

    const score =
      clamp01(
        Math.min(
          rawScore,
          maximum,
        ),
        "confidence.score",
      );

    const positive =
      components
        .filter(
          (item) =>
            item.value >=
            0.75,
        )
        .sort(
          (
            left,
            right,
          ) =>
            right
              .weightedValue -
            left
              .weightedValue,
        )
        .flatMap(
          (item) =>
            item.reasons
              .map(
                (entry) =>
                  `${item.kind}: ${entry}`,
              ),
        )
        .slice(
          0,
          5,
        );

    const negative =
      [
        ...components
          .filter(
            (item) =>
              item.value <
              0.45,
          )
          .sort(
            (
              left,
              right,
            ) =>
              left.value -
              right.value,
          )
          .flatMap(
            (item) =>
              item.reasons
                .map(
                  (entry) =>
                    `${item.kind}: ${entry}`,
                ),
          ),
        ...caps.map(
          (cap) =>
            `cap:${cap.id}: ${cap.reason}`,
        ),
      ].slice(
        0,
        7,
      );

    const quality =
      dataQuality(
        components,
      );

    const reported =
      finalRunModelConfidence(
        input.orchestration,
      );

    const warnings:
      string[] =
        [];

    if (
      quality.score <
      0.6
    ) {
      warnings.push(
        "Confidence assessment is based on incomplete or weak supporting signals.",
      );
    }

    if (
      caps.length >
      0
    ) {
      warnings.push(
        "One or more hard confidence caps were applied from verification/orchestration state.",
      );
    }

    if (
      reported !==
      undefined
    ) {
      warnings.push(
        "Model-reported confidence is recorded for audit only and contributes no direct weight to OH-4U confidence.",
      );
    }

    return {
      version:
        CONFIDENCE_ENGINE_VERSION,
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
        bandForScore(
          score,
        ),
      verificationVerdict:
        input.verification
          .verdict,
      trustedByVerification:
        input.verification
          .trustedConclusion,
      components:
        structuredClone(
          components,
        ),
      caps:
        structuredClone(
          caps,
        ),
      strongestPositiveSignals:
        positive,
      strongestNegativeSignals:
        negative,
      dataQuality:
        quality,
      modelReportedConfidence:
        reported ===
          undefined
          ? undefined
          : {
              value:
                reported,
              advisoryOnly:
                true,
              reason:
                "Self-reported/model-pass confidence is not authoritative and receives zero direct score weight.",
            },
      warnings,
      provenance: {
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
    };
  }
}

const defaultConfidenceEngine =
  new ConfidenceEngine();

export function getConfidenceEngine():
  ConfidenceEngine {
  return defaultConfidenceEngine;
}