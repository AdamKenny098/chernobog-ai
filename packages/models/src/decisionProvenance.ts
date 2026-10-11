import {
  getChernobogEventBus,
} from "@/lib/chernobog/events";

import type {
  ChernobogEvent,
  ChernobogEventInput,
  ChernobogEventPublishResult,
  ChernobogEventQuery,
} from "@/lib/chernobog/events";

export const DECISION_PROVENANCE_VERSION =
  "oh4aa.v1";

export const DECISION_PROVENANCE_EVENT_TYPE =
  "cognition.decision-provenance.recorded";

export type DecisionProvenanceStage =
  | "interpret"
  | "context"
  | "prompt"
  | "model-route"
  | "strategy-route"
  | "reasoning-contract"
  | "decomposition"
  | "planning"
  | "attention"
  | "orchestration"
  | "verification"
  | "confidence"
  | "escalation"
  | "authority"
  | "action"
  | "memory"
  | "calibration";

export type DecisionProvenanceStageStatus =
  | "selected"
  | "accepted"
  | "rejected"
  | "blocked"
  | "revised"
  | "skipped"
  | "completed"
  | "failed"
  | "observed";

export type DecisionProvenanceOutcomeStatus =
  | "accepted"
  | "rejected"
  | "blocked"
  | "revise"
  | "ready"
  | "executed"
  | "failed";

export interface DecisionProvenanceContextRef {
  id: string;

  kind: string;

  sourceRef?: string;

  selected: boolean;

  reason?: string;

  confidence?: number;

  freshness?: string;
}

export interface DecisionProvenanceStageRecord {
  stage:
    DecisionProvenanceStage;

  version?: string;

  status:
    DecisionProvenanceStageStatus;

  decision?: string;

  reasons: string[];

  evidenceRefs: string[];

  artifactRef?: string;

  metadata?:
    Record<
      string,
      unknown
    >;
}

export interface DecisionProvenanceTask {
  id?: string;

  interpretedIntent:
    string;

  goal:
    string;

  desiredOutcome?:
    string;

  constraints?:
    string[];

  unresolvedQuestions?:
    string[];
}

export interface DecisionProvenanceInput {
  correlationId: string;

  causationId?: string;

  subject?: string;

  scope?: string;

  sensitive?: boolean;

  task:
    DecisionProvenanceTask;

  context:
    DecisionProvenanceContextRef[];

  stages:
    DecisionProvenanceStageRecord[];

  outcome: {
    status:
      DecisionProvenanceOutcomeStatus;

    reason:
      string;

    finalArtifactRef?: string;
  };

  metadata?:
    Record<
      string,
      unknown
    >;
}

export interface DecisionProvenanceRecord {
  version: string;

  id: string;

  recordedAt: string;

  correlationId: string;

  causationId?: string;

  subject?: string;

  scope?: string;

  sensitive: boolean;

  task:
    DecisionProvenanceTask;

  context:
    DecisionProvenanceContextRef[];

  stages:
    DecisionProvenanceStageRecord[];

  outcome:
    DecisionProvenanceInput[
      "outcome"
    ];

  metadata:
    Record<
      string,
      unknown
    >;

  invariants: {
    hiddenScratchReasoningRequired:
      false;

    hiddenScratchReasoningPersisted:
      false;

    routingMutated:
      false;

    authorityMutated:
      false;

    executionStarted:
      false;
  };
}

export interface DecisionProvenanceWriteResult {
  record:
    DecisionProvenanceRecord;

  eventId: string;

  persisted: true;

  deduplicated: boolean;
}

export interface DecisionProvenanceEventAccess {
  publish<TPayload>(
    input:
      ChernobogEventInput<TPayload>,
  ): Promise<
    ChernobogEventPublishResult
  >;

  query(
    query?:
      ChernobogEventQuery,
  ): Promise<
    ChernobogEvent[]
  >;
}

const STAGE_ORDER:
  readonly DecisionProvenanceStage[] = [
    "interpret",
    "context",
    "prompt",
    "model-route",
    "strategy-route",
    "reasoning-contract",
    "decomposition",
    "planning",
    "attention",
    "orchestration",
    "verification",
    "confidence",
    "escalation",
    "authority",
    "action",
    "memory",
    "calibration",
  ] as const;

const FORBIDDEN_METADATA_KEY =
  /(?:chain.?of.?thought|hidden.?reasoning|scratch.?reasoning|private.?reasoning|reasoning.?tokens|cot)/i;

function normalizeRequiredText(
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

function normalizeOptionalText(
  value:
    string
    | undefined,
): string | undefined {
  const normalized =
    value?.trim();

  return normalized ||
    undefined;
}

function normalizeTextList(
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
  ];
}

function unitInterval(
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

function sanitizeUnknown(
  value: unknown,
  depth = 0,
): unknown {
  if (
    depth >
    12
  ) {
    return "[depth-limit]";
  }

  if (
    Array.isArray(
      value,
    )
  ) {
    return value.map(
      (entry) =>
        sanitizeUnknown(
          entry,
          depth +
            1,
        ),
    );
  }

  if (
    value &&
    typeof value ===
      "object"
  ) {
    const output:
      Record<
        string,
        unknown
      > = {};

    for (
      const [
        key,
        entry,
      ]
      of Object.entries(
        value as Record<
          string,
          unknown
        >,
      )
    ) {
      if (
        FORBIDDEN_METADATA_KEY
          .test(
            key,
          )
      ) {
        output[key] =
          "[redacted-by-oh4aa]";

        continue;
      }

      output[key] =
        sanitizeUnknown(
          entry,
          depth +
            1,
        );
    }

    return output;
  }

  if (
    typeof value ===
      "bigint"
  ) {
    return value.toString();
  }

  return value;
}

function jsonSafeObject(
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
  const sanitized =
    sanitizeUnknown(
      value ??
      {},
    );

  try {
    return JSON.parse(
      JSON.stringify(
        sanitized,
      ),
    ) as Record<
      string,
      unknown
    >;
  } catch {
    throw new Error(
      "Decision provenance metadata must be JSON-safe.",
    );
  }
}

function normalizeContext(
  values:
    readonly DecisionProvenanceContextRef[],
): DecisionProvenanceContextRef[] {
  return values
    .map(
      (
        value,
        index,
      ) => ({
        id:
          normalizeRequiredText(
            value.id,
            `context[${index}].id`,
          ),

        kind:
          normalizeRequiredText(
            value.kind,
            `context[${index}].kind`,
          ),

        sourceRef:
          normalizeOptionalText(
            value.sourceRef,
          ),

        selected:
          Boolean(
            value.selected,
          ),

        reason:
          normalizeOptionalText(
            value.reason,
          ),

        confidence:
          unitInterval(
            value.confidence,
            `context[${index}].confidence`,
          ),

        freshness:
          normalizeOptionalText(
            value.freshness,
          ),
      }),
    )
    .sort(
      (
        left,
        right,
      ) =>
        left.id.localeCompare(
          right.id,
        ),
    );
}

function normalizeStages(
  values:
    readonly DecisionProvenanceStageRecord[],
): DecisionProvenanceStageRecord[] {
  const seen =
    new Set<
      DecisionProvenanceStage
    >();

  const normalized =
    values.map(
      (
        value,
        index,
      ) => {
        if (
          seen.has(
            value.stage,
          )
        ) {
          throw new Error(
            `Decision provenance stage "${value.stage}" appears more than once.`,
          );
        }

        seen.add(
          value.stage,
        );

        return {
          stage:
            value.stage,

          version:
            normalizeOptionalText(
              value.version,
            ),

          status:
            value.status,

          decision:
            normalizeOptionalText(
              value.decision,
            ),

          reasons:
            normalizeTextList(
              value.reasons,
            ),

          evidenceRefs:
            normalizeTextList(
              value.evidenceRefs,
            ),

          artifactRef:
            normalizeOptionalText(
              value.artifactRef,
            ),

          metadata:
            jsonSafeObject(
              value.metadata,
            ),
        };
      },
    );

  return normalized.sort(
    (
      left,
      right,
    ) =>
      STAGE_ORDER.indexOf(
        left.stage,
      ) -
      STAGE_ORDER.indexOf(
        right.stage,
      ),
  );
}

function stableValue(
  value: unknown,
): unknown {
  if (
    Array.isArray(
      value,
    )
  ) {
    return value.map(
      stableValue,
    );
  }

  if (
    value &&
    typeof value ===
      "object"
  ) {
    return Object.fromEntries(
      Object.entries(
        value as Record<
          string,
          unknown
        >,
      )
        .sort(
          (
            left,
            right,
          ) =>
            left[0]
              .localeCompare(
                right[0],
              ),
        )
        .map(
          (
            [
              key,
              entry,
            ],
          ) => [
            key,
            stableValue(
              entry,
            ),
          ],
        ),
    );
  }

  return value;
}

function stableStringify(
  value: unknown,
): string {
  return JSON.stringify(
    stableValue(
      value,
    ),
  );
}

function fnv1a64(
  text: string,
): string {
  let hash =
    BigInt(
      "0xcbf29ce484222325",
    );

  const prime =
    BigInt(
      "0x100000001b3",
    );

  const mask =
    BigInt(
      "0xffffffffffffffff",
    );

  for (
    const byte
    of new TextEncoder()
      .encode(
        text,
      )
  ) {
    hash ^=
      BigInt(
        byte,
      );

    hash =
      (
        hash *
        prime
      ) &
      mask;
  }

  return hash
    .toString(
      16,
    )
    .padStart(
      16,
      "0",
    );
}

function normalizeInput(
  input:
    DecisionProvenanceInput,
  now: Date,
): DecisionProvenanceRecord {
  const correlationId =
    normalizeRequiredText(
      input.correlationId,
      "correlationId",
    );

  const task:
    DecisionProvenanceTask = {
      id:
        normalizeOptionalText(
          input.task.id,
        ),

      interpretedIntent:
        normalizeRequiredText(
          input.task
            .interpretedIntent,
          "task.interpretedIntent",
        ),

      goal:
        normalizeRequiredText(
          input.task.goal,
          "task.goal",
        ),

      desiredOutcome:
        normalizeOptionalText(
          input.task
            .desiredOutcome,
        ),

      constraints:
        normalizeTextList(
          input.task
            .constraints,
        ),

      unresolvedQuestions:
        normalizeTextList(
          input.task
            .unresolvedQuestions,
        ),
    };

  const context =
    normalizeContext(
      input.context,
    );

  const stages =
    normalizeStages(
      input.stages,
    );

  const outcome = {
    status:
      input.outcome
        .status,

    reason:
      normalizeRequiredText(
        input.outcome
          .reason,
        "outcome.reason",
      ),

    finalArtifactRef:
      normalizeOptionalText(
        input.outcome
          .finalArtifactRef,
      ),
  };

  const identityMaterial = {
    correlationId,

    causationId:
      normalizeOptionalText(
        input.causationId,
      ),

    task,

    context,

    stages,

    outcome,
  };

  const id =
    `oh4aa:${fnv1a64(stableStringify(identityMaterial))}`;

  return {
    version:
      DECISION_PROVENANCE_VERSION,

    id,

    recordedAt:
      now.toISOString(),

    correlationId,

    causationId:
      normalizeOptionalText(
        input.causationId,
      ),

    subject:
      normalizeOptionalText(
        input.subject,
      ),

    scope:
      normalizeOptionalText(
        input.scope,
      ),

    sensitive:
      input.sensitive ??
      false,

    task,

    context,

    stages,

    outcome,

    metadata:
      jsonSafeObject(
        input.metadata,
      ),

    invariants: {
      hiddenScratchReasoningRequired:
        false,

      hiddenScratchReasoningPersisted:
        false,

      routingMutated:
        false,

      authorityMutated:
        false,

      executionStarted:
        false,
    },
  };
}

function isProvenancePayload(
  value: unknown,
): value is DecisionProvenanceRecord {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return false;
  }

  const record =
    value as Partial<
      DecisionProvenanceRecord
    >;

  return (
    record.version ===
      DECISION_PROVENANCE_VERSION &&
    typeof record.id ===
      "string" &&
    typeof record.correlationId ===
      "string" &&
    Array.isArray(
      record.stages,
    )
  );
}

export class DecisionProvenanceRecorder {
  private readonly access:
    DecisionProvenanceEventAccess;

  private readonly clock:
    () => Date;

  constructor(
    options: {
      access?:
        DecisionProvenanceEventAccess;

      clock?:
        () => Date;
    } = {},
  ) {
    this.access =
      options.access ??
      getChernobogEventBus();

    this.clock =
      options.clock ??
      (() => new Date());
  }

  async record(
    input:
      DecisionProvenanceInput,
  ): Promise<
    DecisionProvenanceWriteResult
  > {
    const record =
      normalizeInput(
        input,
        this.clock(),
      );

    const published =
      await this.access
        .publish({
          type:
            DECISION_PROVENANCE_EVENT_TYPE,

          occurredAt:
            record.recordedAt,

          source: {
            subsystem:
              "cognition.decision-provenance",
          },

          severity:
            record.outcome
              .status ===
                "failed" ||
            record.outcome
              .status ===
                "rejected" ||
            record.outcome
              .status ===
                "blocked"
              ? "warning"
              : "info",

          subject:
            record.subject,

          scope:
            record.scope,

          correlationId:
            record.correlationId,

          causationId:
            record.causationId,

          dedupeKey:
            record.id,

          payload:
            record,

          metadata: {
            confidence:
              undefined,

            tags: [
              "oh4",
              "oh4aa",
              "cognition",
              "decision-provenance",
            ],

            sensitive:
              record.sensitive,
          },
        });

    return {
      record,

      eventId:
        published.event.id,

      persisted:
        true,

      deduplicated:
        published.deduplicated,
    };
  }

  async findByCorrelationId(
    correlationId: string,
    limit = 100,
  ): Promise<
    DecisionProvenanceRecord[]
  > {
    const normalized =
      normalizeRequiredText(
        correlationId,
        "correlationId",
      );

    const events =
      await this.access.query({
        types: [
          DECISION_PROVENANCE_EVENT_TYPE,
        ],

        correlationId:
          normalized,

        newestFirst:
          false,

        limit:
          Math.max(
            1,
            Math.min(
              limit,
              1000,
            ),
          ),
      });

    return events
      .map(
        (event) =>
          event.payload,
      )
      .filter(
        isProvenancePayload,
      )
      .map(
        (record) =>
          structuredClone(
            record,
          ),
      );
  }
}

const defaultDecisionProvenanceRecorder =
  new DecisionProvenanceRecorder();

export function getDecisionProvenanceRecorder():
  DecisionProvenanceRecorder {
  return defaultDecisionProvenanceRecorder;
}