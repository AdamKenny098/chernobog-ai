import type {
  EvaluationFramework,
  EvaluationReport,
} from "./evaluation";

export interface CalibrationCandidate {
  id: string;
  provider: string;
  modelId: string;
  strategyId: string;

  metadata?: Record<
    string,
    unknown
  >;
}

export interface CalibrationTask {
  id: string;
  taskClass: string;
  input: unknown;
  expected?: unknown;

  metadata?: Record<
    string,
    unknown
  >;
}

export interface CalibrationExecution {
  candidateId: string;
  taskId: string;

  ok: boolean;
  output?: unknown;
  error?: string;

  durationMs: number;
}

export type CalibrationExecutor =
  (
    candidate: CalibrationCandidate,
    task: CalibrationTask,
  ) =>
    Promise<CalibrationExecution>
    | CalibrationExecution;

export interface CalibrationArenaRunOptions {
  blind?: boolean;
}

export interface CalibrationSampleResult {
  candidateId: string;
  blindLabel: string;
  provider: string;
  modelId: string;
  strategyId: string;

  taskId: string;
  taskClass: string;

  execution: CalibrationExecution;
  evaluation?: EvaluationReport;
}

export interface CalibrationCapabilityScore {
  subjectKind:
    | "candidate"
    | "model"
    | "strategy";

  subjectId: string;
  taskClass: string;

  sampleCount: number;
  executionSuccessRate: number;
  passRate: number;

  objectiveScore: number | null;
  subjectiveScore: number | null;

  blindSamples: number;
}

export interface CalibrationArenaResult {
  startedAt: string;
  completedAt: string;
  blind: boolean;

  candidates: CalibrationCandidate[];
  tasks: CalibrationTask[];

  blindMap: Record<
    string,
    string
  >;

  samples:
    CalibrationSampleResult[];

  capabilityScores:
    CalibrationCapabilityScore[];
}

function requireText(
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

function normalizeCandidate(
  candidate:
    CalibrationCandidate,
): CalibrationCandidate {
  return {
    ...structuredClone(
      candidate,
    ),
    id:
      requireText(
        candidate.id,
        "candidate.id",
      ),
    provider:
      requireText(
        candidate.provider,
        "candidate.provider",
      ),
    modelId:
      requireText(
        candidate.modelId,
        "candidate.modelId",
      ),
    strategyId:
      requireText(
        candidate.strategyId,
        "candidate.strategyId",
      ),
  };
}

function normalizeTask(
  task:
    CalibrationTask,
): CalibrationTask {
  return {
    ...structuredClone(
      task,
    ),
    id:
      requireText(
        task.id,
        "task.id",
      ),
    taskClass:
      requireText(
        task.taskClass,
        "task.taskClass",
      ),
  };
}

function average(
  values:
    readonly number[],
): number | null {
  if (
    values.length === 0
  ) {
    return null;
  }

  return (
    values.reduce(
      (sum, value) =>
        sum + value,
      0,
    ) /
    values.length
  );
}

function buildScore(
  subjectKind:
    CalibrationCapabilityScore["subjectKind"],
  subjectId:
    string,
  taskClass:
    string,
  samples:
    readonly CalibrationSampleResult[],
  blind:
    boolean,
): CalibrationCapabilityScore {
  const executions =
    samples.filter(
      (sample) =>
        sample.execution.ok,
    );

  const evaluated =
    samples.filter(
      (sample) =>
        sample.evaluation,
    );

  const objectiveScores =
    evaluated.flatMap(
      (sample) => {
        const score =
          sample.evaluation
            ?.objective.score;

        return typeof score ===
          "number"
          ? [
              score,
            ]
          : [];
      },
    );

  const subjectiveScores =
    evaluated.flatMap(
      (sample) => {
        const score =
          sample.evaluation
            ?.subjective.score;

        return typeof score ===
          "number"
          ? [
              score,
            ]
          : [];
      },
    );

  const passes =
    evaluated.filter(
      (sample) =>
        sample.evaluation
          ?.outcome ===
        "pass",
    ).length;

  return {
    subjectKind,
    subjectId,
    taskClass,
    sampleCount:
      samples.length,
    executionSuccessRate:
      samples.length > 0
        ? executions.length /
          samples.length
        : 0,
    passRate:
      samples.length > 0
        ? passes /
          samples.length
        : 0,
    objectiveScore:
      average(
        objectiveScores,
      ),
    subjectiveScore:
      average(
        subjectiveScores,
      ),
    blindSamples:
      blind
        ? samples.length
        : 0,
  };
}

function groupScores(
  samples:
    readonly CalibrationSampleResult[],
  candidates:
    readonly CalibrationCandidate[],
  blind:
    boolean,
): CalibrationCapabilityScore[] {
  const scores:
    CalibrationCapabilityScore[] =
      [];

  const taskClasses =
    [
      ...new Set(
        samples.map(
          (sample) =>
            sample.taskClass,
        ),
      ),
    ].sort();

  for (
    const taskClass
    of taskClasses
  ) {
    for (
      const candidate
      of candidates
    ) {
      const relevant =
        samples.filter(
          (sample) =>
            sample.taskClass ===
              taskClass &&
            sample.candidateId ===
              candidate.id,
        );

      if (
        relevant.length === 0
      ) {
        continue;
      }

      scores.push(
        buildScore(
          "candidate",
          candidate.id,
          taskClass,
          relevant,
          blind,
        ),
      );
    }

    const modelIds =
      [
        ...new Set(
          candidates.map(
            (candidate) =>
              candidate.modelId,
          ),
        ),
      ].sort();

    for (
      const modelId
      of modelIds
    ) {
      const candidateIds =
        new Set(
          candidates
            .filter(
              (candidate) =>
                candidate.modelId ===
                modelId,
            )
            .map(
              (candidate) =>
                candidate.id,
            ),
        );

      const relevant =
        samples.filter(
          (sample) =>
            sample.taskClass ===
              taskClass &&
            candidateIds.has(
              sample.candidateId,
            ),
        );

      if (
        relevant.length === 0
      ) {
        continue;
      }

      scores.push(
        buildScore(
          "model",
          modelId,
          taskClass,
          relevant,
          blind,
        ),
      );
    }

    const strategyIds =
      [
        ...new Set(
          candidates.map(
            (candidate) =>
              candidate.strategyId,
          ),
        ),
      ].sort();

    for (
      const strategyId
      of strategyIds
    ) {
      const candidateIds =
        new Set(
          candidates
            .filter(
              (candidate) =>
                candidate.strategyId ===
                strategyId,
            )
            .map(
              (candidate) =>
                candidate.id,
            ),
        );

      const relevant =
        samples.filter(
          (sample) =>
            sample.taskClass ===
              taskClass &&
            candidateIds.has(
              sample.candidateId,
            ),
        );

      if (
        relevant.length === 0
      ) {
        continue;
      }

      scores.push(
        buildScore(
          "strategy",
          strategyId,
          taskClass,
          relevant,
          blind,
        ),
      );
    }
  }

  return scores.sort(
    (left, right) =>
      [
        left.taskClass,
        left.subjectKind,
        left.subjectId,
      ]
        .join(":")
        .localeCompare(
          [
            right.taskClass,
            right.subjectKind,
            right.subjectId,
          ].join(":"),
        ),
  );
}

export class CalibrationArena {
  constructor(
    private readonly evaluation:
      EvaluationFramework,
    private readonly executor:
      CalibrationExecutor,
  ) {}

  async run(
    candidates:
      readonly CalibrationCandidate[],
    tasks:
      readonly CalibrationTask[],
    options:
      CalibrationArenaRunOptions = {},
  ): Promise<CalibrationArenaResult> {
    if (
      candidates.length < 2
    ) {
      throw new Error(
        "Calibration requires at least two candidates.",
      );
    }

    if (
      tasks.length === 0
    ) {
      throw new Error(
        "Calibration requires at least one task.",
      );
    }

    const normalizedCandidates =
      candidates.map(
        normalizeCandidate,
      );

    const normalizedTasks =
      tasks.map(
        normalizeTask,
      );

    const candidateIds =
      normalizedCandidates.map(
        (candidate) =>
          candidate.id,
      );

    if (
      new Set(
        candidateIds,
      ).size !==
      candidateIds.length
    ) {
      throw new Error(
        "Calibration candidate ids must be unique.",
      );
    }

    const taskIds =
      normalizedTasks.map(
        (task) =>
          task.id,
      );

    if (
      new Set(
        taskIds,
      ).size !==
      taskIds.length
    ) {
      throw new Error(
        "Calibration task ids must be unique.",
      );
    }

    const blind =
      options.blind !==
      false;

    const blindMap:
      Record<
        string,
        string
      > =
        Object.fromEntries(
          normalizedCandidates.map(
            (
              candidate,
              index,
            ) => [
              candidate.id,
              `candidate-${String(
                index + 1,
              ).padStart(
                2,
                "0",
              )}`,
            ],
          ),
        );

    const startedAt =
      new Date()
        .toISOString();

    const samples:
      CalibrationSampleResult[] =
        [];

    for (
      const task
      of normalizedTasks
    ) {
      for (
        const candidate
        of normalizedCandidates
      ) {
        let execution:
          CalibrationExecution;

        const executionStarted =
          Date.now();

        try {
          const raw =
            await this.executor(
              structuredClone(
                candidate,
              ),
              structuredClone(
                task,
              ),
            );

          execution = {
            ...structuredClone(
              raw,
            ),
            candidateId:
              candidate.id,
            taskId:
              task.id,
            durationMs:
              Number.isFinite(
                raw.durationMs,
              )
                ? Math.max(
                    0,
                    raw.durationMs,
                  )
                : Date.now() -
                  executionStarted,
          };
        } catch (error) {
          execution = {
            candidateId:
              candidate.id,
            taskId:
              task.id,
            ok:
              false,
            error:
              error instanceof Error
                ? error.message
                : String(error),
            durationMs:
              Date.now() -
              executionStarted,
          };
        }

        let evaluation:
          EvaluationReport
          | undefined;

        if (
          execution.ok
        ) {
          evaluation =
            await this.evaluation
              .evaluate({
                taskClass:
                  task.taskClass,
                input:
                  structuredClone(
                    task.input,
                  ),
                output:
                  structuredClone(
                    execution.output,
                  ),
                expected:
                  structuredClone(
                    task.expected,
                  ),
                provider:
                  blind
                    ? undefined
                    : candidate.provider,
                model:
                  blind
                    ? undefined
                    : candidate.modelId,
                metadata: {
                  calibration:
                    true,
                  taskId:
                    task.id,
                  candidateLabel:
                    blind
                      ? blindMap[
                          candidate.id
                        ]
                      : candidate.id,
                  strategyId:
                    blind
                      ? undefined
                      : candidate.strategyId,
                },
              });
        }

        samples.push({
          candidateId:
            candidate.id,
          blindLabel:
            blindMap[
              candidate.id
            ],
          provider:
            candidate.provider,
          modelId:
            candidate.modelId,
          strategyId:
            candidate.strategyId,
          taskId:
            task.id,
          taskClass:
            task.taskClass,
          execution,
          evaluation,
        });
      }
    }

    return {
      startedAt,
      completedAt:
        new Date()
          .toISOString(),
      blind,
      candidates:
        structuredClone(
          normalizedCandidates,
        ),
      tasks:
        structuredClone(
          normalizedTasks,
        ),
      blindMap,
      samples,
      capabilityScores:
        groupScores(
          samples,
          normalizedCandidates,
          blind,
        ),
    };
  }
}