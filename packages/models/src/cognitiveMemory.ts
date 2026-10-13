import {
  createLearningExperience,
  createLearningFeedbackObservation,
  createLearningOutcomeObservation,
  getChernobogLearningRuntime,
  type EvaluatedLearningExperience,
  type LearningExperience,
  type LearningExperienceSource,
  type LearningFeedbackKind,
  type LearningOutcomeStatus,
  type LearningPatternCandidate,
} from "@/lib/chernobog/learning";

export const COGNITIVE_MEMORY_VERSION =
  "oh4y.v1";

export type CognitiveMemoryOutcomeStatus =
  LearningOutcomeStatus;

export type CognitiveMemoryFeedbackKind =
  Exclude<
    LearningFeedbackKind,
    "none"
  >;

export interface CognitiveMemoryOutcome {
  status:
    CognitiveMemoryOutcomeStatus;

  score?: number;

  confidence?: number;

  detail?: string;

  evidenceEventIds?: string[];

  evidenceWorldStateKeys?:
    string[];
}

export interface CognitiveMemoryFeedback {
  kind:
    CognitiveMemoryFeedbackKind;

  confidence?: number;

  detail: string;
}

export interface CognitiveMemoryExecutionSummary {
  actionIntentId?: string;

  idempotencyKey?: string;

  targetKind?:
    "tool"
    | "agent";

  targetName?: string;

  status?:
    "not-run"
    | "completed"
    | "failed"
    | "partial"
    | "blocked";

  failureKind?: string;

  detail?: string;
}

export interface CognitiveMemoryArtifactRefs {
  taskId: string;

  projectId?: string;

  taskKind: string;

  domain?: string;

  modelId?: string;

  strategy?: string;

  verificationVerdict?: string;

  confidenceScore?: number;

  escalationKind?: string;

  authorityStatus?: string;

  actionStatus?: string;

  sourceVersions?: {
    modelRouter?: string;
    strategyRouter?: string;
    criticVerification?: string;
    confidenceEngine?: string;
    escalationEngine?: string;
    authorityBridge?: string;
    actionBridge?: string;
  };
}

export interface CognitiveMemoryRecordInput {
  occurredAt: string;

  recordedAt?: string;

  source?:
    LearningExperienceSource;

  artifacts:
    CognitiveMemoryArtifactRefs;

  outcome?:
    CognitiveMemoryOutcome;

  feedback?:
    CognitiveMemoryFeedback;

  execution?:
    CognitiveMemoryExecutionSummary;

  evidence?: {
    eventIds?: string[];

    worldStateKeys?: string[];

    cognitiveDecisionIds?: string[];
  };

  notes?: string[];

  metadata?: Record<
    string,
    unknown
  >;
}

export interface CognitiveMemoryRecordResult {
  version: string;

  recordedAt: string;

  experience:
    LearningExperience;

  evaluation:
    EvaluatedLearningExperience;

  patternRefresh: {
    totalPatterns: number;

    activeProjectPatterns:
      LearningPatternCandidate[];

    globalPatterns:
      LearningPatternCandidate[];
  };

  lessonState: {
    totalLessons: number;
    activeLessons: number;

    lessonPromotionPerformed:
      false;
  };

  invariants: {
    directLearnedLessonWrite:
      false;

    automaticLessonPromotion:
      false;

    rawExperienceCanOverrideGovernance:
      false;

    preferenceSeparatedFromOutcome:
      true;

    projectScopePreserved:
      true;
  };
}

function normalizeOptional(
  value:
    string
    | undefined,
): string | undefined {
  const normalized =
    value?.trim();

  return normalized ||
    undefined;
}

function uniqueText(
  values:
    readonly string[]
    | undefined,
): string[] {
  return [
    ...new Set(
      (
        values ??
        []
      )
        .map(
          (value) =>
            value.trim(),
        )
        .filter(Boolean),
    ),
  ].sort();
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

function unitInterval(
  value:
    number
    | undefined,
  fallback:
    number,
  field: string,
): number {
  const normalized =
    value ??
    fallback;

  if (
    !Number.isFinite(
      normalized,
    ) ||
    normalized < 0 ||
    normalized > 1
  ) {
    throw new Error(
      `${field} must be between 0 and 1.`,
    );
  }

  return normalized;
}

function outcomeScore(
  value:
    number
    | undefined,
): number | undefined {
  if (
    value ===
    undefined
  ) {
    return undefined;
  }

  if (
    !Number.isFinite(
      value,
    ) ||
    value < -1 ||
    value > 1
  ) {
    throw new Error(
      "cognitiveMemory.outcome.score must be between -1 and 1.",
    );
  }

  return value;
}

function jsonSafe(
  value:
    Record<
      string,
      unknown
    >
    | undefined,
): Record<
  string,
  unknown
> {
  try {
    return JSON.parse(
      JSON.stringify(
        value ??
        {},
      ),
    ) as Record<
      string,
      unknown
    >;
  } catch {
    throw new Error(
      "cognitiveMemory.metadata must be JSON-safe.",
    );
  }
}

function normalizeTaskId(
  value: string,
): string {
  const normalized =
    value.trim();

  if (!normalized) {
    throw new Error(
      "cognitiveMemory.artifacts.taskId must not be empty.",
    );
  }

  return normalized;
}

function normalizeTaskKind(
  value: string,
): string {
  const normalized =
    value.trim();

  if (!normalized) {
    throw new Error(
      "cognitiveMemory.artifacts.taskKind must not be empty.",
    );
  }

  return normalized;
}

function normalizeKeyPart(
  value:
    string
    | undefined,
  fallback: string,
): string {
  return (
    value
      ?.trim()
      .toLowerCase()
      .replace(
        /[^a-z0-9._:-]+/g,
        "-",
      )
      .replace(
        /^-+|-+$/g,
        "",
      ) ||
    fallback
  );
}

function subjectFor(
  artifacts:
    CognitiveMemoryArtifactRefs,
): string {
  const taskKind =
    normalizeKeyPart(
      artifacts.taskKind,
      "task",
    );

  const domain =
    normalizeKeyPart(
      artifacts.domain,
      "general",
    );

  const strategy =
    normalizeKeyPart(
      artifacts.strategy,
      "unknown-strategy",
    );

  const model =
    normalizeKeyPart(
      artifacts.modelId,
      "unknown-model",
    );

  return [
    `cognitive-task:${taskKind}`,
    `domain=${domain}`,
    `strategy=${strategy}`,
    `model=${model}`,
  ].join(
    "|",
  );
}

function experienceIdFor(
  taskId: string,
  occurredAt: string,
): string {
  return [
    "oh4y",
    taskId,
    occurredAt,
  ].join(
    ":",
  );
}

function chooseSource(
  input:
    CognitiveMemoryRecordInput,
): LearningExperienceSource {
  if (
    input.source
  ) {
    return input.source;
  }

  if (
    input.execution ||
    input.outcome
  ) {
    return "action-outcome";
  }

  if (
    input.feedback
  ) {
    return "user-feedback";
  }

  return "cognitive-cycle";
}

function normalizedNotes(
  values:
    string[]
    | undefined,
): string[] {
  return uniqueText(
    values,
  );
}

function experienceContext(
  input:
    CognitiveMemoryRecordInput,
): Record<
  string,
  unknown
> {
  const artifacts =
    input.artifacts;

  const projectId =
    normalizeOptional(
      artifacts.projectId,
    );

  const context:
    Record<
      string,
      unknown
    > = {
      cognitiveMemoryVersion:
        COGNITIVE_MEMORY_VERSION,

      taskId:
        normalizeTaskId(
          artifacts.taskId,
        ),

      taskKind:
        normalizeTaskKind(
          artifacts.taskKind,
        ),

      domain:
        normalizeOptional(
          artifacts.domain,
        ),

      modelId:
        normalizeOptional(
          artifacts.modelId,
        ),

      strategy:
        normalizeOptional(
          artifacts.strategy,
        ),

      verificationVerdict:
        normalizeOptional(
          artifacts
            .verificationVerdict,
        ),

      confidenceScore:
        artifacts
          .confidenceScore ===
          undefined
          ? undefined
          : unitInterval(
              artifacts
                .confidenceScore,
              0.5,
              "cognitiveMemory.artifacts.confidenceScore",
            ),

      escalationKind:
        normalizeOptional(
          artifacts
            .escalationKind,
        ),

      authorityStatus:
        normalizeOptional(
          artifacts
            .authorityStatus,
        ),

      actionStatus:
        normalizeOptional(
          artifacts
            .actionStatus,
        ),

      sourceVersions:
        structuredClone(
          artifacts
            .sourceVersions ??
          {},
        ),

      execution:
        structuredClone(
          input.execution ??
          {},
        ),

      notes:
        normalizedNotes(
          input.notes,
        ),

      ...jsonSafe(
        input.metadata,
      ),
    };

  if (
    projectId
  ) {
    context.projectId =
      projectId;
  }

  return context;
}

function evidenceConfidence(
  input:
    CognitiveMemoryRecordInput,
): number {
  if (
    input.outcome
      ?.confidence !==
    undefined
  ) {
    return unitInterval(
      input.outcome
        .confidence,
      0.5,
      "cognitiveMemory.outcome.confidence",
    );
  }

  if (
    input.artifacts
      .confidenceScore !==
    undefined
  ) {
    return unitInterval(
      input.artifacts
        .confidenceScore,
      0.5,
      "cognitiveMemory.artifacts.confidenceScore",
    );
  }

  return 0.5;
}

export class CognitiveMemory {
  async record(
    input:
      CognitiveMemoryRecordInput,
  ): Promise<
    CognitiveMemoryRecordResult
  > {
    const occurredAt =
      requireTimestamp(
        input.occurredAt,
        "cognitiveMemory.occurredAt",
      );

    const recordedAt =
      requireTimestamp(
        input.recordedAt ??
        new Date()
          .toISOString(),
        "cognitiveMemory.recordedAt",
      );

    if (
      new Date(
        recordedAt,
      ).getTime() <
      new Date(
        occurredAt,
      ).getTime()
    ) {
      throw new Error(
        "cognitiveMemory.recordedAt must not be earlier than occurredAt.",
      );
    }

    const taskId =
      normalizeTaskId(
        input.artifacts
          .taskId,
      );

    const experienceId =
      experienceIdFor(
        taskId,
        occurredAt,
      );

    const experience =
      createLearningExperience(
        {
          id:
            experienceId,

          occurredAt,

          recordedAt,

          source:
            chooseSource(
              input,
            ),

          subject:
            subjectFor(
              input.artifacts,
            ),

          confidence:
            evidenceConfidence(
              input,
            ),

          outcome: {
            status:
              "unknown",
          },

          feedback: {
            kind:
              "none",
          },

          evidence: {
            eventIds:
              uniqueText(
                input.evidence
                  ?.eventIds,
              ),

            worldStateKeys:
              uniqueText(
                input.evidence
                  ?.worldStateKeys,
              ),

            cognitiveDecisionIds:
              uniqueText(
                input.evidence
                  ?.cognitiveDecisionIds,
              ),
          },

          context:
            experienceContext(
              input,
            ),
        },
        new Date(
          recordedAt,
        ),
      );

    const runtime =
      await getChernobogLearningRuntime();

    runtime.experiences
      .upsert(
        experience,
      );

    if (
      input.outcome
    ) {
      runtime.addOutcome(
        createLearningOutcomeObservation({
          id:
            `outcome:${experienceId}`,

          experienceId,

          observedAt:
            recordedAt,

          status:
            input.outcome
              .status,

          score:
            outcomeScore(
              input.outcome
                .score,
            ),

          confidence:
            unitInterval(
              input.outcome
                .confidence,
              evidenceConfidence(
                input,
              ),
              "cognitiveMemory.outcome.confidence",
            ),

          detail:
            normalizeOptional(
              input.outcome
                .detail,
            ),

          evidenceEventIds:
            uniqueText(
              input.outcome
                .evidenceEventIds ??
              input.evidence
                ?.eventIds,
            ),

          evidenceWorldStateKeys:
            uniqueText(
              input.outcome
                .evidenceWorldStateKeys ??
              input.evidence
                ?.worldStateKeys,
            ),
        }),
      );
    }

    if (
      input.feedback
    ) {
      const feedbackDetail =
        input.feedback
          .detail
          .trim();

      if (
        !feedbackDetail
      ) {
        throw new Error(
          "cognitiveMemory.feedback.detail must not be empty.",
        );
      }

      runtime.addFeedback(
        createLearningFeedbackObservation({
          id:
            `feedback:${experienceId}`,

          experienceId,

          observedAt:
            recordedAt,

          kind:
            input.feedback
              .kind,

          confidence:
            unitInterval(
              input.feedback
                .confidence,
              1,
              "cognitiveMemory.feedback.confidence",
            ),

          detail:
            feedbackDetail,
        }),
      );
    }

    const evaluation =
      runtime
        .evaluateExperience(
          experienceId,
        );

    if (
      !evaluation
    ) {
      throw new Error(
        `OH-4Y failed to evaluate recorded experience ${experienceId}.`,
      );
    }

    runtime.refreshPatterns();

    const snapshot =
      runtime.snapshot();

    const projectId =
      normalizeOptional(
        input.artifacts
          .projectId,
      );

    const activeProjectPatterns =
      snapshot.patterns
        .filter(
          (pattern) =>
            pattern.scope ===
              "project" &&
            pattern.projectId ===
              projectId,
        );

    const globalPatterns =
      snapshot.patterns
        .filter(
          (pattern) =>
            pattern.scope ===
            "global",
        );

    return {
      version:
        COGNITIVE_MEMORY_VERSION,

      recordedAt,

      experience:
        structuredClone(
          experience,
        ),

      evaluation:
        structuredClone(
          evaluation,
        ),

      patternRefresh: {
        totalPatterns:
          snapshot.patterns
            .length,

        activeProjectPatterns:
          structuredClone(
            activeProjectPatterns,
          ),

        globalPatterns:
          structuredClone(
            globalPatterns,
          ),
      },

      lessonState: {
        totalLessons:
          snapshot.lessons
            .length,

        activeLessons:
          snapshot
            .activeLessons
            .length,

        lessonPromotionPerformed:
          false,
      },

      invariants: {
        directLearnedLessonWrite:
          false,

        automaticLessonPromotion:
          false,

        rawExperienceCanOverrideGovernance:
          false,

        preferenceSeparatedFromOutcome:
          true,

        projectScopePreserved:
          true,
      },
    };
  }
}

const defaultCognitiveMemory =
  new CognitiveMemory();

export function getCognitiveMemory():
  CognitiveMemory {
  return defaultCognitiveMemory;
}