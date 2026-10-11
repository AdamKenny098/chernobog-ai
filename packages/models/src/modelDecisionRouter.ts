import {
  getDefaultModelRegistry,
} from "./modelRegistry";
import type {
  InputInterpretation,
} from "./inputInterpreter";

export const MODEL_ROUTER_VERSION =
  "oh4m.v1";

export interface ModelRoutingCandidate {
  id: string;
  provider: string;
  model: string;
  displayName: string;

  enabled: boolean;
  availability:
    | "available"
    | "unavailable"
    | "unknown";

  local: boolean;

  roles: string[];
  capabilities: string[];

  contextLimits: {
    known: boolean;
    contextWindowTokens?: number;
    maxOutputTokens?: number;
  };

  cost: {
    known: boolean;
    mode:
      | "local-compute"
      | "metered"
      | "subscription"
      | "unknown";
    currency?: string;
    inputPerMillionTokens?: number;
    outputPerMillionTokens?: number;
  };

  privacy: {
    execution:
      | "local"
      | "remote"
      | "hybrid"
      | "unknown";
    promptLeavesDevice:
      | boolean
      | null;
    retention:
      | "none"
      | "local-runtime"
      | "provider-policy"
      | "unknown";
  };

  strengths: string[];
  weaknesses: string[];
  tags: string[];
}

export interface ModelCalibrationEvidence {
  score: number;
  confidence: number;
  sampleCount?: number;
}

export interface ModelPreferenceEvidence {
  score: number;
  confidence: number;
  sampleCount?: number;
}

export interface ModelTelemetryEvidence {
  successRate?: number;
  failureRate?: number;
  averageLatencyMs?: number;
  confidence?: number;
  sampleCount?: number;
}

export interface ModelRoutingEvidence {
  objectiveCalibration?: Record<
    string,
    ModelCalibrationEvidence
  >;

  subjectivePreference?: Record<
    string,
    ModelPreferenceEvidence
  >;

  telemetry?: Record<
    string,
    ModelTelemetryEvidence
  >;
}

export interface ModelRoutingConstraints {
  requiredModelIds?: string[];
  excludedModelIds?: string[];

  requireLocal?: boolean;
  allowRemote?: boolean;

  maxInputCostPerMillion?: number;
  maxOutputCostPerMillion?: number;

  maxLatencyMs?: number;

  minimumRouteConfidence?: number;
}

export type ModelRouteComponent =
  | "objective-calibration"
  | "task-fit"
  | "privacy"
  | "latency"
  | "cost"
  | "availability"
  | "subjective-preference"
  | "reliability";

export interface ModelRouteScoreComponent {
  component: ModelRouteComponent;

  score: number;
  weight: number;
  weightedScore: number;

  confidence: number;
  evidence:
    | "measured"
    | "declared"
    | "derived"
    | "unknown";

  reasons: string[];
}

export interface RankedModelCandidate {
  candidate: ModelRoutingCandidate;

  eligible: boolean;
  exclusionReasons: string[];

  score: number;
  confidence: number;

  components:
    ModelRouteScoreComponent[];

  reasons: string[];
}

export interface ModelRouteDecision {
  version: string;
  routedAt: string;

  status:
    | "selected"
    | "no-eligible-candidate";

  selected?: RankedModelCandidate;

  ranking: RankedModelCandidate[];

  taskSummary: {
    primaryDomain: string;
    complexity: string;
    creativity: string;
    factuality: string;
    reasoningDepth: string;
    privacySensitivity: string;
    latencyTolerance: string;
    costTolerance: string;
    requiredTools: string[];
  };

  constraints:
    ModelRoutingConstraints;

  warnings: string[];
}

export type CognitiveModelCandidateSource =
  () =>
    Promise<
      ModelRoutingCandidate[]
    >
    | ModelRoutingCandidate[];

function clamp01(
  value: number,
): number {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      1,
      value,
    ),
  );
}

function asRecord(
  value: unknown,
): Record<string, unknown> {
  return (
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value,
    )
  )
    ? value as
        Record<
          string,
          unknown
        >
    : {};
}

function asString(
  value: unknown,
  fallback = "",
): string {
  return typeof value ===
    "string"
    ? value
    : fallback;
}

function asBoolean(
  value: unknown,
  fallback = false,
): boolean {
  return typeof value ===
    "boolean"
    ? value
    : fallback;
}

function asNumber(
  value: unknown,
): number | undefined {
  return (
    typeof value ===
      "number" &&
    Number.isFinite(
      value,
    )
  )
    ? value
    : undefined;
}

function asStrings(
  value: unknown,
): string[] {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }

  return [
    ...new Set(
      value
        .filter(
          (
            entry,
          ): entry is string =>
            typeof entry ===
            "string",
        )
        .map(
          (entry) =>
            entry
              .trim()
              .toLowerCase(),
        )
        .filter(Boolean),
    ),
  ];
}

function normalizeRegistryCandidate(
  value: unknown,
): ModelRoutingCandidate | null {
  const record =
    asRecord(
      value,
    );

  const provider =
    asString(
      record.provider,
    ).trim();

  const model =
    asString(
      record.model,
    ).trim();

  const id =
    asString(
      record.id,
      provider &&
      model
        ? `${provider}:${model}`
        : "",
    ).trim();

  if (
    !id ||
    !provider ||
    !model
  ) {
    return null;
  }

  const contextLimits =
    asRecord(
      record.contextLimits,
    );

  const cost =
    asRecord(
      record.cost,
    );

  const privacy =
    asRecord(
      record.privacy,
    );

  const availabilityRaw =
    asString(
      record.availability,
      "unknown",
    );

  const availability =
    availabilityRaw ===
      "available" ||
    availabilityRaw ===
      "unavailable"
      ? availabilityRaw
      : "unknown";

  const costModeRaw =
    asString(
      cost.mode,
      "unknown",
    );

  const costMode:
    ModelRoutingCandidate[
      "cost"
    ]["mode"] =
      costModeRaw ===
        "local-compute" ||
      costModeRaw ===
        "metered" ||
      costModeRaw ===
        "subscription"
        ? costModeRaw
        : "unknown";

  const executionRaw =
    asString(
      privacy.execution,
      "unknown",
    );

  const execution:
    ModelRoutingCandidate[
      "privacy"
    ]["execution"] =
      executionRaw ===
        "local" ||
      executionRaw ===
        "remote" ||
      executionRaw ===
        "hybrid"
        ? executionRaw
        : "unknown";

  const retentionRaw =
    asString(
      privacy.retention,
      "unknown",
    );

  const retention:
    ModelRoutingCandidate[
      "privacy"
    ]["retention"] =
      retentionRaw ===
        "none" ||
      retentionRaw ===
        "local-runtime" ||
      retentionRaw ===
        "provider-policy"
        ? retentionRaw
        : "unknown";

  const promptLeavesDevice =
    typeof privacy
      .promptLeavesDevice ===
      "boolean"
      ? privacy
          .promptLeavesDevice
      : null;

  return {
    id,
    provider,
    model,
    displayName:
      asString(
        record.displayName,
        id,
      ),
    enabled:
      asBoolean(
        record.enabled,
        true,
      ),
    availability,
    local:
      asBoolean(
        record.local,
        execution ===
          "local",
      ),
    roles:
      asStrings(
        record.roles,
      ),
    capabilities:
      asStrings(
        record.capabilities,
      ),
    contextLimits: {
      known:
        asBoolean(
          contextLimits.known,
          false,
        ),
      contextWindowTokens:
        asNumber(
          contextLimits
            .contextWindowTokens,
        ),
      maxOutputTokens:
        asNumber(
          contextLimits
            .maxOutputTokens,
        ),
    },
    cost: {
      known:
        asBoolean(
          cost.known,
          false,
        ),
      mode:
        costMode,
      currency:
        asString(
          cost.currency,
        ) ||
        undefined,
      inputPerMillionTokens:
        asNumber(
          cost
            .inputPerMillionTokens,
        ),
      outputPerMillionTokens:
        asNumber(
          cost
            .outputPerMillionTokens,
        ),
    },
    privacy: {
      execution,
      promptLeavesDevice,
      retention,
    },
    strengths:
      asStrings(
        record.strengths,
      ),
    weaknesses:
      asStrings(
        record.weaknesses,
      ),
    tags:
      asStrings(
        record.tags,
      ),
  };
}

function defaultCandidateSource():
  ModelRoutingCandidate[] {
  const registry =
    getDefaultModelRegistry();

  return registry
    .list()
    .map(
      (entry) =>
        normalizeRegistryCandidate(
          entry,
        ),
    )
    .filter(
      (
        entry,
      ): entry is
        ModelRoutingCandidate =>
          entry !== null,
    );
}

function normalizedSet(
  values:
    readonly string[]
    | undefined,
): Set<string> {
  return new Set(
    (values ?? [])
      .map(
        (value) =>
          value
            .trim()
            .toLowerCase(),
      )
      .filter(Boolean),
  );
}

function taskTerms(
  interpretation:
    InputInterpretation,
): Set<string> {
  return normalizedSet([
    interpretation
      .taskIntelligence
      .primaryDomain.value,
    ...interpretation
      .taskIntelligence
      .secondaryDomains,
    ...(
      interpretation
        .taskSignals
        .requiredTools ??
      []
    ),
  ]);
}

function candidateTerms(
  candidate:
    ModelRoutingCandidate,
): Set<string> {
  return normalizedSet([
    ...candidate.roles,
    ...candidate.capabilities,
    ...candidate.strengths,
    ...candidate.tags,
  ]);
}

function taskFitScore(
  candidate:
    ModelRoutingCandidate,
  interpretation:
    InputInterpretation,
): {
  score: number;
  reasons: string[];
} {
  const wanted =
    taskTerms(
      interpretation,
    );

  const offered =
    candidateTerms(
      candidate,
    );

  if (
    wanted.size ===
    0
  ) {
    return {
      score:
        0.5,
      reasons: [
        "No task-fit terms were available; neutral task-fit score used.",
      ],
    };
  }

  let matches =
    0;

  const matched:
    string[] =
      [];

  for (
    const term
    of wanted
  ) {
    if (
      offered.has(
        term,
      )
    ) {
      matches += 1;
      matched.push(
        term,
      );
    }
  }

  const domain =
    interpretation
      .taskIntelligence
      .primaryDomain.value
      .toLowerCase();

  let domainBoost =
    0;

  if (
    offered.has(
      domain,
    )
  ) {
    domainBoost =
      0.25;
  }

  const score =
    clamp01(
      0.35 +
      Math.min(
        0.4,
        matches *
          0.12,
      ) +
      domainBoost,
    );

  return {
    score,
    reasons:
      matched.length >
      0
        ? [
            `Matched task-fit terms: ${matched.join(", ")}.`,
          ]
        : [
            "No declared capability/tag directly matched the task; conservative baseline used.",
          ],
  };
}

function privacyScore(
  candidate:
    ModelRoutingCandidate,
  interpretation:
    InputInterpretation,
): {
  score: number;
  reasons: string[];
} {
  const privacy =
    interpretation
      .taskIntelligence
      .privacySensitivity.value;

  const local =
    candidate.local ||
    candidate.privacy
      .execution ===
      "local";

  const leaves =
    candidate.privacy
      .promptLeavesDevice ===
      true;

  if (
    privacy ===
      "highly-sensitive"
  ) {
    if (
      local &&
      !leaves
    ) {
      return {
        score:
          1,
        reasons: [
          "Highly-sensitive task remains local.",
        ],
      };
    }

    return {
      score:
        0,
      reasons: [
        "Highly-sensitive task is not guaranteed to remain local.",
      ],
    };
  }

  if (
    privacy ===
      "sensitive"
  ) {
    return local &&
      !leaves
      ? {
          score:
            1,
          reasons: [
            "Sensitive task benefits from local execution.",
          ],
        }
      : {
          score:
            0.35,
          reasons: [
            "Sensitive task would use non-local/uncertain privacy handling.",
          ],
        };
  }

  if (
    privacy ===
      "personal" ||
    privacy ===
      "internal"
  ) {
    return local
      ? {
          score:
            0.9,
          reasons: [
            "Local execution reduces exposure for non-public context.",
          ],
        }
      : {
          score:
            0.65,
          reasons: [
            "Remote execution is acceptable but less privacy-preserving than local.",
          ],
        };
  }

  return {
    score:
      local
        ? 0.85
        : 0.75,
    reasons: [
      "Public/low-sensitivity task has no strong privacy restriction.",
    ],
  };
}

function costScore(
  candidate:
    ModelRoutingCandidate,
  interpretation:
    InputInterpretation,
  constraints:
    ModelRoutingConstraints,
): {
  score: number;
  reasons: string[];
} {
  if (
    candidate.cost.mode ===
      "local-compute"
  ) {
    return {
      score:
        1,
      reasons: [
        "Local-compute model has no metered token charge in the registry.",
      ],
    };
  }

  const inputCost =
    candidate.cost
      .inputPerMillionTokens;

  const outputCost =
    candidate.cost
      .outputPerMillionTokens;

  if (
    constraints
      .maxInputCostPerMillion !==
      undefined &&
    inputCost !==
      undefined &&
    inputCost >
      constraints
        .maxInputCostPerMillion
  ) {
    return {
      score:
        0,
      reasons: [
        "Input token cost exceeds explicit routing ceiling.",
      ],
    };
  }

  if (
    constraints
      .maxOutputCostPerMillion !==
      undefined &&
    outputCost !==
      undefined &&
    outputCost >
      constraints
        .maxOutputCostPerMillion
  ) {
    return {
      score:
        0,
      reasons: [
        "Output token cost exceeds explicit routing ceiling.",
      ],
    };
  }

  const tolerance =
    interpretation
      .taskIntelligence
      .costTolerance.value;

  if (
    !candidate.cost.known
  ) {
    return {
      score:
        tolerance ===
          "minimal"
          ? 0.35
          : 0.5,
      reasons: [
        "Cost is unknown; router does not assume it is cheap.",
      ],
    };
  }

  const combined =
    (
      inputCost ??
      0
    ) +
    (
      outputCost ??
      0
    );

  const divisor =
    tolerance ===
      "minimal"
      ? 10
      : tolerance ===
          "low"
        ? 25
        : tolerance ===
            "standard"
          ? 75
          : 150;

  return {
    score:
      clamp01(
        1 -
        combined /
          divisor,
      ),
    reasons: [
      `Known metered cost considered against ${tolerance} task tolerance.`,
    ],
  };
}

function latencyScore(
  candidate:
    ModelRoutingCandidate,
  interpretation:
    InputInterpretation,
  evidence:
    ModelRoutingEvidence,
  constraints:
    ModelRoutingConstraints,
): {
  score: number;
  confidence: number;
  measured: boolean;
  reasons: string[];
} {
  const telemetry =
    evidence.telemetry
      ?.[candidate.id];

  const latency =
    telemetry
      ?.averageLatencyMs;

  if (
    latency ===
    undefined
  ) {
    return {
      score:
        interpretation
          .taskIntelligence
          .latencyTolerance.value ===
          "immediate"
          ? 0.4
          : 0.55,
      confidence:
        0.25,
      measured:
        false,
      reasons: [
        "No measured latency evidence is available.",
      ],
    };
  }

  if (
    constraints
      .maxLatencyMs !==
      undefined &&
    latency >
      constraints
        .maxLatencyMs
  ) {
    return {
      score:
        0,
      confidence:
        clamp01(
          telemetry
            ?.confidence ??
          0.7,
        ),
      measured:
        true,
      reasons: [
        `Measured latency ${latency}ms exceeds explicit ceiling.`,
      ],
    };
  }

  const tolerance =
    interpretation
      .taskIntelligence
      .latencyTolerance.value;

  const target =
    tolerance ===
      "immediate"
      ? 1_500
      : tolerance ===
          "interactive"
        ? 5_000
        : tolerance ===
            "flexible"
          ? 20_000
          : 60_000;

  return {
    score:
      clamp01(
        target /
        Math.max(
          target,
          latency,
        ),
      ),
    confidence:
      clamp01(
        telemetry
          ?.confidence ??
        0.7,
      ),
    measured:
      true,
    reasons: [
      `Measured average latency ${latency}ms evaluated against ${tolerance} target ${target}ms.`,
    ],
  };
}

function reliabilityScore(
  candidate:
    ModelRoutingCandidate,
  evidence:
    ModelRoutingEvidence,
): {
  score: number;
  confidence: number;
  measured: boolean;
  reasons: string[];
} {
  const telemetry =
    evidence.telemetry
      ?.[candidate.id];

  if (
    !telemetry
  ) {
    return {
      score:
        0.5,
      confidence:
        0.2,
      measured:
        false,
      reasons: [
        "No measured reliability evidence is available.",
      ],
    };
  }

  const success =
    telemetry.successRate;

  const failure =
    telemetry.failureRate;

  if (
    success ===
      undefined &&
    failure ===
      undefined
  ) {
    return {
      score:
        0.5,
      confidence:
        clamp01(
          telemetry.confidence ??
          0.3,
        ),
      measured:
        false,
      reasons: [
        "Telemetry exists but contains no success/failure rate.",
      ],
    };
  }

  const score =
    success !==
      undefined
      ? clamp01(
          success,
        )
      : clamp01(
          1 -
          (
            failure ??
            0
          ),
        );

  return {
    score,
    confidence:
      clamp01(
        telemetry.confidence ??
        0.7,
      ),
    measured:
      true,
    reasons: [
      "Reliability score derives from measured invocation telemetry.",
    ],
  };
}

function availabilityScore(
  candidate:
    ModelRoutingCandidate,
): number {
  switch (
    candidate.availability
  ) {
    case "available":
      return 1;
    case "unknown":
      return 0.5;
    case "unavailable":
    default:
      return 0;
  }
}

function dynamicWeights(
  interpretation:
    InputInterpretation,
): Record<
  ModelRouteComponent,
  number
> {
  const weights:
    Record<
      ModelRouteComponent,
      number
    > = {
      "objective-calibration":
        0.24,
      "task-fit":
        0.18,
      privacy:
        0.14,
      latency:
        0.1,
      cost:
        0.09,
      availability:
        0.08,
      "subjective-preference":
        0.07,
      reliability:
        0.1,
    };

  const factuality =
    interpretation
      .taskIntelligence
      .factuality.value;

  const privacy =
    interpretation
      .taskIntelligence
      .privacySensitivity.value;

  const latency =
    interpretation
      .taskIntelligence
      .latencyTolerance.value;

  const cost =
    interpretation
      .taskIntelligence
      .costTolerance.value;

  if (
    factuality ===
      "critical" ||
    factuality ===
      "high"
  ) {
    weights[
      "objective-calibration"
    ] += 0.08;
    weights[
      "subjective-preference"
    ] -= 0.03;
    weights.cost -=
      0.02;
    weights.latency -=
      0.03;
  }

  if (
    privacy ===
      "highly-sensitive" ||
    privacy ===
      "sensitive"
  ) {
    weights.privacy +=
      0.1;
    weights[
      "subjective-preference"
    ] -= 0.02;
    weights.cost -=
      0.03;
    weights.latency -=
      0.05;
  }

  if (
    latency ===
      "immediate"
  ) {
    weights.latency +=
      0.1;
    weights[
      "objective-calibration"
    ] -= 0.04;
    weights[
      "subjective-preference"
    ] -= 0.02;
    weights.cost -=
      0.04;
  }

  if (
    cost ===
      "minimal" ||
    cost ===
      "low"
  ) {
    weights.cost +=
      0.1;
    weights[
      "subjective-preference"
    ] -= 0.02;
    weights[
      "objective-calibration"
    ] -= 0.04;
    weights.latency -=
      0.04;
  }

  const total =
    Object.values(
      weights,
    ).reduce(
      (
        sum,
        value,
      ) =>
        sum +
        Math.max(
          0,
          value,
        ),
      0,
    );

  for (
    const key
    of Object.keys(
      weights,
    ) as
      ModelRouteComponent[]
  ) {
    weights[key] =
      total > 0
        ? Math.max(
            0,
            weights[key],
          ) /
          total
        : 0;
  }

  return weights;
}

function eligibility(
  candidate:
    ModelRoutingCandidate,
  interpretation:
    InputInterpretation,
  constraints:
    ModelRoutingConstraints,
): string[] {
  const reasons:
    string[] =
      [];

  const required =
    normalizedSet(
      constraints
        .requiredModelIds,
    );

  const excluded =
    normalizedSet(
      constraints
        .excludedModelIds,
    );

  if (
    !candidate.enabled
  ) {
    reasons.push(
      "model is disabled",
    );
  }

  if (
    candidate.availability ===
      "unavailable"
  ) {
    reasons.push(
      "model is unavailable",
    );
  }

  if (
    required.size >
      0 &&
    !required.has(
      candidate.id
        .toLowerCase(),
    )
  ) {
    reasons.push(
      "model is not in requiredModelIds",
    );
  }

  if (
    excluded.has(
      candidate.id
        .toLowerCase(),
    )
  ) {
    reasons.push(
      "model is explicitly excluded",
    );
  }

  const isLocal =
    candidate.local ||
    candidate.privacy
      .execution ===
      "local";

  if (
    constraints.requireLocal &&
    !isLocal
  ) {
    reasons.push(
      "explicit constraint requires local execution",
    );
  }

  if (
    constraints.allowRemote ===
      false &&
    !isLocal
  ) {
    reasons.push(
      "remote execution is explicitly disallowed",
    );
  }

  const privacySensitivity =
    interpretation
      .taskIntelligence
      .privacySensitivity
      .value;

  const privacyRequiresLocal =
    privacySensitivity ===
      "highly-sensitive" ||
    interpretation
      .taskIntelligence
      .derived
      .prefersLocalExecution ===
      true;

  if (
    privacyRequiresLocal &&
    (
      !isLocal ||
      candidate.privacy
        .promptLeavesDevice ===
        true
    )
  ) {
    reasons.push(
      privacySensitivity ===
        "highly-sensitive"
        ? "highly-sensitive task requires a model that keeps the prompt local"
        : "task intelligence requires local execution for this privacy-sensitive task",
    );
  }

  if (
    constraints
      .maxInputCostPerMillion !==
      undefined &&
    candidate.cost
      .inputPerMillionTokens !==
      undefined &&
    candidate.cost
      .inputPerMillionTokens >
      constraints
        .maxInputCostPerMillion
  ) {
    reasons.push(
      "input cost exceeds explicit ceiling",
    );
  }

  if (
    constraints
      .maxOutputCostPerMillion !==
      undefined &&
    candidate.cost
      .outputPerMillionTokens !==
      undefined &&
    candidate.cost
      .outputPerMillionTokens >
      constraints
        .maxOutputCostPerMillion
  ) {
    reasons.push(
      "output cost exceeds explicit ceiling",
    );
  }

  return reasons;
}

function component(
  name:
    ModelRouteComponent,
  score:
    number,
  weight:
    number,
  confidence:
    number,
  evidence:
    ModelRouteScoreComponent[
      "evidence"
    ],
  reasons:
    string[],
): ModelRouteScoreComponent {
  const normalizedScore =
    clamp01(
      score,
    );

  const normalizedWeight =
    Math.max(
      0,
      weight,
    );

  return {
    component:
      name,
    score:
      normalizedScore,
    weight:
      normalizedWeight,
    weightedScore:
      normalizedScore *
      normalizedWeight,
    confidence:
      clamp01(
        confidence,
      ),
    evidence,
    reasons,
  };
}

function scoreCandidate(
  candidate:
    ModelRoutingCandidate,
  interpretation:
    InputInterpretation,
  evidence:
    ModelRoutingEvidence,
  constraints:
    ModelRoutingConstraints,
): RankedModelCandidate {
  const exclusions =
    eligibility(
      candidate,
      interpretation,
      constraints,
    );

  const weights =
    dynamicWeights(
      interpretation,
    );

  const calibration =
    evidence
      .objectiveCalibration
      ?.[candidate.id];

  const preference =
    evidence
      .subjectivePreference
      ?.[candidate.id];

  const taskFit =
    taskFitScore(
      candidate,
      interpretation,
    );

  const privacy =
    privacyScore(
      candidate,
      interpretation,
    );

  const latency =
    latencyScore(
      candidate,
      interpretation,
      evidence,
      constraints,
    );

  const cost =
    costScore(
      candidate,
      interpretation,
      constraints,
    );

  const reliability =
    reliabilityScore(
      candidate,
      evidence,
    );

  const components: ModelRouteScoreComponent[] =
    [
      component(
        "objective-calibration",
        calibration
          ?.score ??
        0.5,
        weights[
          "objective-calibration"
        ],
        calibration
          ?.confidence ??
        0.2,
        calibration
          ? "measured"
          : "unknown",
        calibration
          ? [
              `Objective calibration score=${clamp01(calibration.score).toFixed(2)} sampleCount=${calibration.sampleCount ?? "unknown"}.`,
            ]
          : [
              "No objective calibration evidence; neutral score used rather than inventing capability.",
            ],
      ),
      component(
        "task-fit",
        taskFit.score,
        weights[
          "task-fit"
        ],
        0.6,
        "derived",
        taskFit.reasons,
      ),
      component(
        "privacy",
        privacy.score,
        weights.privacy,
        candidate.privacy
          .execution !==
          "unknown"
          ? 0.9
          : 0.4,
        "declared",
        privacy.reasons,
      ),
      component(
        "latency",
        latency.score,
        weights.latency,
        latency.confidence,
        latency.measured
          ? "measured"
          : "unknown",
        latency.reasons,
      ),
      component(
        "cost",
        cost.score,
        weights.cost,
        candidate.cost
          .known ||
        candidate.cost.mode ===
          "local-compute"
          ? 0.9
          : 0.3,
        candidate.cost
          .known ||
        candidate.cost.mode ===
          "local-compute"
          ? "declared"
          : "unknown",
        cost.reasons,
      ),
      component(
        "availability",
        availabilityScore(
          candidate,
        ),
        weights.availability,
        candidate.availability ===
          "unknown"
          ? 0.4
          : 0.95,
        "declared",
        [
          `Registry availability=${candidate.availability}.`,
        ],
      ),
      component(
        "subjective-preference",
        preference
          ?.score ??
        0.5,
        weights[
          "subjective-preference"
        ],
        preference
          ?.confidence ??
        0.2,
        preference
          ? "measured"
          : "unknown",
        preference
          ? [
              `Subjective preference score=${clamp01(preference.score).toFixed(2)} sampleCount=${preference.sampleCount ?? "unknown"}.`,
              "Preference is intentionally separate from objective capability.",
            ]
          : [
              "No subjective preference evidence; neutral score used.",
            ],
      ),
      component(
        "reliability",
        reliability.score,
        weights.reliability,
        reliability.confidence,
        reliability.measured
          ? "measured"
          : "unknown",
        reliability.reasons,
      ),
    ];

  const score =
    exclusions.length >
      0
      ? 0
      : clamp01(
          components.reduce(
            (
              total,
              entry,
            ) =>
              total +
              entry.weightedScore,
            0,
          ),
        );

  const evidenceWeight =
    components.reduce(
      (
        total,
        entry,
      ) =>
        total +
        entry.weight,
      0,
    );

  const confidence =
    exclusions.length >
      0
      ? 1
      : clamp01(
          evidenceWeight >
            0
            ? components.reduce(
                (
                  total,
                  entry,
                ) =>
                  total +
                  entry.confidence *
                    entry.weight,
                0,
              ) /
              evidenceWeight
            : 0,
        );

  const reasons = [
    ...components.flatMap(
      (entry) =>
        entry.reasons.map(
          (reason) =>
            `${entry.component}: ${reason}`,
        ),
    ),
  ];

  return {
    candidate:
      structuredClone(
        candidate,
      ),
    eligible:
      exclusions.length ===
      0,
    exclusionReasons:
      exclusions,
    score,
    confidence,
    components,
    reasons,
  };
}

export class ModelRouter {
  constructor(
    private readonly candidateSource:
      CognitiveModelCandidateSource =
        defaultCandidateSource,
  ) {}

  async route(
    input: {
      interpretation:
        InputInterpretation;
      evidence?:
        ModelRoutingEvidence;
      constraints?:
        ModelRoutingConstraints;
    },
  ): Promise<ModelRouteDecision> {
    const evidence =
      input.evidence ??
      {};

    const constraints =
      structuredClone(
        input.constraints ??
        {},
      );

    const candidates =
      await this.candidateSource();

    const ranking =
      candidates
        .map(
          (candidate) =>
            scoreCandidate(
              candidate,
              input.interpretation,
              evidence,
              constraints,
            ),
        )
        .sort(
          (
            left,
            right,
          ) => {
            if (
              left.eligible !==
              right.eligible
            ) {
              return left.eligible
                ? -1
                : 1;
            }

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

            return left
              .candidate.id
              .localeCompare(
                right
                  .candidate.id,
              );
          },
        );

    const minimum =
      clamp01(
        constraints
          .minimumRouteConfidence ??
        0,
      );

    const selected =
      ranking.find(
        (entry) =>
          entry.eligible &&
          entry.confidence >=
            minimum,
      );

    const warnings:
      string[] =
        [];

    if (
      candidates.length ===
      0
    ) {
      warnings.push(
        "Model registry returned no candidates.",
      );
    }

    if (
      ranking.some(
        (entry) =>
          entry.components.some(
            (componentScore) =>
              componentScore
                .evidence ===
              "unknown",
          ),
      )
    ) {
      warnings.push(
        "One or more routing dimensions lacked measured/declared evidence; neutral conservative scores were used.",
      );
    }

    if (!selected) {
      warnings.push(
        "No eligible model satisfied the routing constraints/confidence threshold.",
      );
    }

    return {
      version:
        MODEL_ROUTER_VERSION,
      routedAt:
        new Date()
          .toISOString(),
      status:
        selected
          ? "selected"
          : "no-eligible-candidate",
      selected:
        selected
          ? structuredClone(
              selected,
            )
          : undefined,
      ranking,
      taskSummary: {
        primaryDomain:
          input
            .interpretation
            .taskIntelligence
            .primaryDomain
            .value,
        complexity:
          input
            .interpretation
            .taskIntelligence
            .complexity.value,
        creativity:
          input
            .interpretation
            .taskIntelligence
            .creativity.value,
        factuality:
          input
            .interpretation
            .taskIntelligence
            .factuality.value,
        reasoningDepth:
          input
            .interpretation
            .taskIntelligence
            .reasoningDepth.value,
        privacySensitivity:
          input
            .interpretation
            .taskIntelligence
            .privacySensitivity
            .value,
        latencyTolerance:
          input
            .interpretation
            .taskIntelligence
            .latencyTolerance
            .value,
        costTolerance:
          input
            .interpretation
            .taskIntelligence
            .costTolerance.value,
        requiredTools: [
          ...(
            input
              .interpretation
              .taskSignals
              .requiredTools ??
            []
          ),
        ],
      },
      constraints,
      warnings,
    };
  }
}

const defaultModelRouter =
  new ModelRouter();

export function getModelRouter():
  ModelRouter {
  return defaultModelRouter;
}