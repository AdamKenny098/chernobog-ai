import {
  getChernobogEventBus,
  publishChernobogEventSafely,
  type ChernobogEvent,
  type ChernobogEventPublisher,
} from "../../../lib/chernobog/events";
import type {
  EvaluationReport,
} from "./evaluation";

export const COGNITIVE_PREFERENCE_EVENT =
  "cognitive.preference.recorded";

export type PreferenceSubjectKind =
  | "model"
  | "strategy"
  | "candidate";

export type PreferenceSignalKind =
  | "rating"
  | "pairwise"
  | "correction"
  | "evaluation";

export interface PreferenceContext {
  taskClass: string;
  scopeKey?: string;
  projectKey?: string;
}

export interface PreferenceSubject {
  kind: PreferenceSubjectKind;
  id: string;
}

export interface PreferenceObservation {
  context: PreferenceContext;
  subject: PreferenceSubject;

  signalKind: PreferenceSignalKind;

  score: number;
  confidence: number;

  comparedAgainst?: PreferenceSubject;
  selected?: boolean;

  source:
    | "explicit-user"
    | "user-correction"
    | "subjective-evaluation"
    | "imported";

  detail?: string;
}

export interface PreferenceEstimate {
  perspective: "subjective";

  context: PreferenceContext;
  subject: PreferenceSubject;

  observationCount: number;
  weightedScore: number | null;
  totalConfidence: number;

  pairwiseWins: number;
  pairwiseLosses: number;

  lastObservedAt?: string;
}

export interface PreferenceQuery {
  taskClass?: string;
  scopeKey?: string;
  projectKey?: string;

  subjectKind?: PreferenceSubjectKind;
  subjectId?: string;

  limit?: number;
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

function normalizeScore(
  value: number,
  field: string,
): number {
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  ) {
    throw new Error(
      `${field} must be between 0 and 1.`,
    );
  }

  return value;
}

function normalizeSubject(
  subject: PreferenceSubject,
): PreferenceSubject {
  return {
    kind:
      subject.kind,
    id:
      requireText(
        subject.id,
        "preference subject id",
      ),
  };
}

function normalizeContext(
  context: PreferenceContext,
): PreferenceContext {
  return {
    taskClass:
      requireText(
        context.taskClass,
        "preference taskClass",
      ),
    scopeKey:
      context.scopeKey
        ?.trim() ||
      undefined,
    projectKey:
      context.projectKey
        ?.trim() ||
      undefined,
  };
}

function normalizeObservation(
  observation: PreferenceObservation,
): PreferenceObservation {
  const subject =
    normalizeSubject(
      observation.subject,
    );

  const comparedAgainst =
    observation.comparedAgainst
      ? normalizeSubject(
          observation.comparedAgainst,
        )
      : undefined;

  if (
    observation.signalKind ===
      "pairwise" &&
    !comparedAgainst
  ) {
    throw new Error(
      "Pairwise preference observations require comparedAgainst.",
    );
  }

  if (
    comparedAgainst &&
    comparedAgainst.kind ===
      subject.kind &&
    comparedAgainst.id ===
      subject.id
  ) {
    throw new Error(
      "Preference subject cannot be compared against itself.",
    );
  }

  return {
    ...structuredClone(
      observation,
    ),
    context:
      normalizeContext(
        observation.context,
      ),
    subject,
    comparedAgainst,
    score:
      normalizeScore(
        observation.score,
        "preference score",
      ),
    confidence:
      normalizeScore(
        observation.confidence,
        "preference confidence",
      ),
    detail:
      observation.detail
        ?.trim() ||
      undefined,
  };
}

export async function recordPreferenceObservation(
  observation: PreferenceObservation,
  correlationId?: string,
  publisher?: ChernobogEventPublisher,
): Promise<void> {
  const normalized =
    normalizeObservation(
      observation,
    );

  await publishChernobogEventSafely(
    {
      type:
        COGNITIVE_PREFERENCE_EVENT,
      source: {
        subsystem:
          "cognition",
        nodeId:
          "preference-learning",
      },
      severity:
        "notice",
      subject:
        `${normalized.subject.kind}:${normalized.subject.id}`,
      scope:
        normalized.context
          .projectKey ??
        normalized.context
          .scopeKey ??
        normalized.context
          .taskClass,
      correlationId,
      payload:
        normalized,
      metadata: {
        tags: [
          "cognitive-preference",
          "subjective",
          normalized.signalKind,
          normalized.subject.kind,
        ],
        sensitive:
          normalized.detail
            ? true
            : undefined,
      },
    },
    publisher,
  );
}

function payloadAsObservation(
  event: ChernobogEvent,
): PreferenceObservation | undefined {
  if (
    event.type !==
      COGNITIVE_PREFERENCE_EVENT ||
    !event.payload ||
    typeof event.payload !==
      "object"
  ) {
    return undefined;
  }

  try {
    return normalizeObservation(
      event.payload as
        PreferenceObservation,
    );
  } catch {
    return undefined;
  }
}

function matchesQuery(
  observation: PreferenceObservation,
  query: PreferenceQuery,
): boolean {
  if (
    query.taskClass &&
    observation.context.taskClass !==
      query.taskClass
  ) {
    return false;
  }

  if (
    query.scopeKey &&
    observation.context.scopeKey !==
      query.scopeKey
  ) {
    return false;
  }

  if (
    query.projectKey &&
    observation.context.projectKey !==
      query.projectKey
  ) {
    return false;
  }

  if (
    query.subjectKind &&
    observation.subject.kind !==
      query.subjectKind
  ) {
    return false;
  }

  if (
    query.subjectId &&
    observation.subject.id !==
      query.subjectId
  ) {
    return false;
  }

  return true;
}

function estimateKey(
  observation: PreferenceObservation,
): string {
  return [
    observation.context.taskClass,
    observation.context.scopeKey ??
      "",
    observation.context.projectKey ??
      "",
    observation.subject.kind,
    observation.subject.id,
  ].join("|");
}

export function buildPreferenceEstimates(
  events: readonly ChernobogEvent[],
  query: PreferenceQuery = {},
): PreferenceEstimate[] {
  const buckets =
    new Map<
      string,
      {
        context: PreferenceContext;
        subject: PreferenceSubject;

        weightedTotal: number;
        totalConfidence: number;
        observationCount: number;

        pairwiseWins: number;
        pairwiseLosses: number;

        lastObservedAt?: string;
      }
    >();

  for (const event of events) {
    const observation =
      payloadAsObservation(
        event,
      );

    if (
      !observation ||
      !matchesQuery(
        observation,
        query,
      )
    ) {
      continue;
    }

    const key =
      estimateKey(
        observation,
      );

    const bucket =
      buckets.get(key) ?? {
        context:
          structuredClone(
            observation.context,
          ),
        subject:
          structuredClone(
            observation.subject,
          ),
        weightedTotal:
          0,
        totalConfidence:
          0,
        observationCount:
          0,
        pairwiseWins:
          0,
        pairwiseLosses:
          0,
        lastObservedAt:
          undefined,
      };

    bucket.observationCount +=
      1;

    bucket.weightedTotal +=
      observation.score *
      observation.confidence;

    bucket.totalConfidence +=
      observation.confidence;

    if (
      observation.signalKind ===
      "pairwise"
    ) {
      if (
        observation.selected ===
        false
      ) {
        bucket.pairwiseLosses +=
          1;
      } else {
        bucket.pairwiseWins +=
          1;
      }
    }

    if (
      !bucket.lastObservedAt ||
      event.occurredAt >
        bucket.lastObservedAt
    ) {
      bucket.lastObservedAt =
        event.occurredAt;
    }

    buckets.set(
      key,
      bucket,
    );
  }

  return [
    ...buckets.values(),
  ]
    .map(
      (
        bucket,
      ): PreferenceEstimate => ({
        perspective:
          "subjective",
        context:
          structuredClone(
            bucket.context,
          ),
        subject:
          structuredClone(
            bucket.subject,
          ),
        observationCount:
          bucket.observationCount,
        weightedScore:
          bucket.totalConfidence >
          0
            ? bucket.weightedTotal /
              bucket.totalConfidence
            : null,
        totalConfidence:
          bucket.totalConfidence,
        pairwiseWins:
          bucket.pairwiseWins,
        pairwiseLosses:
          bucket.pairwiseLosses,
        lastObservedAt:
          bucket.lastObservedAt,
      }),
    )
    .sort(
      (left, right) => {
        const leftScore =
          left.weightedScore ??
          -1;

        const rightScore =
          right.weightedScore ??
          -1;

        if (
          leftScore !==
          rightScore
        ) {
          return (
            rightScore -
            leftScore
          );
        }

        return [
          left.context.taskClass,
          left.subject.kind,
          left.subject.id,
        ]
          .join(":")
          .localeCompare(
            [
              right.context.taskClass,
              right.subject.kind,
              right.subject.id,
            ].join(":"),
          );
      },
    );
}

export async function getPreferenceEstimates(
  query: PreferenceQuery = {},
): Promise<PreferenceEstimate[]> {
  const requestedLimit =
    query.limit ??
    1000;

  const events =
    await getChernobogEventBus()
      .query({
        types: [
          COGNITIVE_PREFERENCE_EVENT,
        ],
        newestFirst:
          false,
        limit:
          Math.max(
            1,
            Math.min(
              1000,
              Math.trunc(
                requestedLimit,
              ),
            ),
          ),
      });

  return buildPreferenceEstimates(
    events,
    query,
  );
}

export async function recordPairwisePreference(
  input: {
    context: PreferenceContext;
    winner: PreferenceSubject;
    loser: PreferenceSubject;
    confidence?: number;
    detail?: string;
    correlationId?: string;
  },
  publisher?: ChernobogEventPublisher,
): Promise<void> {
  const confidence =
    normalizeScore(
      input.confidence ??
      1,
      "preference confidence",
    );

  await recordPreferenceObservation(
    {
      context:
        input.context,
      subject:
        input.winner,
      signalKind:
        "pairwise",
      score:
        1,
      confidence,
      comparedAgainst:
        input.loser,
      selected:
        true,
      source:
        "explicit-user",
      detail:
        input.detail,
    },
    input.correlationId,
    publisher,
  );

  await recordPreferenceObservation(
    {
      context:
        input.context,
      subject:
        input.loser,
      signalKind:
        "pairwise",
      score:
        0,
      confidence,
      comparedAgainst:
        input.winner,
      selected:
        false,
      source:
        "explicit-user",
      detail:
        input.detail,
    },
    input.correlationId,
    publisher,
  );
}

export async function recordPreferenceRating(
  input: {
    context: PreferenceContext;
    subject: PreferenceSubject;
    score: number;
    confidence?: number;
    detail?: string;
    source?:
      PreferenceObservation["source"];
    correlationId?: string;
  },
  publisher?: ChernobogEventPublisher,
): Promise<void> {
  await recordPreferenceObservation(
    {
      context:
        input.context,
      subject:
        input.subject,
      signalKind:
        input.source ===
        "user-correction"
          ? "correction"
          : "rating",
      score:
        input.score,
      confidence:
        input.confidence ??
        1,
      source:
        input.source ??
        "explicit-user",
      detail:
        input.detail,
    },
    input.correlationId,
    publisher,
  );
}

export async function learnPreferencesFromEvaluationReport(
  input: {
    report: EvaluationReport;
    subject: PreferenceSubject;
    scopeKey?: string;
    projectKey?: string;
    correlationId?: string;
  },
  publisher?: ChernobogEventPublisher,
): Promise<number> {
  const subjective =
    input.report.results.filter(
      (result) =>
        result.perspective ===
        "subjective",
    );

  for (
    const result
    of subjective
  ) {
    await recordPreferenceObservation(
      {
        context: {
          taskClass:
            input.report.taskClass,
          scopeKey:
            input.scopeKey,
          projectKey:
            input.projectKey,
        },
        subject:
          input.subject,
        signalKind:
          "evaluation",
        score:
          result.score,
        confidence:
          1,
        source:
          "subjective-evaluation",
        detail:
          result.summary,
      },
      input.correlationId,
      publisher,
    );
  }

  return subjective.length;
}