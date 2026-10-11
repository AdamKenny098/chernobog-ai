import {
  mkdir,
  readFile,
  rename,
  writeFile,
} from "node:fs/promises";

import {
  dirname,
  join,
} from "node:path";

export const CONTINUOUS_CALIBRATION_VERSION =
  "oh4z.v1";

export type CalibrationObservationSource =
  | "real-work"
  | "scheduled-evaluation";

export type CalibrationVerificationVerdict =
  | "pass"
  | "revise"
  | "reject"
  | "blocked"
  | "unknown";

export interface CalibrationTaskProfile {
  domain: string;

  complexity?: string;
  creativity?: string;
  factuality?: string;
  reasoningDepth?: string;
  privacySensitivity?: string;
  toolUse?: string;
}

export interface CalibrationObservation {
  id: string;

  observedAt: string;

  source:
    CalibrationObservationSource;

  modelId: string;
  modelVersion: string;

  strategy?: string;

  task:
    CalibrationTaskProfile;

  objective: {
    score: number;

    success?:
      boolean;

    verificationVerdict?:
      CalibrationVerificationVerdict;

    executionSucceeded?:
      boolean;

    evidenceConfidence?:
      number;
  };

  subjective?: {
    preferenceScore?: number;

    userRating?: number;

    source?: string;
  };

  telemetry?: {
    latencyMs?: number;

    cost?: number;

    retries?: number;

    fallbackCount?: number;
  };

  provenance?: {
    experienceId?: string;

    evaluationId?: string;

    taskId?: string;

    eventIds?: string[];
  };
}

export interface CalibrationSubject {
  modelId: string;
  modelVersion: string;

  strategy?: string;

  domains?: string[];
}

export interface ContinuousCalibrationPolicy {
  halfLifeDays: number;

  scheduledEvaluationIntervalDays:
    number;

  minimumEffectiveSamples:
    number;

  strongSampleCount:
    number;

  maximumObservations:
    number;

  sourceWeights: {
    realWork: number;
    scheduledEvaluation: number;
  };
}

export interface CapabilityEstimate {
  key: string;

  modelId: string;
  modelVersion: string;

  strategy?: string;

  domain: string;

  objectiveScore: number;

  confidence: number;

  sampleCount: number;
  effectiveSampleCount: number;

  sourceCounts: {
    realWork: number;
    scheduledEvaluation: number;
  };

  verification: {
    passRate?: number;
    rejectRate?: number;
  };

  executionSuccessRate?: number;

  telemetry: {
    weightedLatencyMs?: number;
    weightedCost?: number;
    weightedRetries?: number;
    weightedFallbackCount?: number;
  };

  subjective: {
    sampleCount: number;
    weightedPreferenceScore?: number;
    weightedUserRating?: number;
  };

  firstObservedAt: string;
  lastObservedAt: string;

  lastScheduledEvaluationAt?:
    string;

  recalibration: {
    due: boolean;

    reasons: string[];
  };
}

export interface CalibrationSnapshot {
  version: string;

  generatedAt: string;

  policy:
    ContinuousCalibrationPolicy;

  observationCount: number;

  estimates:
    CapabilityEstimate[];

  dueSubjects:
    Array<{
      modelId: string;
      modelVersion: string;
      strategy?: string;
      domain: string;
      reasons: string[];
    }>;

  invariants: {
    subjectivePreferenceAffectsObjectiveScore:
      false;

    crossVersionEvidenceMixed:
      false;

    routingMutated:
      false;

    registryMutated:
      false;

    scheduledEvaluationExecuted:
      false;
  };
}

interface CalibrationSnapshotFile {
  schemaVersion: 1;

  savedAt: string;

  observations:
    CalibrationObservation[];
}

const DAY_MS =
  24 *
  60 *
  60 *
  1000;

export const DEFAULT_CONTINUOUS_CALIBRATION_POLICY:
  ContinuousCalibrationPolicy = {
    halfLifeDays:
      30,

    scheduledEvaluationIntervalDays:
      14,

    minimumEffectiveSamples:
      2,

    strongSampleCount:
      12,

    maximumObservations:
      5000,

    sourceWeights: {
      realWork:
        0.9,

      scheduledEvaluation:
        1,
    },
  };

function requireFinite(
  value: number,
  field: string,
): number {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    throw new Error(
      `${field} must be finite.`,
    );
  }

  return value;
}

function unitInterval(
  value: number,
  field: string,
): number {
  requireFinite(
    value,
    field,
  );

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

function nonNegative(
  value:
    number
    | undefined,
  field: string,
): number | undefined {
  if (
    value ===
    undefined
  ) {
    return undefined;
  }

  requireFinite(
    value,
    field,
  );

  if (
    value < 0
  ) {
    throw new Error(
      `${field} must be non-negative.`,
    );
  }

  return value;
}

function nonNegativeInteger(
  value:
    number
    | undefined,
  field: string,
): number | undefined {
  if (
    value ===
    undefined
  ) {
    return undefined;
  }

  if (
    !Number.isInteger(
      value,
    ) ||
    value < 0
  ) {
    throw new Error(
      `${field} must be a non-negative integer.`,
    );
  }

  return value;
}

function requireTimestamp(
  value: string,
  field: string,
): string {
  const parsed =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    throw new Error(
      `${field} must be a valid timestamp.`,
    );
  }

  return parsed.toISOString();
}

function normalizeText(
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

function optionalText(
  value:
    string
    | undefined,
): string | undefined {
  const normalized =
    value?.trim();

  return normalized ||
    undefined;
}

function normalizeDomain(
  value: string,
): string {
  return normalizeText(
    value,
    "calibration.task.domain",
  )
    .toLowerCase()
    .replace(
      /\s+/g,
      "-",
    );
}

function validatePolicy(
  policy:
    ContinuousCalibrationPolicy,
): ContinuousCalibrationPolicy {
  for (
    const [
      field,
      value,
    ]
    of [
      [
        "halfLifeDays",
        policy.halfLifeDays,
      ],
      [
        "scheduledEvaluationIntervalDays",
        policy.scheduledEvaluationIntervalDays,
      ],
      [
        "minimumEffectiveSamples",
        policy.minimumEffectiveSamples,
      ],
      [
        "strongSampleCount",
        policy.strongSampleCount,
      ],
      [
        "maximumObservations",
        policy.maximumObservations,
      ],
    ] as const
  ) {
    if (
      !Number.isFinite(
        value,
      ) ||
      value <= 0
    ) {
      throw new Error(
        `continuousCalibration.${field} must be greater than zero.`,
      );
    }
  }

  unitInterval(
    policy.sourceWeights
      .realWork,
    "continuousCalibration.sourceWeights.realWork",
  );

  unitInterval(
    policy.sourceWeights
      .scheduledEvaluation,
    "continuousCalibration.sourceWeights.scheduledEvaluation",
  );

  return structuredClone(
    policy,
  );
}

function normalizeObservation(
  value:
    CalibrationObservation,
): CalibrationObservation {
  const observedAt =
    requireTimestamp(
      value.observedAt,
      "calibration.observedAt",
    );

  const objectiveScore =
    unitInterval(
      value.objective
        .score,
      "calibration.objective.score",
    );

  const evidenceConfidence =
    value.objective
      .evidenceConfidence ===
      undefined
      ? undefined
      : unitInterval(
          value.objective
            .evidenceConfidence,
          "calibration.objective.evidenceConfidence",
        );

  const preferenceScore =
    value.subjective
      ?.preferenceScore ===
      undefined
      ? undefined
      : unitInterval(
          value.subjective
            .preferenceScore,
          "calibration.subjective.preferenceScore",
        );

  const userRating =
    value.subjective
      ?.userRating ===
      undefined
      ? undefined
      : unitInterval(
          value.subjective
            .userRating,
          "calibration.subjective.userRating",
        );

  return {
    id:
      normalizeText(
        value.id,
        "calibration.id",
      ),

    observedAt,

    source:
      value.source,

    modelId:
      normalizeText(
        value.modelId,
        "calibration.modelId",
      ),

    modelVersion:
      normalizeText(
        value.modelVersion,
        "calibration.modelVersion",
      ),

    strategy:
      optionalText(
        value.strategy,
      ),

    task: {
      domain:
        normalizeDomain(
          value.task.domain,
        ),

      complexity:
        optionalText(
          value.task
            .complexity,
        ),

      creativity:
        optionalText(
          value.task
            .creativity,
        ),

      factuality:
        optionalText(
          value.task
            .factuality,
        ),

      reasoningDepth:
        optionalText(
          value.task
            .reasoningDepth,
        ),

      privacySensitivity:
        optionalText(
          value.task
            .privacySensitivity,
        ),

      toolUse:
        optionalText(
          value.task
            .toolUse,
        ),
    },

    objective: {
      score:
        objectiveScore,

      success:
        value.objective
          .success,

      verificationVerdict:
        value.objective
          .verificationVerdict ??
        "unknown",

      executionSucceeded:
        value.objective
          .executionSucceeded,

      evidenceConfidence,
    },

    subjective: value.subjective
      ? {
          preferenceScore,

          userRating,

          source:
            optionalText(
              value.subjective
                .source,
            ),
        }
      : undefined,

    telemetry: value.telemetry
      ? {
          latencyMs:
            nonNegative(
              value.telemetry
                .latencyMs,
              "calibration.telemetry.latencyMs",
            ),

          cost:
            nonNegative(
              value.telemetry
                .cost,
              "calibration.telemetry.cost",
            ),

          retries:
            nonNegativeInteger(
              value.telemetry
                .retries,
              "calibration.telemetry.retries",
            ),

          fallbackCount:
            nonNegativeInteger(
              value.telemetry
                .fallbackCount,
              "calibration.telemetry.fallbackCount",
            ),
        }
      : undefined,

    provenance:
      value.provenance
        ? structuredClone(
            value.provenance,
          )
        : undefined,
  };
}

function estimateKey(
  input: {
    modelId: string;
    modelVersion: string;
    strategy?: string;
    domain: string;
  },
): string {
  return [
    input.modelId,
    input.modelVersion,
    input.strategy ??
      "any-strategy",
    input.domain,
  ].join(
    "::",
  );
}

function recencyWeight(
  observedAt: string,
  now: Date,
  halfLifeDays: number,
): number {
  const ageMs =
    Math.max(
      0,
      now.getTime() -
      new Date(
        observedAt,
      ).getTime(),
    );

  const ageDays =
    ageMs /
    DAY_MS;

  return Math.pow(
    0.5,
    ageDays /
    halfLifeDays,
  );
}

function sourceWeight(
  source:
    CalibrationObservationSource,
  policy:
    ContinuousCalibrationPolicy,
): number {
  return source ===
    "scheduled-evaluation"
    ? policy.sourceWeights
        .scheduledEvaluation
    : policy.sourceWeights
        .realWork;
}

function observationWeight(
  observation:
    CalibrationObservation,
  now: Date,
  policy:
    ContinuousCalibrationPolicy,
): number {
  const confidence =
    observation.objective
      .evidenceConfidence ??
    0.75;

  return (
    recencyWeight(
      observation.observedAt,
      now,
      policy.halfLifeDays,
    ) *
    sourceWeight(
      observation.source,
      policy,
    ) *
    confidence
  );
}

function weightedAverage(
  values:
    Array<{
      value: number;
      weight: number;
    }>,
): number | undefined {
  const usable =
    values.filter(
      (entry) =>
        Number.isFinite(
          entry.value,
        ) &&
        Number.isFinite(
          entry.weight,
        ) &&
        entry.weight >
        0,
    );

  if (
    usable.length ===
    0
  ) {
    return undefined;
  }

  const totalWeight =
    usable.reduce(
      (
        total,
        entry,
      ) =>
        total +
        entry.weight,
      0,
    );

  if (
    totalWeight <=
    0
  ) {
    return undefined;
  }

  return (
    usable.reduce(
      (
        total,
        entry,
      ) =>
        total +
        entry.value *
          entry.weight,
      0,
    ) /
    totalWeight
  );
}

function binaryRate(
  values:
    Array<{
      value: boolean;
      weight: number;
    }>,
): number | undefined {
  return weightedAverage(
    values.map(
      (entry) => ({
        value:
          entry.value
            ? 1
            : 0,

        weight:
          entry.weight,
      }),
    ),
  );
}

function estimateConfidence(
  effectiveSamples: number,
  policy:
    ContinuousCalibrationPolicy,
): number {
  const ratio =
    Math.min(
      1,
      effectiveSamples /
      policy.strongSampleCount,
    );

  return Math.max(
    0,
    Math.min(
      1,
      0.25 +
      0.75 *
      ratio,
    ),
  );
}

function dueReasons(
  input: {
    lastScheduledEvaluationAt?:
      string;

    effectiveSampleCount:
      number;

    now: Date;

    policy:
      ContinuousCalibrationPolicy;
  },
): string[] {
  const reasons:
    string[] =
      [];

  if (
    input.effectiveSampleCount <
    input.policy
      .minimumEffectiveSamples
  ) {
    reasons.push(
      "insufficient-effective-samples",
    );
  }

  if (
    !input
      .lastScheduledEvaluationAt
  ) {
    reasons.push(
      "no-scheduled-evaluation-for-current-version",
    );

    return reasons;
  }

  const ageDays =
    Math.max(
      0,
      input.now.getTime() -
      new Date(
        input
          .lastScheduledEvaluationAt,
      ).getTime(),
    ) /
    DAY_MS;

  if (
    ageDays >
    input.policy
      .scheduledEvaluationIntervalDays
  ) {
    reasons.push(
      "scheduled-evaluation-stale",
    );
  }

  return reasons;
}

export class ContinuousCalibrationEngine {
  private readonly observations =
    new Map<
      string,
      CalibrationObservation
    >();

  private readonly policy:
    ContinuousCalibrationPolicy;

  private readonly filePath:
    string;

  private readonly clock:
    () => Date;

  constructor(
    options: {
      policy?:
        Partial<
          ContinuousCalibrationPolicy
        >;

      filePath?:
        string;

      clock?:
        () => Date;
    } = {},
  ) {
    this.policy =
      validatePolicy({
        ...DEFAULT_CONTINUOUS_CALIBRATION_POLICY,

        ...(
          options.policy ??
          {}
        ),

        sourceWeights: {
          ...DEFAULT_CONTINUOUS_CALIBRATION_POLICY
            .sourceWeights,

          ...(
            options.policy
              ?.sourceWeights ??
            {}
          ),
        },
      });

    this.filePath =
      options.filePath ??
      join(
        process.cwd(),
        ".chernobog",
        "cognition",
        "continuous-calibration.json",
      );

    this.clock =
      options.clock ??
      (() => new Date());
  }

  get size(): number {
    return this.observations
      .size;
  }

  list():
    CalibrationObservation[] {
    return [
      ...this.observations
        .values(),
    ]
      .sort(
        (
          left,
          right,
        ) =>
          left.observedAt
            .localeCompare(
              right.observedAt,
            ) ||
          left.id
            .localeCompare(
              right.id,
            ),
      )
      .map(
        (entry) =>
          structuredClone(
            entry,
          ),
      );
  }

  clear(): void {
    this.observations
      .clear();
  }

  ingest(
    observation:
      CalibrationObservation,
  ):
    CalibrationObservation {
    const normalized =
      normalizeObservation(
        observation,
      );

    this.observations
      .set(
        normalized.id,
        normalized,
      );

    this.trim();

    return structuredClone(
      normalized,
    );
  }

  ingestMany(
    observations:
      readonly CalibrationObservation[],
  ):
    CalibrationObservation[] {
    return observations
      .map(
        (observation) =>
          this.ingest(
            observation,
          ),
      );
  }

  estimate(
    subject:
      CalibrationSubject,
    domain: string,
    now =
      this.clock(),
  ):
    CapabilityEstimate {
    const modelId =
      normalizeText(
        subject.modelId,
        "calibrationSubject.modelId",
      );

    const modelVersion =
      normalizeText(
        subject.modelVersion,
        "calibrationSubject.modelVersion",
      );

    const strategy =
      optionalText(
        subject.strategy,
      );

    const normalizedDomain =
      normalizeDomain(
        domain,
      );

    const matching =
      this.list()
        .filter(
          (observation) =>
            observation.modelId ===
              modelId &&
            observation.modelVersion ===
              modelVersion &&
            (
              strategy ===
                undefined ||
              observation.strategy ===
                strategy
            ) &&
            observation.task.domain ===
              normalizedDomain,
        );

    const weighted =
      matching.map(
        (observation) => ({
          observation,

          weight:
            observationWeight(
              observation,
              now,
              this.policy,
            ),
        }),
      );

    const totalWeight =
      weighted.reduce(
        (
          total,
          entry,
        ) =>
          total +
          entry.weight,
        0,
      );

    const objectiveScore =
      weightedAverage(
        weighted.map(
          (entry) => ({
            value:
              entry.observation
                .objective
                .score,

            weight:
              entry.weight,
          }),
        ),
      ) ??
      0.5;

    const scheduled =
      matching.filter(
        (observation) =>
          observation.source ===
          "scheduled-evaluation",
      );

    const lastScheduledEvaluationAt =
      scheduled.length >
        0
        ? scheduled[
            scheduled.length -
            1
          ]?.observedAt
        : undefined;

    const reasons =
      dueReasons({
        lastScheduledEvaluationAt,

        effectiveSampleCount:
          totalWeight,

        now,

        policy:
          this.policy,
      });

    const subjectiveEntries =
      weighted.filter(
        (entry) =>
          entry.observation
            .subjective
            ?.preferenceScore !==
            undefined ||
          entry.observation
            .subjective
            ?.userRating !==
            undefined,
      );

    return {
      key:
        estimateKey({
          modelId,
          modelVersion,
          strategy,
          domain:
            normalizedDomain,
        }),

      modelId,
      modelVersion,
      strategy,
      domain:
        normalizedDomain,

      objectiveScore:
        Math.max(
          0,
          Math.min(
            1,
            objectiveScore,
          ),
        ),

      confidence:
        estimateConfidence(
          totalWeight,
          this.policy,
        ),

      sampleCount:
        matching.length,

      effectiveSampleCount:
        totalWeight,

      sourceCounts: {
        realWork:
          matching.filter(
            (observation) =>
              observation.source ===
              "real-work",
          ).length,

        scheduledEvaluation:
          scheduled.length,
      },

      verification: {
        passRate:
          binaryRate(
            weighted
              .filter(
                (entry) =>
                  entry.observation
                    .objective
                    .verificationVerdict !==
                    undefined &&
                  entry.observation
                    .objective
                    .verificationVerdict !==
                    "unknown",
              )
              .map(
                (entry) => ({
                  value:
                    entry.observation
                      .objective
                      .verificationVerdict ===
                    "pass",

                  weight:
                    entry.weight,
                }),
              ),
          ),

        rejectRate:
          binaryRate(
            weighted
              .filter(
                (entry) =>
                  entry.observation
                    .objective
                    .verificationVerdict !==
                    undefined &&
                  entry.observation
                    .objective
                    .verificationVerdict !==
                    "unknown",
              )
              .map(
                (entry) => ({
                  value:
                    entry.observation
                      .objective
                      .verificationVerdict ===
                    "reject",

                  weight:
                    entry.weight,
                }),
              ),
          ),
      },

      executionSuccessRate:
        binaryRate(
          weighted
            .filter(
              (entry) =>
                entry.observation
                  .objective
                  .executionSucceeded !==
                undefined,
            )
            .map(
              (entry) => ({
                value:
                  entry.observation
                    .objective
                    .executionSucceeded ===
                  true,

                weight:
                  entry.weight,
              }),
            ),
        ),

      telemetry: {
        weightedLatencyMs:
          weightedAverage(
            weighted
              .filter(
                (entry) =>
                  entry.observation
                    .telemetry
                    ?.latencyMs !==
                  undefined,
              )
              .map(
                (entry) => ({
                  value:
                    entry.observation
                      .telemetry
                      ?.latencyMs ??
                    0,

                  weight:
                    entry.weight,
                }),
              ),
          ),

        weightedCost:
          weightedAverage(
            weighted
              .filter(
                (entry) =>
                  entry.observation
                    .telemetry
                    ?.cost !==
                  undefined,
              )
              .map(
                (entry) => ({
                  value:
                    entry.observation
                      .telemetry
                      ?.cost ??
                    0,

                  weight:
                    entry.weight,
                }),
              ),
          ),

        weightedRetries:
          weightedAverage(
            weighted
              .filter(
                (entry) =>
                  entry.observation
                    .telemetry
                    ?.retries !==
                  undefined,
              )
              .map(
                (entry) => ({
                  value:
                    entry.observation
                      .telemetry
                      ?.retries ??
                    0,

                  weight:
                    entry.weight,
                }),
              ),
          ),

        weightedFallbackCount:
          weightedAverage(
            weighted
              .filter(
                (entry) =>
                  entry.observation
                    .telemetry
                    ?.fallbackCount !==
                  undefined,
              )
              .map(
                (entry) => ({
                  value:
                    entry.observation
                      .telemetry
                      ?.fallbackCount ??
                    0,

                  weight:
                    entry.weight,
                }),
              ),
          ),
      },

      subjective: {
        sampleCount:
          subjectiveEntries
            .length,

        weightedPreferenceScore:
          weightedAverage(
            subjectiveEntries
              .filter(
                (entry) =>
                  entry.observation
                    .subjective
                    ?.preferenceScore !==
                  undefined,
              )
              .map(
                (entry) => ({
                  value:
                    entry.observation
                      .subjective
                      ?.preferenceScore ??
                    0,

                  weight:
                    entry.weight,
                }),
              ),
          ),

        weightedUserRating:
          weightedAverage(
            subjectiveEntries
              .filter(
                (entry) =>
                  entry.observation
                    .subjective
                    ?.userRating !==
                  undefined,
              )
              .map(
                (entry) => ({
                  value:
                    entry.observation
                      .subjective
                      ?.userRating ??
                    0,

                  weight:
                    entry.weight,
                }),
              ),
          ),
      },

      firstObservedAt:
        matching[0]
          ?.observedAt ??
        now.toISOString(),

      lastObservedAt:
        matching[
          matching.length -
          1
        ]?.observedAt ??
        now.toISOString(),

      lastScheduledEvaluationAt,

      recalibration: {
        due:
          reasons.length >
          0,

        reasons,
      },
    };
  }

  snapshot(
    subjects:
      readonly CalibrationSubject[],
    now =
      this.clock(),
  ):
    CalibrationSnapshot {
    const estimates:
      CapabilityEstimate[] =
        [];

    for (
      const subject
      of subjects
    ) {
      const domains =
        [
          ...new Set(
            (
              subject.domains ??
              []
            )
              .map(
                normalizeDomain,
              ),
          ),
        ];

      const observedDomains =
        this.list()
          .filter(
            (observation) =>
              observation.modelId ===
                subject.modelId &&
              observation.modelVersion ===
                subject.modelVersion &&
              (
                subject.strategy ===
                  undefined ||
                observation.strategy ===
                  subject.strategy
              ),
          )
          .map(
            (observation) =>
              observation.task
                .domain,
          );

      const allDomains =
        [
          ...new Set(
            [
              ...domains,
              ...observedDomains,
            ],
          ),
        ]
          .sort();

      for (
        const domain
        of allDomains
      ) {
        estimates.push(
          this.estimate(
            subject,
            domain,
            now,
          ),
        );
      }
    }

    estimates.sort(
      (
        left,
        right,
      ) =>
        left.key
          .localeCompare(
            right.key,
          ),
    );

    return {
      version:
        CONTINUOUS_CALIBRATION_VERSION,

      generatedAt:
        now.toISOString(),

      policy:
        structuredClone(
          this.policy,
        ),

      observationCount:
        this.observations
          .size,

      estimates:
        structuredClone(
          estimates,
        ),

      dueSubjects:
        estimates
          .filter(
            (estimate) =>
              estimate
                .recalibration
                .due,
          )
          .map(
            (estimate) => ({
              modelId:
                estimate.modelId,

              modelVersion:
                estimate
                  .modelVersion,

              strategy:
                estimate.strategy,

              domain:
                estimate.domain,

              reasons:
                structuredClone(
                  estimate
                    .recalibration
                    .reasons,
                ),
            }),
          ),

      invariants: {
        subjectivePreferenceAffectsObjectiveScore:
          false,

        crossVersionEvidenceMixed:
          false,

        routingMutated:
          false,

        registryMutated:
          false,

        scheduledEvaluationExecuted:
          false,
      },
    };
  }

  async save(
    now =
      this.clock(),
  ):
    Promise<void> {
    const snapshot:
      CalibrationSnapshotFile = {
        schemaVersion:
          1,

        savedAt:
          now.toISOString(),

        observations:
          this.list(),
      };

    await mkdir(
      dirname(
        this.filePath,
      ),
      {
        recursive:
          true,
      },
    );

    const temp =
      `${this.filePath}.tmp`;

    await writeFile(
      temp,
      `${JSON.stringify(snapshot, null, 2)}\n`,
      "utf8",
    );

    await rename(
      temp,
      this.filePath,
    );
  }

  async load():
    Promise<void> {
    const raw =
      await readFile(
        this.filePath,
        "utf8",
      );

    const parsed =
      JSON.parse(
        raw,
      ) as Partial<
        CalibrationSnapshotFile
      >;

    if (
      parsed.schemaVersion !==
        1 ||
      !Array.isArray(
        parsed.observations,
      )
    ) {
      throw new Error(
        "Invalid continuous calibration snapshot.",
      );
    }

    const next =
      new Map<
        string,
        CalibrationObservation
      >();

    for (
      const rawObservation
      of parsed.observations
    ) {
      const normalized =
        normalizeObservation(
          rawObservation,
        );

      next.set(
        normalized.id,
        normalized,
      );
    }

    this.observations
      .clear();

    for (
      const [
        id,
        observation,
      ]
      of next
    ) {
      this.observations
        .set(
          id,
          observation,
        );
    }

    this.trim();
  }

  private trim():
    void {
    const maximum =
      Math.floor(
        this.policy
          .maximumObservations,
      );

    if (
      this.observations
        .size <=
      maximum
    ) {
      return;
    }

    const ordered =
      this.list();

    const removeCount =
      ordered.length -
      maximum;

    for (
      const observation
      of ordered.slice(
        0,
        removeCount,
      )
    ) {
      this.observations
        .delete(
          observation.id,
        );
    }
  }
}

type ContinuousCalibrationGlobals =
  typeof globalThis & {
    __chernobogContinuousCalibrationPromise?:
      Promise<
        ContinuousCalibrationEngine
      >;
  };

const calibrationGlobals =
  globalThis as
    ContinuousCalibrationGlobals;

export function getContinuousCalibrationEngine():
  Promise<
    ContinuousCalibrationEngine
  > {
  if (
    !calibrationGlobals
      .__chernobogContinuousCalibrationPromise
  ) {
    calibrationGlobals
      .__chernobogContinuousCalibrationPromise =
      Promise.resolve()
        .then(
          async () => {
            const engine =
              new ContinuousCalibrationEngine();

            try {
              await engine.load();
            } catch (
              error
            ) {
              const code =
                (
                  error as
                    NodeJS.ErrnoException
                ).code;

              if (
                code !==
                "ENOENT"
              ) {
                throw error;
              }
            }

            return engine;
          },
        )
        .catch(
          (error) => {
            delete calibrationGlobals
              .__chernobogContinuousCalibrationPromise;

            throw error;
          },
        );
  }

  return calibrationGlobals
    .__chernobogContinuousCalibrationPromise;
}