export type TaskDomain =
  | "general"
  | "conversation"
  | "planning"
  | "coding"
  | "research"
  | "factual"
  | "creative"
  | "personal-assistance"
  | "system-operations"
  | "data-analysis"
  | "other";

export type TaskComplexity =
  | "trivial"
  | "simple"
  | "moderate"
  | "complex"
  | "very-complex";

export type TaskCreativity =
  | "none"
  | "low"
  | "medium"
  | "high";

export type TaskFactuality =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type TaskReasoningDepth =
  | "shallow"
  | "moderate"
  | "deep"
  | "very-deep";

export type TaskPrivacySensitivity =
  | "public"
  | "internal"
  | "personal"
  | "sensitive"
  | "highly-sensitive";

export type TaskLatencyTolerance =
  | "immediate"
  | "interactive"
  | "flexible"
  | "batch";

export type TaskCostTolerance =
  | "minimal"
  | "low"
  | "standard"
  | "high";

export interface TaskIntelligenceSignalInput {
  domains?: TaskDomain[];

  estimatedSteps?: number;
  dependencyCount?: number;
  ambiguityLevel?: number;
  noveltyLevel?: number;

  creativeGeneration?: number;
  styleSensitivity?: number;

  factualVerification?: number;
  evidenceDependency?: number;
  consequenceSeverity?: number;

  reasoningSteps?: number;
  crossDomainReasoning?: boolean;

  containsPersonalData?: boolean;
  containsSecrets?: boolean;
  containsFinancialData?: boolean;
  containsHealthData?: boolean;
  containsCredentials?: boolean;

  requestedLatencyMs?: number;
  canRunAsynchronously?: boolean;

  minimizeCost?: boolean;
  costCeilingRelative?: number;

  requiredTools?: string[];
}

export interface TaskDimensionAssessment<TValue> {
  value: TValue;
  confidence: number;
  reasons: string[];
}

export interface TaskIntelligenceProfile {
  primaryDomain: TaskDimensionAssessment<TaskDomain>;
  secondaryDomains: TaskDomain[];

  complexity: TaskDimensionAssessment<TaskComplexity>;
  creativity: TaskDimensionAssessment<TaskCreativity>;
  factuality: TaskDimensionAssessment<TaskFactuality>;
  reasoningDepth: TaskDimensionAssessment<TaskReasoningDepth>;
  privacySensitivity: TaskDimensionAssessment<TaskPrivacySensitivity>;
  latencyTolerance: TaskDimensionAssessment<TaskLatencyTolerance>;
  costTolerance: TaskDimensionAssessment<TaskCostTolerance>;

  requiredTools: string[];

  derived: {
    multiDomain: boolean;
    requiresExternalEvidence: boolean;
    highRiskIncorrectness: boolean;
    prefersLocalExecution: boolean;
    toolUseRequired: boolean;
  };

  classifiedAt: string;
}

function clamp01(
  value: number | undefined,
  fallback = 0,
): number {
  if (
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return fallback;
  }

  return Math.max(
    0,
    Math.min(
      1,
      value,
    ),
  );
}

function nonNegativeInteger(
  value: number | undefined,
): number {
  if (
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.trunc(value),
  );
}

function normalizedTools(
  tools: string[] | undefined,
): string[] {
  return [
    ...new Set(
      (tools ?? [])
        .map(
          (tool) =>
            tool.trim(),
        )
        .filter(Boolean),
    ),
  ].sort();
}

function normalizedDomains(
  domains: TaskDomain[] | undefined,
): TaskDomain[] {
  const normalized =
    [
      ...new Set(
        domains ?? [],
      ),
    ];

  return normalized.length > 0
    ? normalized
    : [
        "general",
      ];
}

function assessment<TValue>(
  value: TValue,
  confidence: number,
  reasons: string[],
): TaskDimensionAssessment<TValue> {
  return {
    value,
    confidence:
      clamp01(
        confidence,
        0.5,
      ),
    reasons:
      reasons.length > 0
        ? reasons
        : [
            "No strong signal; default classification applied.",
          ],
  };
}

function classifyComplexity(
  input: TaskIntelligenceSignalInput,
): TaskDimensionAssessment<TaskComplexity> {
  const steps =
    nonNegativeInteger(
      input.estimatedSteps,
    );

  const dependencies =
    nonNegativeInteger(
      input.dependencyCount,
    );

  const ambiguity =
    clamp01(
      input.ambiguityLevel,
    );

  const novelty =
    clamp01(
      input.noveltyLevel,
    );

  const score =
    Math.min(
      1,
      (
        Math.min(
          steps,
          12,
        ) /
        12
      ) *
        0.4 +
      (
        Math.min(
          dependencies,
          8,
        ) /
        8
      ) *
        0.2 +
      ambiguity *
        0.2 +
      novelty *
        0.2,
    );

  const reasons = [
    `estimatedSteps=${steps}`,
    `dependencyCount=${dependencies}`,
    `ambiguity=${ambiguity.toFixed(2)}`,
    `novelty=${novelty.toFixed(2)}`,
  ];

  if (
    score < 0.12
  ) {
    return assessment(
      "trivial",
      0.85,
      reasons,
    );
  }

  if (
    score < 0.3
  ) {
    return assessment(
      "simple",
      0.82,
      reasons,
    );
  }

  if (
    score < 0.55
  ) {
    return assessment(
      "moderate",
      0.8,
      reasons,
    );
  }

  if (
    score < 0.78
  ) {
    return assessment(
      "complex",
      0.84,
      reasons,
    );
  }

  return assessment(
    "very-complex",
    0.88,
    reasons,
  );
}

function classifyCreativity(
  input: TaskIntelligenceSignalInput,
): TaskDimensionAssessment<TaskCreativity> {
  const generation =
    clamp01(
      input.creativeGeneration,
    );

  const style =
    clamp01(
      input.styleSensitivity,
    );

  const score =
    generation *
      0.7 +
    style *
      0.3;

  const reasons = [
    `creativeGeneration=${generation.toFixed(2)}`,
    `styleSensitivity=${style.toFixed(2)}`,
  ];

  if (
    score < 0.12
  ) {
    return assessment(
      "none",
      0.9,
      reasons,
    );
  }

  if (
    score < 0.4
  ) {
    return assessment(
      "low",
      0.82,
      reasons,
    );
  }

  if (
    score < 0.72
  ) {
    return assessment(
      "medium",
      0.82,
      reasons,
    );
  }

  return assessment(
    "high",
    0.9,
    reasons,
  );
}

function classifyFactuality(
  input: TaskIntelligenceSignalInput,
): TaskDimensionAssessment<TaskFactuality> {
  const verification =
    clamp01(
      input.factualVerification,
    );

  const evidence =
    clamp01(
      input.evidenceDependency,
    );

  const severity =
    clamp01(
      input.consequenceSeverity,
    );

  const score =
    verification *
      0.4 +
    evidence *
      0.35 +
    severity *
      0.25;

  const reasons = [
    `factualVerification=${verification.toFixed(2)}`,
    `evidenceDependency=${evidence.toFixed(2)}`,
    `consequenceSeverity=${severity.toFixed(2)}`,
  ];

  if (
    score < 0.2
  ) {
    return assessment(
      "low",
      0.82,
      reasons,
    );
  }

  if (
    score < 0.5
  ) {
    return assessment(
      "medium",
      0.82,
      reasons,
    );
  }

  if (
    score < 0.8
  ) {
    return assessment(
      "high",
      0.86,
      reasons,
    );
  }

  return assessment(
    "critical",
    0.92,
    reasons,
  );
}

function classifyReasoningDepth(
  input: TaskIntelligenceSignalInput,
  domains: readonly TaskDomain[],
): TaskDimensionAssessment<TaskReasoningDepth> {
  const steps =
    nonNegativeInteger(
      input.reasoningSteps,
    );

  const crossDomain =
    input.crossDomainReasoning ===
      true ||
    domains.length > 1;

  const score =
    Math.min(
      1,
      Math.min(
        steps,
        10,
      ) /
        10 *
        0.75 +
      (
        crossDomain
          ? 0.25
          : 0
      ),
    );

  const reasons = [
    `reasoningSteps=${steps}`,
    `crossDomain=${String(
      crossDomain,
    )}`,
  ];

  if (
    score < 0.18
  ) {
    return assessment(
      "shallow",
      0.84,
      reasons,
    );
  }

  if (
    score < 0.48
  ) {
    return assessment(
      "moderate",
      0.82,
      reasons,
    );
  }

  if (
    score < 0.78
  ) {
    return assessment(
      "deep",
      0.86,
      reasons,
    );
  }

  return assessment(
    "very-deep",
    0.9,
    reasons,
  );
}

function classifyPrivacy(
  input: TaskIntelligenceSignalInput,
): TaskDimensionAssessment<TaskPrivacySensitivity> {
  const reasons:
    string[] = [];

  if (
    input.containsCredentials ===
    true
  ) {
    reasons.push(
      "containsCredentials=true",
    );

    return assessment(
      "highly-sensitive",
      0.99,
      reasons,
    );
  }

  if (
    input.containsHealthData ===
      true ||
    input.containsFinancialData ===
      true ||
    input.containsSecrets ===
      true
  ) {
    if (
      input.containsHealthData
    ) {
      reasons.push(
        "containsHealthData=true",
      );
    }

    if (
      input.containsFinancialData
    ) {
      reasons.push(
        "containsFinancialData=true",
      );
    }

    if (
      input.containsSecrets
    ) {
      reasons.push(
        "containsSecrets=true",
      );
    }

    return assessment(
      "sensitive",
      0.96,
      reasons,
    );
  }

  if (
    input.containsPersonalData ===
    true
  ) {
    reasons.push(
      "containsPersonalData=true",
    );

    return assessment(
      "personal",
      0.94,
      reasons,
    );
  }

  if (
    normalizedDomains(
      input.domains,
    ).some(
      (domain) =>
        domain ===
          "system-operations" ||
        domain ===
          "personal-assistance",
    )
  ) {
    reasons.push(
      "task domain commonly operates on non-public user/system context",
    );

    return assessment(
      "internal",
      0.72,
      reasons,
    );
  }

  return assessment(
    "public",
    0.7,
    [
      "No sensitive-data signal supplied.",
    ],
  );
}

function classifyLatency(
  input: TaskIntelligenceSignalInput,
): TaskDimensionAssessment<TaskLatencyTolerance> {
  const requested =
    input.requestedLatencyMs;

  const reasons:
    string[] = [];

  if (
    requested !== undefined &&
    Number.isFinite(
      requested,
    ) &&
    requested >= 0
  ) {
    reasons.push(
      `requestedLatencyMs=${Math.trunc(
        requested,
      )}`,
    );

    if (
      requested <= 1_500
    ) {
      return assessment(
        "immediate",
        0.95,
        reasons,
      );
    }

    if (
      requested <= 10_000
    ) {
      return assessment(
        "interactive",
        0.92,
        reasons,
      );
    }

    if (
      requested <= 120_000
    ) {
      return assessment(
        "flexible",
        0.9,
        reasons,
      );
    }

    return assessment(
      "batch",
      0.9,
      reasons,
    );
  }

  if (
    input.canRunAsynchronously ===
    true
  ) {
    return assessment(
      "batch",
      0.8,
      [
        "canRunAsynchronously=true",
      ],
    );
  }

  return assessment(
    "interactive",
    0.65,
    [
      "No explicit latency deadline; defaulting to interactive.",
    ],
  );
}

function classifyCost(
  input: TaskIntelligenceSignalInput,
): TaskDimensionAssessment<TaskCostTolerance> {
  const ceiling =
    input.costCeilingRelative;

  if (
    input.minimizeCost ===
    true
  ) {
    return assessment(
      "minimal",
      0.95,
      [
        "minimizeCost=true",
      ],
    );
  }

  if (
    ceiling !== undefined &&
    Number.isFinite(
      ceiling,
    )
  ) {
    const normalized =
      clamp01(
        ceiling,
      );

    const reasons = [
      `costCeilingRelative=${normalized.toFixed(2)}`,
    ];

    if (
      normalized < 0.2
    ) {
      return assessment(
        "minimal",
        0.9,
        reasons,
      );
    }

    if (
      normalized < 0.45
    ) {
      return assessment(
        "low",
        0.88,
        reasons,
      );
    }

    if (
      normalized < 0.8
    ) {
      return assessment(
        "standard",
        0.86,
        reasons,
      );
    }

    return assessment(
      "high",
      0.88,
      reasons,
    );
  }

  return assessment(
    "standard",
    0.65,
    [
      "No explicit cost constraint; defaulting to standard.",
    ],
  );
}

export class TaskIntelligenceEngine {
  classify(
    input:
      TaskIntelligenceSignalInput,
  ): TaskIntelligenceProfile {
    const domains =
      normalizedDomains(
        input.domains,
      );

    const privacy =
      classifyPrivacy(
        input,
      );

    const factuality =
      classifyFactuality(
        input,
      );

    const requiredTools =
      normalizedTools(
        input.requiredTools,
      );

    return {
      primaryDomain:
        assessment(
          domains[0],
          input.domains
            ?.length
            ? 0.92
            : 0.55,
          input.domains
            ?.length
            ? [
                "Primary domain supplied by normalized task signals.",
              ]
            : [
                "No domain supplied; defaulting to general.",
              ],
        ),
      secondaryDomains:
        domains.slice(1),
      complexity:
        classifyComplexity(
          input,
        ),
      creativity:
        classifyCreativity(
          input,
        ),
      factuality,
      reasoningDepth:
        classifyReasoningDepth(
          input,
          domains,
        ),
      privacySensitivity:
        privacy,
      latencyTolerance:
        classifyLatency(
          input,
        ),
      costTolerance:
        classifyCost(
          input,
        ),
      requiredTools,
      derived: {
        multiDomain:
          domains.length > 1,
        requiresExternalEvidence:
          clamp01(
            input.evidenceDependency,
          ) >= 0.5 ||
          clamp01(
            input.factualVerification,
          ) >= 0.75,
        highRiskIncorrectness:
          factuality.value ===
            "critical" ||
          clamp01(
            input.consequenceSeverity,
          ) >= 0.8,
        prefersLocalExecution:
          privacy.value ===
            "sensitive" ||
          privacy.value ===
            "highly-sensitive",
        toolUseRequired:
          requiredTools.length >
          0,
      },
      classifiedAt:
        new Date()
          .toISOString(),
    };
  }
}

const defaultTaskIntelligenceEngine =
  new TaskIntelligenceEngine();

export function getTaskIntelligenceEngine():
  TaskIntelligenceEngine {
  return defaultTaskIntelligenceEngine;
}