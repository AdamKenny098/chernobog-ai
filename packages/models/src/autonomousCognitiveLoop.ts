import {
  randomUUID,
} from "node:crypto";

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

import {
  publishChernobogEventSafely,
} from "@/lib/chernobog/events/publishers";

import {
  getFailureRecoveryEngine,
  type FailureRecoveryContext,
  type FailureRecoveryDecision,
  type FailureSignal,
  type RecoveryActionKind,
  type RecoveryAttemptRecord,
  type RecoveryResumeStage,
} from "./failureRecovery";

import type {
  CognitiveProfileName,
} from "./cognitiveProfiles";

export const AUTONOMOUS_COGNITIVE_LOOP_VERSION =
  "oh4ad.v1";

export type AutonomousCognitiveStage =
  | "observe"
  | "interpret"
  | "contextualize"
  | "prioritize"
  | "choose-strategy"
  | "choose-models"
  | "compile-prompt"
  | "reason-plan"
  | "validate"
  | "authorize"
  | "act"
  | "verify"
  | "record"
  | "learn";

export type AutonomousCognitiveLoopStatus =
  | "created"
  | "running"
  | "waiting-human"
  | "interrupted"
  | "recovering"
  | "completed"
  | "failed"
  | "stopped";

export type AutonomousCognitiveStageStatus =
  | "pending"
  | "running"
  | "completed"
  | "waiting-human"
  | "failed"
  | "skipped";

export type AutonomousCognitiveStageResult =
  | {
      status:
        "completed"
        | "skipped";

      artifact?:
        unknown;

      notes?:
        string[];
    }
  | {
      status:
        "waiting-human";

      artifact?:
        unknown;

      questions:
        string[];

      reason: string;
    }
  | {
      status:
        "failed";

      artifact?:
        unknown;

      error: string;

      failure?:
        Partial<
          FailureSignal
        >;

      recoveryContext?:
        Partial<
          FailureRecoveryContext
        >;
    };

export interface AutonomousCognitiveLoopInput {
  rawInput: unknown;

  profile?:
    CognitiveProfileName;

  subject?: string;

  scope?: string;

  correlationId?: string;

  metadata?:
    Record<
      string,
      unknown
    >;
}

export interface AutonomousCognitiveStageState {
  stage:
    AutonomousCognitiveStage;

  componentBinding:
    string[];

  status:
    AutonomousCognitiveStageStatus;

  attempts: number;

  startedAt?: string;

  completedAt?: string;

  error?: string;

  notes: string[];
}

export interface AutonomousCognitiveHumanIntervention {
  at: string;

  stage:
    AutonomousCognitiveStage;

  input: unknown;
}

export interface AutonomousCognitiveRecoveryRecord {
  at: string;

  failedStage:
    AutonomousCognitiveStage;

  failureFingerprint:
    string;

  action:
    RecoveryActionKind;

  resumeStage:
    RecoveryResumeStage;

  resumedAtStage?:
    AutonomousCognitiveStage;

  summary: string;
}

export interface AutonomousCognitiveLoopState {
  version: string;

  id: string;

  createdAt: string;

  updatedAt: string;

  status:
    AutonomousCognitiveLoopStatus;

  input:
    AutonomousCognitiveLoopInput;

  currentStageIndex: number;

  stages:
    AutonomousCognitiveStageState[];

  artifacts:
    Partial<
      Record<
        AutonomousCognitiveStage,
        unknown
      >
    >;

  supersededArtifacts:
    Partial<
      Record<
        AutonomousCognitiveStage,
        unknown[]
      >
    >;

  humanInterventions:
    AutonomousCognitiveHumanIntervention[];

  waitingForHuman?: {
    stage:
      AutonomousCognitiveStage;

    reason: string;

    questions:
      string[];

    recoveryDriven:
      boolean;
  };

  interruption?: {
    at: string;

    reason: string;

    stage:
      AutonomousCognitiveStage;
  };

  recoveries:
    AutonomousCognitiveRecoveryRecord[];

  totalStageExecutions: number;

  terminalReason?: string;

  invariants: {
    authorityBypassed: false;

    directToolExecutionByLoop:
      false;

    directModelExecutionByLoop:
      false;

    hiddenScratchReasoningRequired:
      false;

    completedWorkSilentlyDiscarded:
      false;

    unsafePostActionRewindAllowed:
      false;
  };
}

export interface AutonomousCognitiveStageContext {
  loopId: string;

  stage:
    AutonomousCognitiveStage;

  input:
    AutonomousCognitiveLoopInput;

  artifacts:
    Readonly<
      Partial<
        Record<
          AutonomousCognitiveStage,
          unknown
        >
      >
    >;

  stageStates:
    readonly AutonomousCognitiveStageState[];

  humanInput?:
    unknown;

  recoveryHistory:
    readonly AutonomousCognitiveRecoveryRecord[];

  signal:
    AbortSignal;
}

export type AutonomousCognitiveStageHandler =
  (
    context:
      AutonomousCognitiveStageContext,
  ) =>
    | Promise<
        AutonomousCognitiveStageResult
      >
    | AutonomousCognitiveStageResult;

export type AutonomousCognitiveLoopHandlers =
  Record<
    AutonomousCognitiveStage,
    AutonomousCognitiveStageHandler
  >;

export interface AutonomousCognitiveLoopPolicy {
  maxStageExecutions: number;

  maxRecoveryAttempts: number;
}

export interface AutonomousCognitiveLoopEvent {
  type: string;

  loopId: string;

  stage?:
    AutonomousCognitiveStage;

  status:
    AutonomousCognitiveLoopStatus
    | AutonomousCognitiveStageStatus;

  detail?: string;
}

export type AutonomousCognitiveLoopEventPublisher =
  (
    event:
      AutonomousCognitiveLoopEvent,
    state:
      AutonomousCognitiveLoopState,
  ) =>
    | Promise<void>
    | void;

export interface AutonomousCognitiveLoopStore {
  save(
    state:
      AutonomousCognitiveLoopState,
  ): Promise<void>;

  load(
    id: string,
  ): Promise<
    AutonomousCognitiveLoopState
  >;
}

export interface AutonomousCognitiveRunOptions {
  shouldInterrupt?:
    (
      state:
        AutonomousCognitiveLoopState,
    ) =>
      | boolean
      | Promise<boolean>;
}

export interface AutonomousCognitiveResumeOptions
  extends AutonomousCognitiveRunOptions {
  humanInput?: unknown;
}

export const AUTONOMOUS_COGNITIVE_STAGE_ORDER:
  readonly AutonomousCognitiveStage[] = [
    "observe",
    "interpret",
    "contextualize",
    "prioritize",
    "choose-strategy",
    "choose-models",
    "compile-prompt",
    "reason-plan",
    "validate",
    "authorize",
    "act",
    "verify",
    "record",
    "learn",
  ] as const;

export const AUTONOMOUS_COGNITIVE_STAGE_BINDINGS:
  Readonly<
    Record<
      AutonomousCognitiveStage,
      readonly string[]
    >
  > = {
    observe: [
      "Core cognitiveRuntime / World State",
    ],

    interpret: [
      "OH-4J Input Interpreter",
    ],

    contextualize: [
      "OH-4K Context Engine",
    ],

    prioritize: [
      "OH-4R Priority / Attention Engine",
    ],

    "choose-strategy": [
      "OH-4N Strategy Router",
      "OH-4AC Cognitive Profiles",
    ],

    "choose-models": [
      "OH-4M Model Router",
      "OH-4Z Continuous Calibration",
      "OH-4AC Cognitive Profiles",
    ],

    "compile-prompt": [
      "OH-4L Prompt Compiler",
    ],

    "reason-plan": [
      "OH-4O Reasoning Contracts",
      "OH-4P Goal Decomposer",
      "OH-4Q Planning Engine",
      "OH-4S Multi-Model Orchestrator",
    ],

    validate: [
      "OH-4T Critic & Verification Layer",
      "OH-4U Confidence Engine",
      "OH-4V Escalation Engine",
    ],

    authorize: [
      "OH-4W Authority Bridge",
    ],

    act: [
      "OH-4X Action Bridge",
      "Existing Execution Runtime",
      "Unified Tool Gateway",
    ],

    verify: [
      "OH-4T post-action verification",
    ],

    record: [
      "OH-4AA Decision Provenance",
      "OH-4Y Cognitive Memory",
    ],

    learn: [
      "OH-4Z Continuous Calibration",
      "Existing governed learning pipeline",
    ],
  };

export const DEFAULT_AUTONOMOUS_COGNITIVE_LOOP_POLICY:
  AutonomousCognitiveLoopPolicy = {
    maxStageExecutions:
      80,

    maxRecoveryAttempts:
      8,
  };

const TERMINAL_STATUSES =
  new Set<
    AutonomousCognitiveLoopStatus
  >([
    "completed",
    "failed",
    "stopped",
  ]);

function nowIso(
  clock:
    () => Date,
): string {
  return clock()
    .toISOString();
}

function normalizeText(
  value:
    string
    | undefined,
): string | undefined {
  const normalized =
    value?.trim();

  return normalized ||
    undefined;
}

function requirePositiveInteger(
  value: number,
  field: string,
): number {
  if (
    !Number.isInteger(
      value,
    ) ||
    value < 1
  ) {
    throw new Error(
      `${field} must be a positive integer.`,
    );
  }

  return value;
}

function normalizePolicy(
  value:
    Partial<
      AutonomousCognitiveLoopPolicy
    >
    | undefined,
): AutonomousCognitiveLoopPolicy {
  const merged = {
    ...DEFAULT_AUTONOMOUS_COGNITIVE_LOOP_POLICY,
    ...(
      value ??
      {}
    ),
  };

  return {
    maxStageExecutions:
      requirePositiveInteger(
        merged
          .maxStageExecutions,
        "autonomousLoop.maxStageExecutions",
      ),

    maxRecoveryAttempts:
      requirePositiveInteger(
        merged
          .maxRecoveryAttempts,
        "autonomousLoop.maxRecoveryAttempts",
      ),
  };
}

function jsonSafe(
  value: unknown,
): unknown {
  try {
    return JSON.parse(
      JSON.stringify(
        value,
      ),
    );
  } catch {
    throw new Error(
      "OH-4AD loop state/artifacts must be JSON-safe.",
    );
  }
}

function stageIndex(
  stage:
    AutonomousCognitiveStage,
): number {
  return AUTONOMOUS_COGNITIVE_STAGE_ORDER
    .indexOf(
      stage,
    );
}

function currentStage(
  state:
    AutonomousCognitiveLoopState,
): AutonomousCognitiveStage {
  return (
    AUTONOMOUS_COGNITIVE_STAGE_ORDER[
      Math.min(
        state.currentStageIndex,
        AUTONOMOUS_COGNITIVE_STAGE_ORDER
          .length -
        1,
      )
    ] ??
    "learn"
  );
}

function isTerminal(
  state:
    AutonomousCognitiveLoopState,
): boolean {
  return TERMINAL_STATUSES
    .has(
      state.status,
    );
}

function cloneState(
  state:
    AutonomousCognitiveLoopState,
): AutonomousCognitiveLoopState {
  return structuredClone(
    state,
  );
}

function normalizeQuestions(
  values:
    readonly string[],
): string[] {
  return [
    ...new Set(
      values
        .map(
          (value) =>
            value.trim(),
        )
        .filter(Boolean),
    ),
  ];
}

function normalizeNotes(
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

function recoveryResumeToStage(
  resumeStage:
    RecoveryResumeStage,
  action:
    RecoveryActionKind,
  failedStage:
    AutonomousCognitiveStage,
): AutonomousCognitiveStage | undefined {
  if (
    action ===
      "retry-tool" ||
    action ===
      "resume-from-checkpoint"
  ) {
    return "act";
  }

  switch (
    resumeStage
  ) {
    case "context":
      return "contextualize";

    case "prompt":
      return "compile-prompt";

    case "model-route":
      return "choose-models";

    case "planning":
    case "orchestration":
      return "reason-plan";

    case "verification":
      return failedStage ===
        "verify"
        ? "verify"
        : "validate";

    case "authority":
      return "authorize";

    case "action":
      return "act";

    case "human":
    case "stop":
      return undefined;
  }
}

function recoveryAttemptsForEngine(
  state:
    AutonomousCognitiveLoopState,
): RecoveryAttemptRecord[] {
  return state.recoveries
    .map(
      (
        recovery,
        index,
      ) => ({
        attempt:
          index +
          1,

        action:
          recovery.action,

        failureFingerprint:
          recovery
            .failureFingerprint,

        completed:
          true,

        succeeded:
          false,

        occurredAt:
          recovery.at,
      }),
    );
}

function createStageStates():
  AutonomousCognitiveStageState[] {
  return AUTONOMOUS_COGNITIVE_STAGE_ORDER
    .map(
      (stage) => ({
        stage,

        componentBinding: [
          ...AUTONOMOUS_COGNITIVE_STAGE_BINDINGS[
            stage
          ],
        ],

        status:
          "pending",

        attempts:
          0,

        notes:
          [],
      }),
    );
}

function createLoopState(
  input:
    AutonomousCognitiveLoopInput,
  clock:
    () => Date,
): AutonomousCognitiveLoopState {
  const createdAt =
    nowIso(
      clock,
    );

  return {
    version:
      AUTONOMOUS_COGNITIVE_LOOP_VERSION,

    id:
      `oh4ad-${randomUUID()}`,

    createdAt,

    updatedAt:
      createdAt,

    status:
      "created",

    input: {
      ...jsonSafe(
        input,
      ) as
        AutonomousCognitiveLoopInput,

      subject:
        normalizeText(
          input.subject,
        ),

      scope:
        normalizeText(
          input.scope,
        ),

      correlationId:
        normalizeText(
          input.correlationId,
        ),
    },

    currentStageIndex:
      0,

    stages:
      createStageStates(),

    artifacts:
      {},

    supersededArtifacts:
      {},

    humanInterventions:
      [],

    recoveries:
      [],

    totalStageExecutions:
      0,

    invariants: {
      authorityBypassed:
        false,

      directToolExecutionByLoop:
        false,

      directModelExecutionByLoop:
        false,

      hiddenScratchReasoningRequired:
        false,

      completedWorkSilentlyDiscarded:
        false,

      unsafePostActionRewindAllowed:
        false,
    },
  };
}

function recordArtifact(
  state:
    AutonomousCognitiveLoopState,
  stage:
    AutonomousCognitiveStage,
  artifact:
    unknown,
): void {
  if (
    artifact ===
    undefined
  ) {
    return;
  }

  const safe =
    jsonSafe(
      artifact,
    );

  if (
    state.artifacts[
      stage
    ] !==
    undefined
  ) {
    const history =
      state
        .supersededArtifacts[
          stage
        ] ??
      [];

    history.push(
      state.artifacts[
        stage
      ],
    );

    state.supersededArtifacts[
      stage
    ] =
      history;
  }

  state.artifacts[
    stage
  ] =
    safe;
}

function resetFromStage(
  state:
    AutonomousCognitiveLoopState,
  resumeStage:
    AutonomousCognitiveStage,
): void {
  const start =
    stageIndex(
      resumeStage,
    );

  for (
    let index =
      start;
    index <
      state.stages.length;
    index +=
      1
  ) {
    const stageState =
      state.stages[
        index
      ];

    if (
      !stageState
    ) {
      continue;
    }

    if (
      state.artifacts[
        stageState.stage
      ] !==
      undefined
    ) {
      const history =
        state
          .supersededArtifacts[
            stageState.stage
          ] ??
        [];

      history.push(
        state.artifacts[
          stageState.stage
        ],
      );

      state
        .supersededArtifacts[
          stageState.stage
        ] =
        history;

      delete state
        .artifacts[
          stageState.stage
        ];
    }

    stageState.status =
      "pending";

    stageState.startedAt =
      undefined;

    stageState.completedAt =
      undefined;

    stageState.error =
      undefined;
  }

  state.currentStageIndex =
    start;
}

function hasPassedAct(
  state:
    AutonomousCognitiveLoopState,
): boolean {
  const act =
    state.stages[
      stageIndex(
        "act",
      )
    ];

  return (
    act?.status ===
      "completed" ||
    act?.status ===
      "skipped"
  );
}

function safePostActionRecovery(
  decision:
    FailureRecoveryDecision,
  state:
    AutonomousCognitiveLoopState,
  failedStage:
    AutonomousCognitiveStage,
  recoveryContext:
    Partial<
      FailureRecoveryContext
    >,
): boolean {
  if (
    !hasPassedAct(
      state,
    ) &&
    stageIndex(
      failedStage,
    ) <=
      stageIndex(
        "act",
      )
  ) {
    return true;
  }

  if (
    decision.selected
      .action ===
        "retry-tool" ||
    decision.selected
      .action ===
        "resume-from-checkpoint"
  ) {
    const partial =
      recoveryContext
        .partialExecution;

    return Boolean(
      partial
        ?.resumable &&
      partial
        .checkpointRef &&
      (
        !partial
          .sideEffectsObserved ||
        partial
          .idempotencyKey
      ),
    );
  }

  if (
    decision.selected
      .action ===
      "invoke-critic" &&
    failedStage ===
      "verify"
  ) {
    return true;
  }

  return (
    decision.selected
      .resumeStage ===
      "human" ||
    decision.selected
      .resumeStage ===
      "stop"
  );
}

export class JsonAutonomousCognitiveLoopStore
  implements AutonomousCognitiveLoopStore {
  constructor(
    private readonly directory =
      join(
        process.cwd(),
        ".chernobog",
        "cognition",
        "autonomous-loop",
      ),
  ) {}

  async save(
    state:
      AutonomousCognitiveLoopState,
  ): Promise<void> {
    const safe =
      jsonSafe(
        state,
      );

    const target =
      this.pathFor(
        state.id,
      );

    await mkdir(
      dirname(
        target,
      ),
      {
        recursive:
          true,
      },
    );

    const temporary =
      `${target}.${process.pid}.tmp`;

    await writeFile(
      temporary,
      `${JSON.stringify(safe, null, 2)}\n`,
      "utf8",
    );

    await rename(
      temporary,
      target,
    );
  }

  async load(
    id: string,
  ): Promise<
    AutonomousCognitiveLoopState
  > {
    const raw =
      await readFile(
        this.pathFor(
          id,
        ),
        "utf8",
      );

    const parsed =
      JSON.parse(
        raw,
      ) as
        AutonomousCognitiveLoopState;

    if (
      parsed.version !==
      AUTONOMOUS_COGNITIVE_LOOP_VERSION
    ) {
      throw new Error(
        `Unsupported OH-4AD loop state version: ${String(parsed.version)}`,
      );
    }

    return cloneState(
      parsed,
    );
  }

  private pathFor(
    id: string,
  ): string {
    if (
      !/^oh4ad-[a-zA-Z0-9-]+$/
        .test(
          id,
        )
    ) {
      throw new Error(
        "Invalid OH-4AD loop id.",
      );
    }

    return join(
      this.directory,
      `${id}.json`,
    );
  }
}

async function defaultEventPublisher(
  event:
    AutonomousCognitiveLoopEvent,
  state:
    AutonomousCognitiveLoopState,
): Promise<void> {
  await publishChernobogEventSafely({
    type:
      event.type,

    source: {
      subsystem:
        "cognition.autonomous-loop",
    },

    severity:
      event.status ===
        "failed" ||
      event.status ===
        "stopped"
        ? "warning"
        : event.status ===
            "waiting-human" ||
          event.status ===
            "interrupted"
          ? "notice"
          : "info",

    subject:
      state.input
        .subject ??
      state.id,

    scope:
      state.input
        .scope ??
      "cognition:oh4ad",

    correlationId:
      state.input
        .correlationId ??
      state.id,

    causationId:
      event.stage
        ? `${state.id}:${event.stage}`
        : undefined,

    payload: {
      loopId:
        state.id,

      stage:
        event.stage,

      status:
        event.status,

      detail:
        event.detail,

      currentStageIndex:
        state.currentStageIndex,

      totalStageExecutions:
        state
          .totalStageExecutions,

      recoveryCount:
        state.recoveries
          .length,
    },

    metadata: {
      tags: [
        "oh4",
        "oh4ad",
        "autonomous-cognitive-loop",
        ...(
          event.stage
            ? [
                event.stage,
              ]
            : []
        ),
      ],
    },
  });
}

export class AutonomousCognitiveLoop {
  private readonly policy:
    AutonomousCognitiveLoopPolicy;

  private readonly store:
    AutonomousCognitiveLoopStore;

  private readonly clock:
    () => Date;

  private readonly eventPublisher:
    AutonomousCognitiveLoopEventPublisher;

  constructor(
    private readonly handlers:
      AutonomousCognitiveLoopHandlers,

    options: {
      policy?:
        Partial<
          AutonomousCognitiveLoopPolicy
        >;

      store?:
        AutonomousCognitiveLoopStore;

      clock?:
        () => Date;

      eventPublisher?:
        AutonomousCognitiveLoopEventPublisher;
    } = {},
  ) {
    this.policy =
      normalizePolicy(
        options.policy,
      );

    this.store =
      options.store ??
      new JsonAutonomousCognitiveLoopStore();

    this.clock =
      options.clock ??
      (() => new Date());

    this.eventPublisher =
      options.eventPublisher ??
      defaultEventPublisher;

    for (
      const stage
      of AUTONOMOUS_COGNITIVE_STAGE_ORDER
    ) {
      if (
        typeof this.handlers[
          stage
        ] !==
        "function"
      ) {
        throw new Error(
          `OH-4AD requires a stage adapter for "${stage}".`,
        );
      }
    }
  }

  async create(
    input:
      AutonomousCognitiveLoopInput,
  ): Promise<
    AutonomousCognitiveLoopState
  > {
    const state =
      createLoopState(
        input,
        this.clock,
      );

    await this.persist(
      state,
    );

    await this.emit(
      {
        type:
          "cognition.autonomous-loop.created",

        loopId:
          state.id,

        status:
          state.status,
      },
      state,
    );

    return cloneState(
      state,
    );
  }

  async start(
    input:
      AutonomousCognitiveLoopInput,
    options:
      AutonomousCognitiveRunOptions =
      {},
  ): Promise<
    AutonomousCognitiveLoopState
  > {
    const state =
      await this.create(
        input,
      );

    return this.run(
      state.id,
      options,
    );
  }

  async load(
    id: string,
  ): Promise<
    AutonomousCognitiveLoopState
  > {
    return this.store
      .load(
        id,
      );
  }

  async run(
    id: string,
    options:
      AutonomousCognitiveRunOptions =
      {},
  ): Promise<
    AutonomousCognitiveLoopState
  > {
    let state =
      await this.store
        .load(
          id,
        );

    if (
      isTerminal(
        state,
      )
    ) {
      return state;
    }

    if (
      state.status ===
        "waiting-human"
    ) {
      return state;
    }

    if (
      state.status ===
        "interrupted"
    ) {
      return state;
    }

    state.status =
      "running";

    state.updatedAt =
      nowIso(
        this.clock,
      );

    await this.persist(
      state,
    );

    while (
      state.currentStageIndex <
      AUTONOMOUS_COGNITIVE_STAGE_ORDER
        .length
    ) {
      if (
        state.totalStageExecutions >=
        this.policy
          .maxStageExecutions
      ) {
        state.status =
          "stopped";

        state.terminalReason =
          `OH-4AD exceeded max stage execution limit of ${this.policy.maxStageExecutions}.`;

        await this.persist(
          state,
        );

        await this.emit(
          {
            type:
              "cognition.autonomous-loop.stopped",

            loopId:
              state.id,

            status:
              "stopped",

            detail:
              state
                .terminalReason,
          },
          state,
        );

        return cloneState(
          state,
        );
      }

      if (
        await options
          .shouldInterrupt?.(
            cloneState(
              state,
            ),
          )
      ) {
        return this.interrupt(
          state.id,
          "External interruption requested.",
        );
      }

      const stage =
        AUTONOMOUS_COGNITIVE_STAGE_ORDER[
          state.currentStageIndex
        ];

      if (!stage) {
        break;
      }

      const stageState =
        state.stages[
          state.currentStageIndex
        ];

      if (!stageState) {
        throw new Error(
          `Missing OH-4AD stage state at index ${state.currentStageIndex}.`,
        );
      }

      if (
        stageState.status ===
          "completed" ||
        stageState.status ===
          "skipped"
      ) {
        state.currentStageIndex +=
          1;

        continue;
      }

      stageState.status =
        "running";

      stageState.attempts +=
        1;

      stageState.startedAt =
        nowIso(
          this.clock,
        );

      stageState.error =
        undefined;

      state.totalStageExecutions +=
        1;

      state.updatedAt =
        stageState.startedAt;

      await this.persist(
        state,
      );

      await this.emit(
        {
          type:
            "cognition.autonomous-loop.stage.started",

          loopId:
            state.id,

          stage,

          status:
            "running",
        },
        state,
      );

      const controller =
        new AbortController();

      const humanInput =
        state
          .humanInterventions
          .filter(
            (entry) =>
              entry.stage ===
              stage,
          )
          .at(
            -1,
          )
          ?.input;

      let result:
        AutonomousCognitiveStageResult;

      try {
        result =
          await this.handlers[
            stage
          ]({
            loopId:
              state.id,

            stage,

            input:
              structuredClone(
                state.input,
              ),

            artifacts:
              structuredClone(
                state.artifacts,
              ),

            stageStates:
              structuredClone(
                state.stages,
              ),

            humanInput:
              humanInput ===
                undefined
                ? undefined
                : structuredClone(
                    humanInput,
                  ),

            recoveryHistory:
              structuredClone(
                state.recoveries,
              ),

            signal:
              controller.signal,
          });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : String(
                error,
              );

        result = {
          status:
            "failed",

          error:
            message,

          failure: {
            kind:
              "unknown",

            message,
          },
        };
      }

      recordArtifact(
        state,
        stage,
        result.artifact,
      );

      if (
        result.status ===
          "completed" ||
        result.status ===
          "skipped"
      ) {
        stageState.status =
          result.status;

        stageState.completedAt =
          nowIso(
            this.clock,
          );

        stageState.notes = [
          ...stageState
            .notes,
          ...normalizeNotes(
            result.notes,
          ),
        ];

        state.currentStageIndex +=
          1;

        state.updatedAt =
          stageState
            .completedAt;

        await this.persist(
          state,
        );

        await this.emit(
          {
            type:
              "cognition.autonomous-loop.stage.completed",

            loopId:
              state.id,

            stage,

            status:
              result.status,
          },
          state,
        );

        continue;
      }

      if (
        result.status ===
        "waiting-human"
      ) {
        const questions =
          normalizeQuestions(
            result.questions,
          );

        stageState.status =
          "waiting-human";

        stageState.error =
          undefined;

        state.status =
          "waiting-human";

        state.waitingForHuman = {
          stage,

          reason:
            result.reason
              .trim() ||
            "Human intervention is required.",

          questions,

          recoveryDriven:
            false,
        };

        state.updatedAt =
          nowIso(
            this.clock,
          );

        await this.persist(
          state,
        );

        await this.emit(
          {
            type:
              "cognition.autonomous-loop.waiting-human",

            loopId:
              state.id,

            stage,

            status:
              "waiting-human",

            detail:
              state
                .waitingForHuman
                .reason,
          },
          state,
        );

        return cloneState(
          state,
        );
      }

      if (
        result.status !==
        "failed"
      ) {
        throw new Error(
          `OH-4AD stage "${stage}" returned an unsupported result status.`,
        );
      }

      state =
        await this.handleFailure(
          state,
          stage,
          result,
        );

      if (
        state.status ===
          "waiting-human" ||
        state.status ===
          "stopped" ||
        state.status ===
          "failed"
      ) {
        return cloneState(
          state,
        );
      }
    }

    state.status =
      "completed";

    state.currentStageIndex =
      AUTONOMOUS_COGNITIVE_STAGE_ORDER
        .length;

    state.updatedAt =
      nowIso(
        this.clock,
      );

    await this.persist(
      state,
    );

    await this.emit(
      {
        type:
          "cognition.autonomous-loop.completed",

        loopId:
          state.id,

        status:
          "completed",
      },
      state,
    );

    return cloneState(
      state,
    );
  }

  async interrupt(
    id: string,
    reason:
      string,
  ): Promise<
    AutonomousCognitiveLoopState
  > {
    const state =
      await this.store
        .load(
          id,
        );

    if (
      isTerminal(
        state,
      )
    ) {
      return state;
    }

    const stage =
      currentStage(
        state,
      );

    state.status =
      "interrupted";

    state.interruption = {
      at:
        nowIso(
          this.clock,
        ),

      reason:
        normalizeText(
          reason,
        ) ??
        "Interrupted.",

      stage,
    };

    state.updatedAt =
      state
        .interruption
        .at;

    const stageState =
      state.stages[
        stageIndex(
          stage,
        )
      ];

    if (
      stageState
        ?.status ===
        "running"
    ) {
      stageState.status =
        "pending";
    }

    await this.persist(
      state,
    );

    await this.emit(
      {
        type:
          "cognition.autonomous-loop.interrupted",

        loopId:
          state.id,

        stage,

        status:
          "interrupted",

        detail:
          state
            .interruption
            .reason,
      },
      state,
    );

    return cloneState(
      state,
    );
  }

  async resume(
    id: string,
    options:
      AutonomousCognitiveResumeOptions =
      {},
  ): Promise<
    AutonomousCognitiveLoopState
  > {
    const state =
      await this.store
        .load(
          id,
        );

    if (
      isTerminal(
        state,
      )
    ) {
      return state;
    }

    if (
      state.status ===
        "waiting-human"
    ) {
      if (
        options.humanInput ===
        undefined
      ) {
        throw new Error(
          "OH-4AD loop is waiting for human intervention; humanInput is required to resume.",
        );
      }

      const stage =
        state
          .waitingForHuman
          ?.stage ??
        currentStage(
          state,
        );

      state
        .humanInterventions
        .push({
          at:
            nowIso(
              this.clock,
            ),

          stage,

          input:
            jsonSafe(
              options.humanInput,
            ),
        });

      const stageState =
        state.stages[
          stageIndex(
            stage,
          )
        ];

      if (
        stageState
      ) {
        stageState.status =
          "pending";

        stageState.error =
          undefined;
      }

      state.waitingForHuman =
        undefined;
    }

    if (
      state.status ===
        "interrupted"
    ) {
      const stage =
        state
          .interruption
          ?.stage ??
        currentStage(
          state,
        );

      const stageState =
        state.stages[
          stageIndex(
            stage,
          )
        ];

      if (
        stageState &&
        stageState.status !==
          "completed" &&
        stageState.status !==
          "skipped"
      ) {
        stageState.status =
          "pending";
      }

      state.interruption =
        undefined;
    }

    state.status =
      "running";

    state.updatedAt =
      nowIso(
        this.clock,
      );

    await this.persist(
      state,
    );

    return this.run(
      id,
      options,
    );
  }

  private async handleFailure(
    state:
      AutonomousCognitiveLoopState,
    failedStage:
      AutonomousCognitiveStage,
    result:
      Extract<
        AutonomousCognitiveStageResult,
        {
          status:
            "failed";
        }
      >,
  ): Promise<
    AutonomousCognitiveLoopState
  > {
    const failedState =
      state.stages[
        stageIndex(
          failedStage,
        )
      ];

    if (
      failedState
    ) {
      failedState.status =
        "failed";

      failedState.error =
        result.error;

      failedState.completedAt =
        nowIso(
          this.clock,
        );
    }

    await this.emit(
      {
        type:
          "cognition.autonomous-loop.stage.failed",

        loopId:
          state.id,

        stage:
          failedStage,

        status:
          "failed",

        detail:
          result.error,
      },
      state,
    );

    if (
      state.recoveries
        .length >=
      this.policy
        .maxRecoveryAttempts
    ) {
      state.status =
        "stopped";

      state.terminalReason =
        `OH-4AD exceeded max recovery attempt limit of ${this.policy.maxRecoveryAttempts}.`;

      await this.persist(
        state,
      );

      return state;
    }

    const recoveryContext:
      FailureRecoveryContext = {
        attemptCount:
          state.recoveries
            .length,

        maxAttempts:
          this.policy
            .maxRecoveryAttempts,

        recentAttempts:
          recoveryAttemptsForEngine(
            state,
          ),

        humanAvailable:
          true,

        ...(
          result.recoveryContext ??
          {}
        ),
      };

    const failure:
      FailureSignal = {
        id:
          result.failure
            ?.id ??
          `${state.id}:${failedStage}:${failedState?.attempts ?? 1}`,

        kind:
          result.failure
            ?.kind ??
          "unknown",

        occurredAt:
          result.failure
            ?.occurredAt ??
          nowIso(
            this.clock,
          ),

        stage:
          result.failure
            ?.stage ??
          failedStage,

        source:
          result.failure
            ?.source ??
          "oh4ad",

        message:
          result.failure
            ?.message ??
          result.error,

        transient:
          result.failure
            ?.transient,

        retryable:
          result.failure
            ?.retryable,

        failureFingerprint:
          result.failure
            ?.failureFingerprint,

        modelId:
          result.failure
            ?.modelId,

        toolName:
          result.failure
            ?.toolName,

        evidenceRefs:
          result.failure
            ?.evidenceRefs,
      };

    const decision =
      getFailureRecoveryEngine()
        .decide({
          failure,

          context:
            recoveryContext,

          policy: {
            maxAttempts:
              this.policy
                .maxRecoveryAttempts,
          },
        });

    const safe =
      safePostActionRecovery(
        decision,
        state,
        failedStage,
        recoveryContext,
      );

    if (!safe) {
      state.status =
        "waiting-human";

      state.waitingForHuman = {
        stage:
          failedStage,

        reason:
          "Automatic recovery would rewind across a completed action without explicit safe replay/resume evidence.",

        questions: [
          "An external or side-effecting action may already have occurred. Review the current state and choose whether to continue, repair manually, or stop.",
        ],

        recoveryDriven:
          true,
      };

      state.updatedAt =
        nowIso(
          this.clock,
        );

      await this.persist(
        state,
      );

      await this.emit(
        {
          type:
            "cognition.autonomous-loop.waiting-human",

          loopId:
            state.id,

          stage:
            failedStage,

          status:
            "waiting-human",

          detail:
            state
              .waitingForHuman
              .reason,
        },
        state,
      );

      return state;
    }

    const mappedStage =
      recoveryResumeToStage(
        decision.selected
          .resumeStage,
        decision.selected
          .action,
        failedStage,
      );

    state.recoveries
      .push({
        at:
          nowIso(
            this.clock,
          ),

        failedStage,

        failureFingerprint:
          decision.failure
            .fingerprint,

        action:
          decision.selected
            .action,

        resumeStage:
          decision.selected
            .resumeStage,

        resumedAtStage:
          mappedStage,

        summary:
          decision.selected
            .summary,
      });

    if (
      decision.selected
        .action ===
        "request-human-clarification"
    ) {
      state.status =
        "waiting-human";

      state.waitingForHuman = {
        stage:
          failedStage,

        reason:
          decision.selected
            .summary,

        questions: [
          decision.selected
            .summary,
        ],

        recoveryDriven:
          true,
      };

      state.updatedAt =
        nowIso(
          this.clock,
        );

      await this.persist(
        state,
      );

      return state;
    }

    if (
      decision.selected
        .action ===
        "stop-safely" ||
      !mappedStage
    ) {
      state.status =
        "stopped";

      state.terminalReason =
        decision.selected
          .summary;

      state.updatedAt =
        nowIso(
          this.clock,
        );

      await this.persist(
        state,
      );

      return state;
    }

    resetFromStage(
      state,
      mappedStage,
    );

    state.status =
      "recovering";

    state.updatedAt =
      nowIso(
        this.clock,
      );

    await this.persist(
      state,
    );

    await this.emit(
      {
        type:
          "cognition.autonomous-loop.recovering",

        loopId:
          state.id,

        stage:
          mappedStage,

        status:
          "recovering",

        detail:
          `${decision.selected.action}: ${decision.selected.summary}`,
      },
      state,
    );

    state.status =
      "running";

    state.updatedAt =
      nowIso(
        this.clock,
      );

    await this.persist(
      state,
    );

    return state;
  }

  private async persist(
    state:
      AutonomousCognitiveLoopState,
  ): Promise<void> {
    state.updatedAt =
      nowIso(
        this.clock,
      );

    await this.store
      .save(
        state,
      );
  }

  private async emit(
    event:
      AutonomousCognitiveLoopEvent,
    state:
      AutonomousCognitiveLoopState,
  ): Promise<void> {
    await this.eventPublisher(
      event,
      cloneState(
        state,
      ),
    );
  }
}

type RuntimeGlobals =
  typeof globalThis & {
    __chernobogAutonomousCognitiveLoop?:
      AutonomousCognitiveLoop;
  };

const runtimeGlobals =
  globalThis as
    RuntimeGlobals;

export function configureAutonomousCognitiveLoopRuntime(
  handlers:
    AutonomousCognitiveLoopHandlers,

  options: ConstructorParameters<
    typeof AutonomousCognitiveLoop
  >[1] = {},
): AutonomousCognitiveLoop {
  const runtime =
    new AutonomousCognitiveLoop(
      handlers,
      options,
    );

  runtimeGlobals
    .__chernobogAutonomousCognitiveLoop =
    runtime;

  return runtime;
}

export function getAutonomousCognitiveLoopRuntime():
  AutonomousCognitiveLoop {
  const runtime =
    runtimeGlobals
      .__chernobogAutonomousCognitiveLoop;

  if (!runtime) {
    throw new Error(
      "OH-4AD autonomous cognitive loop runtime is not configured with stage adapters.",
    );
  }

  return runtime;
}