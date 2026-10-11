import {
  recordCognitiveValidationTelemetry,
} from "./telemetry";

export type EvaluationPerspective =
  | "objective"
  | "subjective";

export type EvaluationMethodKind =
  | "automated-test"
  | "validator"
  | "rubric"
  | "factual-check"
  | "human-preference";

export type EvaluationOutcome =
  | "pass"
  | "fail"
  | "needs-review";

export interface EvaluationArtifact {
  taskClass: string;
  input: unknown;
  output: unknown;
  expected?: unknown;

  provider?: string;
  model?: string;
  correlationId?: string;

  metadata?: Record<
    string,
    unknown
  >;
}

export interface EvaluationIssue {
  code: string;
  message: string;
  severity:
    | "info"
    | "warning"
    | "error";
}

export interface EvaluationEvidence {
  label: string;
  detail: string;
  source?:
    | "test"
    | "validator"
    | "rubric"
    | "fact"
    | "human"
    | "other";
}

export interface EvaluationMethodResult {
  methodId: string;
  kind: EvaluationMethodKind;
  perspective: EvaluationPerspective;

  score: number;
  passed: boolean;

  summary: string;
  issues: EvaluationIssue[];
  evidence: EvaluationEvidence[];

  metadata?: Record<
    string,
    unknown
  >;
}

export interface EvaluationMethodContext {
  artifact: EvaluationArtifact;
  method: EvaluationMethodDefinition;
}

export type EvaluationMethodExecutor =
  (
    context: EvaluationMethodContext,
  ) =>
    Promise<EvaluationMethodResult>
    | EvaluationMethodResult;

export interface EvaluationMethodDefinition {
  id: string;
  label: string;
  kind: EvaluationMethodKind;
  perspective: EvaluationPerspective;

  weight: number;
  required: boolean;

  executor:
    EvaluationMethodExecutor;
}

export interface TaskEvaluationProfile {
  taskClass: string;
  methodIds: string[];

  objectivePassThreshold: number;
  objectiveMinimumCoverage: number;

  requireSubjectiveSignal?: boolean;
}

export interface EvaluationScoreSummary {
  available: boolean;
  score: number | null;
  totalWeight: number;
  passedWeight: number;
  methodCount: number;
}

export interface EvaluationReport {
  taskClass: string;
  evaluatedAt: string;
  outcome: EvaluationOutcome;

  objective: EvaluationScoreSummary;
  subjective: EvaluationScoreSummary;

  results: EvaluationMethodResult[];

  requiredFailures: string[];
  missingMethods: string[];
}

export type EvaluationTelemetryRecorder =
  (
    input: {
      taskClass: string;
      provider?: string;
      model?: string;
      correlationId?: string;
      methodId: string;
      result: EvaluationMethodResult;
    },
  ) => Promise<void>;

export interface EvaluationFrameworkOptions {
  telemetryRecorder?:
    EvaluationTelemetryRecorder;
}

function normalizeId(
  value: string,
  field: string,
): string {
  const normalized =
    value.trim();

  if (!normalized) {
    throw new Error(
      `${field} must not be empty.`,
    );
  }

  return normalized;
}

function normalizeScore(
  value: number,
): number {
  if (
    !Number.isFinite(value)
  ) {
    throw new Error(
      "Evaluation score must be finite.",
    );
  }

  if (
    value < 0 ||
    value > 1
  ) {
    throw new Error(
      "Evaluation score must be between 0 and 1.",
    );
  }

  return value;
}

function normalizeWeight(
  value: number,
): number {
  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    throw new Error(
      "Evaluation method weight must be greater than zero.",
    );
  }

  return value;
}

function validateMethodKindPerspective(
  definition:
    EvaluationMethodDefinition,
): void {
  if (
    definition.kind ===
      "human-preference" &&
    definition.perspective !==
      "subjective"
  ) {
    throw new Error(
      "human-preference evaluation methods must be subjective.",
    );
  }

  if (
    (
      definition.kind ===
        "automated-test" ||
      definition.kind ===
        "validator" ||
      definition.kind ===
        "factual-check"
    ) &&
    definition.perspective !==
      "objective"
  ) {
    throw new Error(
      `${definition.kind} evaluation methods must be objective.`,
    );
  }
}

function normalizedMethod(
  definition:
    EvaluationMethodDefinition,
): EvaluationMethodDefinition {
  const normalized = {
    ...definition,
    id:
      normalizeId(
        definition.id,
        "evaluation method id",
      ),
    label:
      normalizeId(
        definition.label,
        "evaluation method label",
      ),
    weight:
      normalizeWeight(
        definition.weight,
      ),
  };

  validateMethodKindPerspective(
    normalized,
  );

  return normalized;
}

function normalizedProfile(
  profile:
    TaskEvaluationProfile,
): TaskEvaluationProfile {
  const taskClass =
    normalizeId(
      profile.taskClass,
      "taskClass",
    );

  const methodIds =
    [
      ...new Set(
        profile.methodIds
          .map(
            (id) =>
              id.trim(),
          )
          .filter(Boolean),
      ),
    ];

  if (
    methodIds.length === 0
  ) {
    throw new Error(
      "Evaluation profile must include at least one method.",
    );
  }

  const threshold =
    normalizeScore(
      profile.objectivePassThreshold,
    );

  const coverage =
    normalizeScore(
      profile.objectiveMinimumCoverage,
    );

  return {
    ...profile,
    taskClass,
    methodIds,
    objectivePassThreshold:
      threshold,
    objectiveMinimumCoverage:
      coverage,
  };
}

function summarizePerspective(
  results:
    readonly EvaluationMethodResult[],
  methods:
    ReadonlyMap<
      string,
      EvaluationMethodDefinition
    >,
  perspective:
    EvaluationPerspective,
): EvaluationScoreSummary {
  const relevant =
    results.filter(
      (result) =>
        result.perspective ===
        perspective,
    );

  if (
    relevant.length === 0
  ) {
    return {
      available:
        false,
      score:
        null,
      totalWeight:
        0,
      passedWeight:
        0,
      methodCount:
        0,
    };
  }

  let totalWeight =
    0;

  let weightedScore =
    0;

  let passedWeight =
    0;

  for (
    const result
    of relevant
  ) {
    const definition =
      methods.get(
        result.methodId,
      );

    const weight =
      definition?.weight ??
      1;

    totalWeight +=
      weight;

    weightedScore +=
      result.score *
      weight;

    if (
      result.passed
    ) {
      passedWeight +=
        weight;
    }
  }

  return {
    available:
      true,
    score:
      totalWeight > 0
        ? weightedScore /
          totalWeight
        : null,
    totalWeight,
    passedWeight,
    methodCount:
      relevant.length,
  };
}

async function defaultTelemetryRecorder(
  input: {
    taskClass: string;
    provider?: string;
    model?: string;
    correlationId?: string;
    methodId: string;
    result: EvaluationMethodResult;
  },
): Promise<void> {
  await recordCognitiveValidationTelemetry(
    {
      taskType:
        input.taskClass,
      provider:
        input.provider,
      model:
        input.model,
      validator:
        input.methodId,
      valid:
        input.result.passed,
      score:
        input.result.score,
      reason:
        input.result.summary,
    },
    input.correlationId,
  );
}

export class EvaluationFramework {
  private readonly methods =
    new Map<
      string,
      EvaluationMethodDefinition
    >();

  private readonly profiles =
    new Map<
      string,
      TaskEvaluationProfile
    >();

  private readonly telemetryRecorder:
    EvaluationTelemetryRecorder;

  constructor(
    options:
      EvaluationFrameworkOptions = {},
  ) {
    this.telemetryRecorder =
      options.telemetryRecorder ??
      defaultTelemetryRecorder;
  }

  registerMethod(
    definition:
      EvaluationMethodDefinition,
  ): EvaluationMethodDefinition {
    const normalized =
      normalizedMethod(
        definition,
      );

    if (
      this.methods.has(
        normalized.id,
      )
    ) {
      throw new Error(
        `Evaluation method is already registered: ${normalized.id}`,
      );
    }

    this.methods.set(
      normalized.id,
      normalized,
    );

    return {
      ...normalized,
    };
  }

  upsertMethod(
    definition:
      EvaluationMethodDefinition,
  ): EvaluationMethodDefinition {
    const normalized =
      normalizedMethod(
        definition,
      );

    this.methods.set(
      normalized.id,
      normalized,
    );

    return {
      ...normalized,
    };
  }

  getMethod(
    id: string,
  ):
    EvaluationMethodDefinition
    | undefined {
    const method =
      this.methods.get(
        id.trim(),
      );

    return method
      ? {
          ...method,
        }
      : undefined;
  }

  listMethods():
    EvaluationMethodDefinition[] {
    return [
      ...this.methods.values(),
    ]
      .sort(
        (left, right) =>
          left.id.localeCompare(
            right.id,
          ),
      )
      .map(
        (method) => ({
          ...method,
        }),
      );
  }

  registerProfile(
    profile:
      TaskEvaluationProfile,
  ): TaskEvaluationProfile {
    const normalized =
      normalizedProfile(
        profile,
      );

    if (
      this.profiles.has(
        normalized.taskClass,
      )
    ) {
      throw new Error(
        `Evaluation profile is already registered: ${normalized.taskClass}`,
      );
    }

    this.profiles.set(
      normalized.taskClass,
      normalized,
    );

    return structuredClone(
      normalized,
    );
  }

  upsertProfile(
    profile:
      TaskEvaluationProfile,
  ): TaskEvaluationProfile {
    const normalized =
      normalizedProfile(
        profile,
      );

    this.profiles.set(
      normalized.taskClass,
      normalized,
    );

    return structuredClone(
      normalized,
    );
  }

  getProfile(
    taskClass: string,
  ):
    TaskEvaluationProfile
    | undefined {
    const profile =
      this.profiles.get(
        taskClass.trim(),
      );

    return profile
      ? structuredClone(
          profile,
        )
      : undefined;
  }

  listProfiles():
    TaskEvaluationProfile[] {
    return [
      ...this.profiles.values(),
    ]
      .sort(
        (left, right) =>
          left.taskClass.localeCompare(
            right.taskClass,
          ),
      )
      .map(
        (profile) =>
          structuredClone(
            profile,
          ),
      );
  }

  async evaluate(
    artifact:
      EvaluationArtifact,
  ): Promise<EvaluationReport> {
    const taskClass =
      normalizeId(
        artifact.taskClass,
        "artifact.taskClass",
      );

    const profile =
      this.profiles.get(
        taskClass,
      );

    if (!profile) {
      throw new Error(
        `No evaluation profile registered for task class: ${taskClass}`,
      );
    }

    const results:
      EvaluationMethodResult[] =
        [];

    const missingMethods:
      string[] =
        [];

    for (
      const methodId
      of profile.methodIds
    ) {
      const method =
        this.methods.get(
          methodId,
        );

      if (!method) {
        missingMethods.push(
          methodId,
        );
        continue;
      }

      const raw =
        await method.executor({
          artifact: {
            ...artifact,
            taskClass,
          },
          method,
        });

      if (
        raw.methodId !==
        method.id
      ) {
        throw new Error(
          `Evaluation result methodId mismatch: expected ${method.id}, received ${raw.methodId}`,
        );
      }

      if (
        raw.kind !==
        method.kind ||
        raw.perspective !==
        method.perspective
      ) {
        throw new Error(
          `Evaluation result contract mismatch for method ${method.id}.`,
        );
      }

      const result:
        EvaluationMethodResult = {
          ...structuredClone(
            raw,
          ),
          score:
            normalizeScore(
              raw.score,
            ),
          issues:
            structuredClone(
              raw.issues,
            ),
          evidence:
            structuredClone(
              raw.evidence,
            ),
        };

      results.push(
        result,
      );

      await this.telemetryRecorder({
        taskClass,
        provider:
          artifact.provider,
        model:
          artifact.model,
        correlationId:
          artifact.correlationId,
        methodId:
          method.id,
        result,
      });
    }

    const objective =
      summarizePerspective(
        results,
        this.methods,
        "objective",
      );

    const subjective =
      summarizePerspective(
        results,
        this.methods,
        "subjective",
      );

    const configuredObjectiveWeight =
      profile.methodIds
        .map(
          (methodId) =>
            this.methods.get(
              methodId,
            ),
        )
        .filter(
          (
            method,
          ): method is
            EvaluationMethodDefinition =>
              Boolean(
                method &&
                method.perspective ===
                  "objective",
              ),
        )
        .reduce(
          (
            total,
            method,
          ) =>
            total +
            method.weight,
          0,
        );

    const objectiveCoverage =
      configuredObjectiveWeight >
      0
        ? objective.totalWeight /
          configuredObjectiveWeight
        : 1;

    const requiredFailures =
      results
        .filter(
          (result) => {
            const method =
              this.methods.get(
                result.methodId,
              );

            return (
              method?.required ===
                true &&
              result.passed ===
                false
            );
          },
        )
        .map(
          (result) =>
            result.methodId,
        );

    let outcome:
      EvaluationOutcome;

    if (
      missingMethods.length > 0 ||
      requiredFailures.length > 0
    ) {
      outcome =
        "fail";
    } else if (
      objectiveCoverage <
        profile
          .objectiveMinimumCoverage
    ) {
      outcome =
        "needs-review";
    } else if (
      objective.available &&
      (
        objective.score ??
        0
      ) <
        profile
          .objectivePassThreshold
    ) {
      outcome =
        "fail";
    } else if (
      profile
        .requireSubjectiveSignal ===
        true &&
      !subjective.available
    ) {
      outcome =
        "needs-review";
    } else {
      outcome =
        "pass";
    }

    return {
      taskClass,
      evaluatedAt:
        new Date()
          .toISOString(),
      outcome,
      objective,
      subjective,
      results,
      requiredFailures,
      missingMethods,
    };
  }
}

export function createEvaluationMethodResult(
  input: {
    methodId: string;
    kind: EvaluationMethodKind;
    perspective: EvaluationPerspective;
    score: number;
    passed?: boolean;
    passThreshold?: number;
    summary: string;
    issues?: EvaluationIssue[];
    evidence?: EvaluationEvidence[];
    metadata?: Record<
      string,
      unknown
    >;
  },
): EvaluationMethodResult {
  const score =
    normalizeScore(
      input.score,
    );

  const passThreshold =
    input.passThreshold ===
    undefined
      ? 0.5
      : normalizeScore(
          input.passThreshold,
        );

  return {
    methodId:
      normalizeId(
        input.methodId,
        "methodId",
      ),
    kind:
      input.kind,
    perspective:
      input.perspective,
    score,
    passed:
      input.passed ??
      score >=
        passThreshold,
    summary:
      input.summary.trim(),
    issues:
      structuredClone(
        input.issues ??
        [],
      ),
    evidence:
      structuredClone(
        input.evidence ??
        [],
      ),
    metadata:
      input.metadata
        ? structuredClone(
            input.metadata,
          )
        : undefined,
  };
}

const defaultEvaluationFramework =
  new EvaluationFramework();

export function getEvaluationFramework():
  EvaluationFramework {
  return defaultEvaluationFramework;
}