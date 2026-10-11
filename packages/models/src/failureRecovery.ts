export const FAILURE_RECOVERY_VERSION =
  "oh4ab.v1";

export type FailureKind =
  | "malformed-output"
  | "provider-failure"
  | "tool-failure"
  | "context-problem"
  | "loop-detected"
  | "disagreement"
  | "bad-plan"
  | "partial-execution"
  | "verification-failure"
  | "authority-block"
  | "unknown";

export type FailureSeverity =
  | "recoverable"
  | "degraded"
  | "blocking"
  | "terminal";

export type RecoveryActionKind =
  | "retry-provider"
  | "switch-model"
  | "enrich-context"
  | "recompile-prompt"
  | "replan"
  | "invoke-critic"
  | "retry-tool"
  | "resume-from-checkpoint"
  | "request-human-clarification"
  | "stop-safely";

export type RecoveryResumeStage =
  | "context"
  | "prompt"
  | "model-route"
  | "planning"
  | "orchestration"
  | "verification"
  | "authority"
  | "action"
  | "human"
  | "stop";

export interface FailureSignal {
  id: string;

  kind:
    FailureKind;

  occurredAt: string;

  stage?: string;

  source?: string;

  message: string;

  transient?:
    boolean;

  retryable?:
    boolean;

  failureFingerprint?:
    string;

  modelId?: string;

  toolName?: string;

  evidenceRefs?: string[];
}

export interface RecoveryAttemptRecord {
  attempt: number;

  action:
    RecoveryActionKind;

  failureFingerprint?:
    string;

  completed:
    boolean;

  succeeded:
    boolean;

  occurredAt: string;
}

export interface PartialExecutionState {
  completedStepIds: string[];

  failedStepId?: string;

  sideEffectsObserved:
    boolean;

  resumable:
    boolean;

  idempotencyKey?: string;

  checkpointRef?: string;
}

export interface FailureRecoveryContext {
  attemptCount?: number;

  maxAttempts?: number;

  recentAttempts?:
    RecoveryAttemptRecord[];

  alternateModelIds?:
    string[];

  criticAvailable?:
    boolean;

  contextCanBeEnriched?:
    boolean;

  promptCanBeRecompiled?:
    boolean;

  planCanBeRebuilt?:
    boolean;

  humanAvailable?:
    boolean;

  toolRetrySafe?:
    boolean;

  partialExecution?:
    PartialExecutionState;
}

export interface FailureRecoveryPolicy {
  maxAttempts: number;

  loopFingerprintThreshold:
    number;

  maxRecentAttemptsForLoopCheck:
    number;
}

export interface FailureClassification {
  primary:
    FailureKind;

  severity:
    FailureSeverity;

  transient:
    boolean;

  retryable:
    boolean;

  fingerprint: string;

  reasons: string[];
}

export interface RecoveryDirective {
  action:
    RecoveryActionKind;

  resumeStage:
    RecoveryResumeStage;

  summary: string;

  prerequisites:
    string[];

  preserveCompletedWork:
    boolean;

  requiresReverification:
    boolean;

  requiresAuthorityReevaluation:
    boolean;

  targetModelId?: string;

  toolName?: string;

  checkpointRef?: string;

  attemptNumber?: number;

  mayExecute: false;
}

export interface FailureRecoveryDecision {
  version: string;

  decidedAt: string;

  failure:
    FailureClassification;

  selected:
    RecoveryDirective;

  alternatives:
    RecoveryDirective[];

  loop: {
    detected: boolean;

    repeatedFingerprintCount:
      number;

    threshold: number;
  };

  attemptBudget: {
    current: number;

    maximum: number;

    exhausted: boolean;
  };

  preservedState: {
    completedStepIds:
      string[];

    checkpointRef?: string;

    idempotencyKey?: string;

    sideEffectsObserved:
      boolean;
  };

  warnings: string[];

  invariants: {
    recoveryExecuted: false;

    toolInvoked: false;

    modelInvoked: false;

    executionResumed: false;

    authorityBypassed: false;

    completedWorkDiscarded: false;

    sideEffectReplayAssumedSafe: false;
  };
}

export const DEFAULT_FAILURE_RECOVERY_POLICY:
  FailureRecoveryPolicy = {
    maxAttempts:
      3,

    loopFingerprintThreshold:
      3,

    maxRecentAttemptsForLoopCheck:
      8,
  };

function normalizeRequired(
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

function timestamp(
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

function nonNegativeInteger(
  value:
    number
    | undefined,
  fallback: number,
  field: string,
): number {
  const normalized =
    value ??
    fallback;

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

function positiveInteger(
  value:
    number
    | undefined,
  fallback: number,
  field: string,
): number {
  const normalized =
    value ??
    fallback;

  if (
    !Number.isInteger(
      normalized,
    ) ||
    normalized < 1
  ) {
    throw new Error(
      `${field} must be a positive integer.`,
    );
  }

  return normalized;
}

function normalizePolicy(
  value:
    Partial<
      FailureRecoveryPolicy
    >
    | undefined,
): FailureRecoveryPolicy {
  return {
    maxAttempts:
      positiveInteger(
        value?.maxAttempts,
        DEFAULT_FAILURE_RECOVERY_POLICY
          .maxAttempts,
        "failureRecovery.maxAttempts",
      ),

    loopFingerprintThreshold:
      positiveInteger(
        value?.loopFingerprintThreshold,
        DEFAULT_FAILURE_RECOVERY_POLICY
          .loopFingerprintThreshold,
        "failureRecovery.loopFingerprintThreshold",
      ),

    maxRecentAttemptsForLoopCheck:
      positiveInteger(
        value?.maxRecentAttemptsForLoopCheck,
        DEFAULT_FAILURE_RECOVERY_POLICY
          .maxRecentAttemptsForLoopCheck,
        "failureRecovery.maxRecentAttemptsForLoopCheck",
      ),
  };
}

function classify(
  signal:
    FailureSignal,
): FailureClassification {
  const kind =
    signal.kind;

  const reasons:
    string[] = [
      `Failure kind=${kind}.`,
    ];

  let severity:
    FailureSeverity =
      "blocking";

  let transient =
    signal.transient ??
    false;

  let retryable =
    signal.retryable ??
    false;

  switch (
    kind
  ) {
    case "malformed-output":
      severity =
        "recoverable";

      retryable =
        true;

      reasons.push(
        "Malformed structured/model output can normally be repaired by recompiling or rerunning the cognitive pass.",
      );
      break;

    case "provider-failure":
      severity =
        transient
          ? "recoverable"
          : "degraded";

      retryable =
        signal.retryable ??
        transient;

      reasons.push(
        transient
          ? "Provider failure is marked transient."
          : "Provider failure is not marked transient.",
      );
      break;

    case "tool-failure":
      severity =
        "degraded";

      retryable =
        signal.retryable ??
        transient;

      reasons.push(
        "Tool recovery must respect side effects and idempotency.",
      );
      break;

    case "context-problem":
      severity =
        "recoverable";

      retryable =
        true;

      reasons.push(
        "Context failure should re-enter the pipeline at context assembly rather than continuing with missing evidence.",
      );
      break;

    case "loop-detected":
      severity =
        "terminal";

      retryable =
        false;

      reasons.push(
        "Detected loops must not continue automatic retries.",
      );
      break;

    case "disagreement":
      severity =
        "degraded";

      retryable =
        true;

      reasons.push(
        "Material disagreement requires independent verification or stronger synthesis.",
      );
      break;

    case "bad-plan":
      severity =
        "recoverable";

      retryable =
        true;

      reasons.push(
        "Invalid or unworkable plans should be rebuilt rather than executed further.",
      );
      break;

    case "partial-execution":
      severity =
        "blocking";

      retryable =
        false;

      reasons.push(
        "Partial execution requires checkpoint/idempotency analysis before any continuation.",
      );
      break;

    case "verification-failure":
      severity =
        "blocking";

      retryable =
        true;

      reasons.push(
        "Verification failure invalidates trust in the current candidate and requires a new verified path.",
      );
      break;

    case "authority-block":
      severity =
        "terminal";

      retryable =
        false;

      reasons.push(
        "Authority blocks cannot be repaired by cognition alone.",
      );
      break;

    case "unknown":
      severity =
        "blocking";

      retryable =
        false;

      reasons.push(
        "Unknown failure type cannot be retried automatically without a safer classification.",
      );
      break;
  }

  const source =
    normalizeOptional(
      signal.source,
    ) ??
    "unknown-source";

  const stage =
    normalizeOptional(
      signal.stage,
    ) ??
    "unknown-stage";

  const explicit =
    normalizeOptional(
      signal
        .failureFingerprint,
    );

  const fingerprint =
    explicit ??
    [
      kind,
      source,
      stage,
      normalizeRequired(
        signal.message,
        "failure.message",
      )
        .toLowerCase()
        .replace(
          /\s+/g,
          " ",
        ),
    ].join(
      "|",
    );

  return {
    primary:
      kind,

    severity,

    transient,

    retryable,

    fingerprint,

    reasons,
  };
}

function directive(
  input: Omit<
    RecoveryDirective,
    "mayExecute"
  >,
): RecoveryDirective {
  return {
    ...input,

    mayExecute:
      false,
  };
}

function recentFingerprintCount(
  fingerprint: string,
  attempts:
    readonly RecoveryAttemptRecord[],
  limit: number,
): number {
  return attempts
    .slice(
      -limit,
    )
    .filter(
      (attempt) =>
        attempt
          .failureFingerprint ===
        fingerprint,
    )
    .length;
}

function normalizedPartialState(
  state:
    PartialExecutionState
    | undefined,
): {
  completedStepIds:
    string[];

  failedStepId?: string;

  sideEffectsObserved:
    boolean;

  resumable:
    boolean;

  idempotencyKey?: string;

  checkpointRef?: string;
} {
  return {
    completedStepIds: [
      ...new Set(
        (
          state
            ?.completedStepIds ??
          []
        )
          .map(
            (value) =>
              value.trim(),
          )
          .filter(Boolean),
      ),
    ],

    failedStepId:
      normalizeOptional(
        state
          ?.failedStepId,
      ),

    sideEffectsObserved:
      state
        ?.sideEffectsObserved ??
      false,

    resumable:
      state
        ?.resumable ??
      false,

    idempotencyKey:
      normalizeOptional(
        state
          ?.idempotencyKey,
      ),

    checkpointRef:
      normalizeOptional(
        state
          ?.checkpointRef,
      ),
  };
}

function safeHumanOrStop(
  humanAvailable: boolean,
  summary: string,
  reason:
    string,
): RecoveryDirective {
  if (
    humanAvailable
  ) {
    return directive({
      action:
        "request-human-clarification",

      resumeStage:
        "human",

      summary,

      prerequisites: [
        reason,
        "Preserve all completed work and failure evidence while waiting for human direction.",
      ],

      preserveCompletedWork:
        true,

      requiresReverification:
        true,

      requiresAuthorityReevaluation:
        true,
    });
  }

  return directive({
    action:
      "stop-safely",

    resumeStage:
      "stop",

    summary,

    prerequisites: [
      reason,
      "Surface the unresolved failure without fabricating success.",
    ],

    preserveCompletedWork:
      true,

    requiresReverification:
      true,

    requiresAuthorityReevaluation:
      true,
  });
}

export class FailureRecoveryEngine {
  decide(
    input: {
      failure:
        FailureSignal;

      context?:
        FailureRecoveryContext;

      policy?:
        Partial<
          FailureRecoveryPolicy
        >;
    },
  ): FailureRecoveryDecision {
    timestamp(
      input.failure
        .occurredAt,
      "failure.occurredAt",
    );

    normalizeRequired(
      input.failure.id,
      "failure.id",
    );

    normalizeRequired(
      input.failure.message,
      "failure.message",
    );

    const policy =
      normalizePolicy(
        input.policy,
      );

    const context =
      input.context ??
      {};

    const currentAttempt =
      nonNegativeInteger(
        context.attemptCount,
        0,
        "failureRecovery.attemptCount",
      );

    const maximumAttempts =
      positiveInteger(
        context.maxAttempts,
        policy.maxAttempts,
        "failureRecovery.context.maxAttempts",
      );

    const exhausted =
      currentAttempt >=
      maximumAttempts;

    const classified =
      classify(
        input.failure,
      );

    const recentAttempts =
      context.recentAttempts ??
      [];

    const repeatedFingerprintCount =
      recentFingerprintCount(
        classified.fingerprint,
        recentAttempts,
        policy
          .maxRecentAttemptsForLoopCheck,
      ) +
      1;

    const loopDetected =
      input.failure.kind ===
        "loop-detected" ||
      repeatedFingerprintCount >=
        policy
          .loopFingerprintThreshold;

    const partial =
      normalizedPartialState(
        context.partialExecution,
      );

    const alternatives:
      RecoveryDirective[] =
        [];

    const humanAvailable =
      context.humanAvailable ??
      true;

    let selected:
      RecoveryDirective;

    if (
      loopDetected
    ) {
      selected =
        safeHumanOrStop(
          humanAvailable,
          "Stop automatic rerouting because the same failure pattern is repeating.",
          `Failure fingerprint repeated ${repeatedFingerprintCount} time(s), meeting the loop threshold of ${policy.loopFingerprintThreshold}.`,
        );
    } else if (
      exhausted
    ) {
      selected =
        safeHumanOrStop(
          humanAvailable,
          "Automatic recovery attempt budget is exhausted.",
          `Attempt budget ${currentAttempt}/${maximumAttempts} is exhausted.`,
        );
    } else {
      switch (
        classified.primary
      ) {
        case "malformed-output": {
          if (
            context.promptCanBeRecompiled !==
            false
          ) {
            selected =
              directive({
                action:
                  "recompile-prompt",

                resumeStage:
                  "prompt",

                summary:
                  "Recompile the prompt/output contract and rerun the bounded cognitive pass.",

                prerequisites: [
                  "Preserve the original interpreted intent and explicit constraints.",
                  "Tighten the output schema or parser-facing contract.",
                ],

                preserveCompletedWork:
                  true,

                requiresReverification:
                  true,

                requiresAuthorityReevaluation:
                  true,

                attemptNumber:
                  currentAttempt +
                  1,
              });
          } else {
            selected =
              safeHumanOrStop(
                humanAvailable,
                "Malformed output cannot be repaired automatically because prompt recompilation is unavailable.",
                "Do not accept or execute malformed output.",
              );
          }

          break;
        }

        case "provider-failure": {
          const alternate =
            context
              .alternateModelIds
              ?.map(
                (value) =>
                  value.trim(),
              )
              .find(Boolean);

          if (
            classified.transient &&
            classified.retryable
          ) {
            selected =
              directive({
                action:
                  "retry-provider",

                resumeStage:
                  "orchestration",

                summary:
                  "Retry the provider/model call because the failure is classified as transient.",

                prerequisites: [
                  "Reuse authoritative inputs and bounded pass limits.",
                  "Re-run verification after a successful retry.",
                ],

                preserveCompletedWork:
                  true,

                requiresReverification:
                  true,

                requiresAuthorityReevaluation:
                  true,

                attemptNumber:
                  currentAttempt +
                  1,
              });

            if (
              alternate
            ) {
              alternatives.push(
                directive({
                  action:
                    "switch-model",

                  resumeStage:
                    "model-route",

                  summary:
                    "Reroute to an eligible alternate model if provider retry remains unhealthy.",

                  prerequisites: [
                    "Alternate model must remain eligible under OH-4M constraints.",
                  ],

                  preserveCompletedWork:
                    true,

                  requiresReverification:
                    true,

                  requiresAuthorityReevaluation:
                    true,

                  targetModelId:
                    alternate,

                  attemptNumber:
                    currentAttempt +
                    1,
                }),
              );
            }
          } else if (
            alternate
          ) {
            selected =
              directive({
                action:
                  "switch-model",

                resumeStage:
                  "model-route",

                summary:
                  "Reroute away from the failed provider/model to an eligible alternate.",

                prerequisites: [
                  "Alternate model must pass the normal OH-4M eligibility gates.",
                  "Re-run strategy execution and verification.",
                ],

                preserveCompletedWork:
                  true,

                requiresReverification:
                  true,

                requiresAuthorityReevaluation:
                  true,

                targetModelId:
                  alternate,

                attemptNumber:
                  currentAttempt +
                  1,
              });
          } else {
            selected =
              safeHumanOrStop(
                humanAvailable,
                "Provider/model failed and no safe alternate route is available.",
                "Do not collapse the workflow into an unverified fallback.",
              );
          }

          break;
        }

        case "tool-failure": {
          const retrySafe =
            context.toolRetrySafe ===
              true &&
            (
              !partial
                .sideEffectsObserved ||
              Boolean(
                partial
                  .idempotencyKey,
              )
            );

          if (
            classified.retryable &&
            retrySafe
          ) {
            selected =
              directive({
                action:
                  "retry-tool",

                resumeStage:
                  "action",

                summary:
                  "Retry the failed tool step because retry safety/idempotency is explicitly established.",

                prerequisites: [
                  "Reuse the same idempotency key when one exists.",
                  "Do not replay completed side effects.",
                  "Re-run post-action verification.",
                ],

                preserveCompletedWork:
                  true,

                requiresReverification:
                  true,

                requiresAuthorityReevaluation:
                  true,

                toolName:
                  normalizeOptional(
                    input.failure
                      .toolName,
                  ),

                checkpointRef:
                  partial
                    .checkpointRef,

                attemptNumber:
                  currentAttempt +
                  1,
              });
          } else {
            selected =
              safeHumanOrStop(
                humanAvailable,
                "Tool failure is not safe for automatic replay.",
                partial.sideEffectsObserved
                  ? "Side effects were observed without sufficient idempotent replay evidence."
                  : "Tool retry safety was not established.",
              );
          }

          break;
        }

        case "context-problem": {
          if (
            context.contextCanBeEnriched !==
            false
          ) {
            selected =
              directive({
                action:
                  "enrich-context",

                resumeStage:
                  "context",

                summary:
                  "Return to context retrieval/assembly before reasoning again.",

                prerequisites: [
                  "Retrieve only relevant authoritative context.",
                  "Preserve provenance and freshness metadata.",
                ],

                preserveCompletedWork:
                  true,

                requiresReverification:
                  true,

                requiresAuthorityReevaluation:
                  true,

                attemptNumber:
                  currentAttempt +
                  1,
              });
          } else {
            selected =
              safeHumanOrStop(
                humanAvailable,
                "Required context is unavailable for automatic recovery.",
                "Missing context must not be invented.",
              );
          }

          break;
        }

        case "disagreement": {
          if (
            context.criticAvailable ===
            true
          ) {
            selected =
              directive({
                action:
                  "invoke-critic",

                resumeStage:
                  "verification",

                summary:
                  "Use an independent critic/comparison pass to resolve material disagreement.",

                prerequisites: [
                  "Critic must be independent and eligible.",
                  "Do not select a winner solely by self-reported confidence.",
                ],

                preserveCompletedWork:
                  true,

                requiresReverification:
                  true,

                requiresAuthorityReevaluation:
                  true,

                attemptNumber:
                  currentAttempt +
                  1,
              });
          } else {
            const alternate =
              context
                .alternateModelIds
                ?.map(
                  (value) =>
                    value.trim(),
                )
                .find(Boolean);

            if (
              alternate
            ) {
              selected =
                directive({
                  action:
                    "switch-model",

                  resumeStage:
                    "model-route",

                  summary:
                    "Reroute disagreement through an eligible alternate model because no independent critic is available.",

                  prerequisites: [
                    "Re-run verification after alternate-model execution.",
                  ],

                  preserveCompletedWork:
                    true,

                  requiresReverification:
                    true,

                  requiresAuthorityReevaluation:
                    true,

                  targetModelId:
                    alternate,

                  attemptNumber:
                    currentAttempt +
                    1,
                });
            } else {
              selected =
                safeHumanOrStop(
                  humanAvailable,
                  "Material disagreement cannot be resolved automatically.",
                  "No independent critic or alternate model route is available.",
                );
            }
          }

          break;
        }

        case "bad-plan": {
          if (
            context.planCanBeRebuilt !==
            false
          ) {
            selected =
              directive({
                action:
                  "replan",

                resumeStage:
                  "planning",

                summary:
                  "Discard the invalid future plan structure while preserving completed work and rebuild from current authoritative state.",

                prerequisites: [
                  "Preserve completed execution state.",
                  "Recompute dependencies and verification checkpoints.",
                  "Do not replay already completed side effects.",
                ],

                preserveCompletedWork:
                  true,

                requiresReverification:
                  true,

                requiresAuthorityReevaluation:
                  true,

                checkpointRef:
                  partial
                    .checkpointRef,

                attemptNumber:
                  currentAttempt +
                  1,
              });
          } else {
            selected =
              safeHumanOrStop(
                humanAvailable,
                "The active plan is invalid and automatic replanning is unavailable.",
                "Do not continue executing a known-bad plan.",
              );
          }

          break;
        }

        case "partial-execution": {
          const safeResume =
            partial.resumable &&
            (
              !partial
                .sideEffectsObserved ||
              Boolean(
                partial
                  .idempotencyKey,
              )
            ) &&
            Boolean(
              partial
                .checkpointRef,
            );

          if (
            safeResume
          ) {
            selected =
              directive({
                action:
                  "resume-from-checkpoint",

                resumeStage:
                  "action",

                summary:
                  "Resume from the recorded execution checkpoint without replaying completed work.",

                prerequisites: [
                  "Restore the recorded checkpoint.",
                  "Retain completed step IDs.",
                  "Reuse the idempotency key for any side-effecting continuation.",
                  "Re-run post-action verification.",
                ],

                preserveCompletedWork:
                  true,

                requiresReverification:
                  true,

                requiresAuthorityReevaluation:
                  true,

                checkpointRef:
                  partial
                    .checkpointRef,

                attemptNumber:
                  currentAttempt +
                  1,
              });
          } else {
            selected =
              safeHumanOrStop(
                humanAvailable,
                "Partial execution cannot be resumed automatically without risking duplicated or inconsistent side effects.",
                "A safe checkpoint plus resumability/idempotency evidence is required.",
              );
          }

          break;
        }

        case "verification-failure": {
          if (
            context.criticAvailable ===
            true
          ) {
            selected =
              directive({
                action:
                  "invoke-critic",

                resumeStage:
                  "verification",

                summary:
                  "Re-enter verification with an independent critic before considering any new action.",

                prerequisites: [
                  "Current candidate remains untrusted.",
                  "Any repaired/replaced candidate must pass verification again.",
                ],

                preserveCompletedWork:
                  true,

                requiresReverification:
                  true,

                requiresAuthorityReevaluation:
                  true,

                attemptNumber:
                  currentAttempt +
                  1,
              });
          } else {
            const alternate =
              context
                .alternateModelIds
                ?.map(
                  (value) =>
                    value.trim(),
                )
                .find(Boolean);

            if (
              alternate
            ) {
              selected =
                directive({
                  action:
                    "switch-model",

                  resumeStage:
                    "model-route",

                  summary:
                    "Reroute to an eligible alternate model after verification failure.",

                  prerequisites: [
                    "Current rejected candidate must not be reused as trusted output.",
                    "Alternate result must pass OH-4T again.",
                  ],

                  preserveCompletedWork:
                    true,

                  requiresReverification:
                    true,

                  requiresAuthorityReevaluation:
                    true,

                  targetModelId:
                    alternate,

                  attemptNumber:
                    currentAttempt +
                    1,
                });
            } else {
              selected =
                safeHumanOrStop(
                  humanAvailable,
                  "Verification failed and no automatic verified recovery path is available.",
                  "Rejected output must remain untrusted.",
                );
            }
          }

          break;
        }

        case "authority-block": {
          selected =
            safeHumanOrStop(
              humanAvailable,
              "Authority denied or blocked continuation.",
              "Cognition cannot override governance or approval boundaries.",
            );

          break;
        }

        case "loop-detected": {
          selected =
            safeHumanOrStop(
              humanAvailable,
              "Automatic recovery loop detected.",
              "Repeated recovery is stopped to prevent runaway execution.",
            );

          break;
        }

        case "unknown": {
          selected =
            safeHumanOrStop(
              humanAvailable,
              "Failure type is not understood well enough for automatic recovery.",
              "Unknown failures must fail closed.",
            );

          break;
        }
      }
    }

    return {
      version:
        FAILURE_RECOVERY_VERSION,

      decidedAt:
        new Date()
          .toISOString(),

      failure:
        classified,

      selected,

      alternatives,

      loop: {
        detected:
          loopDetected,

        repeatedFingerprintCount,

        threshold:
          policy
            .loopFingerprintThreshold,
      },

      attemptBudget: {
        current:
          currentAttempt,

        maximum:
          maximumAttempts,

        exhausted,
      },

      preservedState: {
        completedStepIds:
          partial
            .completedStepIds,

        checkpointRef:
          partial
            .checkpointRef,

        idempotencyKey:
          partial
            .idempotencyKey,

        sideEffectsObserved:
          partial
            .sideEffectsObserved,
      },

      warnings: [
        ...(
          loopDetected
            ? [
                "Automatic recovery loop protection is active.",
              ]
            : []
        ),

        ...(
          partial
            .sideEffectsObserved &&
          !partial
            .idempotencyKey
            ? [
                "Side effects were observed without an idempotency key; automatic replay is restricted.",
              ]
            : []
        ),
      ],

      invariants: {
        recoveryExecuted:
          false,

        toolInvoked:
          false,

        modelInvoked:
          false,

        executionResumed:
          false,

        authorityBypassed:
          false,

        completedWorkDiscarded:
          false,

        sideEffectReplayAssumedSafe:
          false,
      },
    };
  }
}

const defaultFailureRecoveryEngine =
  new FailureRecoveryEngine();

export function getFailureRecoveryEngine():
  FailureRecoveryEngine {
  return defaultFailureRecoveryEngine;
}