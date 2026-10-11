import assert from "node:assert/strict";

import {
  FAILURE_RECOVERY_VERSION,
  FailureRecoveryEngine,
} from "@chernobog/models/failureRecovery";

function pass(
  message: string,
) {
  console.log(
    `PASS ${message}`,
  );
}

function failure(
  kind:
    Parameters<
      FailureRecoveryEngine[
        "decide"
      ]
    >[0]["failure"]["kind"],
  overrides:
    Partial<
      Parameters<
        FailureRecoveryEngine[
          "decide"
        ]
      >[0]["failure"]
    > = {},
) {
  return {
    id:
      `failure:${kind}`,

    kind,

    occurredAt:
      "2026-10-11T10:00:00.000Z",

    stage:
      "test",

    source:
      "verifier",

    message:
      `Test ${kind}`,

    ...overrides,
  };
}

function main() {
  console.log(
    "Chernobog OH-4AB â€” Failure Recovery Verification",
  );

  console.log(
    "===============================================",
  );

  const engine =
    new FailureRecoveryEngine();

  const malformed =
    engine.decide({
      failure:
        failure(
          "malformed-output",
        ),

      context: {
        promptCanBeRecompiled:
          true,
      },
    });

  assert.equal(
    malformed.version,
    FAILURE_RECOVERY_VERSION,
  );

  assert.equal(
    malformed.selected
      .action,
    "recompile-prompt",
  );

  assert.equal(
    malformed.selected
      .resumeStage,
    "prompt",
  );

  pass(
    "malformed output reroutes to prompt compilation instead of being accepted or executed",
  );

  const transientProvider =
    engine.decide({
      failure:
        failure(
          "provider-failure",
          {
            transient:
              true,

            retryable:
              true,

            modelId:
              "ollama:qwen",
          },
        ),

      context: {
        attemptCount:
          0,

        alternateModelIds: [
          "ollama:deepseek",
        ],
      },
    });

  assert.equal(
    transientProvider
      .selected.action,
    "retry-provider",
  );

  assert.ok(
    transientProvider
      .alternatives
      .some(
        (entry) =>
          entry.action ===
          "switch-model",
      ),
  );

  pass(
    "transient provider failure receives a bounded retry with an eligible model-switch fallback",
  );

  const hardProvider =
    engine.decide({
      failure:
        failure(
          "provider-failure",
          {
            transient:
              false,

            retryable:
              false,
          },
        ),

      context: {
        alternateModelIds: [
          "ollama:deepseek",
        ],
      },
    });

  assert.equal(
    hardProvider
      .selected.action,
    "switch-model",
  );

  assert.equal(
    hardProvider
      .selected
      .targetModelId,
    "ollama:deepseek",
  );

  pass(
    "non-transient provider failure reroutes through model selection instead of blind retry",
  );

  const contextProblem =
    engine.decide({
      failure:
        failure(
          "context-problem",
        ),

      context: {
        contextCanBeEnriched:
          true,
      },
    });

  assert.equal(
    contextProblem
      .selected.action,
    "enrich-context",
  );

  assert.equal(
    contextProblem
      .selected
      .resumeStage,
    "context",
  );

  pass(
    "context problems return to context assembly and never invent missing evidence",
  );

  const disagreement =
    engine.decide({
      failure:
        failure(
          "disagreement",
        ),

      context: {
        criticAvailable:
          true,
      },
    });

  assert.equal(
    disagreement
      .selected.action,
    "invoke-critic",
  );

  pass(
    "material disagreement routes to independent verification instead of arbitrary winner selection",
  );

  const badPlan =
    engine.decide({
      failure:
        failure(
          "bad-plan",
        ),

      context: {
        planCanBeRebuilt:
          true,

        partialExecution: {
          completedStepIds: [
            "step:1",
          ],

          sideEffectsObserved:
            false,

          resumable:
            true,

          checkpointRef:
            "checkpoint:1",
        },
      },
    });

  assert.equal(
    badPlan.selected
      .action,
    "replan",
  );

  assert.deepEqual(
    badPlan
      .preservedState
      .completedStepIds,
    [
      "step:1",
    ],
  );

  pass(
    "bad plans are rebuilt from current state while preserving completed work",
  );

  const resumablePartial =
    engine.decide({
      failure:
        failure(
          "partial-execution",
        ),

      context: {
        partialExecution: {
          completedStepIds: [
            "step:1",
            "step:2",
          ],

          failedStepId:
            "step:3",

          sideEffectsObserved:
            true,

          resumable:
            true,

          idempotencyKey:
            "oh4x:idempotent",

          checkpointRef:
            "checkpoint:2",
        },
      },
    });

  assert.equal(
    resumablePartial
      .selected.action,
    "resume-from-checkpoint",
  );

  assert.equal(
    resumablePartial
      .selected
      .checkpointRef,
    "checkpoint:2",
  );

  assert.deepEqual(
    resumablePartial
      .preservedState
      .completedStepIds,
    [
      "step:1",
      "step:2",
    ],
  );

  pass(
    "partial execution resumes only from a safe checkpoint with idempotency evidence and preserves completed steps",
  );

  const unsafePartial =
    engine.decide({
      failure:
        failure(
          "partial-execution",
        ),

      context: {
        humanAvailable:
          true,

        partialExecution: {
          completedStepIds: [
            "step:1",
          ],

          failedStepId:
            "step:2",

          sideEffectsObserved:
            true,

          resumable:
            true,
        },
      },
    });

  assert.equal(
    unsafePartial
      .selected.action,
    "request-human-clarification",
  );

  assert.notEqual(
    unsafePartial
      .selected.action,
    "resume-from-checkpoint",
  );

  pass(
    "side-effecting partial execution without idempotency never auto-replays",
  );

  const retryTool =
    engine.decide({
      failure:
        failure(
          "tool-failure",
          {
            transient:
              true,

            retryable:
              true,

            toolName:
              "read_text_file",
          },
        ),

      context: {
        toolRetrySafe:
          true,

        partialExecution: {
          completedStepIds:
            [],

          sideEffectsObserved:
            false,

          resumable:
            true,
        },
      },
    });

  assert.equal(
    retryTool.selected
      .action,
    "retry-tool",
  );

  assert.equal(
    retryTool.selected
      .toolName,
    "read_text_file",
  );

  pass(
    "tool retry occurs only when retry safety is explicitly established",
  );

  const fingerprint =
    "provider|ollama|timeout";

  const loop =
    engine.decide({
      failure:
        failure(
          "provider-failure",
          {
            transient:
              true,

            retryable:
              true,

            failureFingerprint:
              fingerprint,
          },
        ),

      context: {
        recentAttempts: [
          {
            attempt:
              1,

            action:
              "retry-provider",

            failureFingerprint:
              fingerprint,

            completed:
              true,

            succeeded:
              false,

            occurredAt:
              "2026-10-11T09:58:00.000Z",
          },

          {
            attempt:
              2,

            action:
              "retry-provider",

            failureFingerprint:
              fingerprint,

            completed:
              true,

            succeeded:
              false,

            occurredAt:
              "2026-10-11T09:59:00.000Z",
          },
        ],

        humanAvailable:
          true,
      },
    });

  assert.equal(
    loop.loop.detected,
    true,
  );

  assert.equal(
    loop.selected
      .action,
    "request-human-clarification",
  );

  pass(
    "repeated failure fingerprints trigger loop protection before another automatic retry",
  );

  const exhausted =
    engine.decide({
      failure:
        failure(
          "provider-failure",
          {
            transient:
              true,

            retryable:
              true,
          },
        ),

      context: {
        attemptCount:
          3,

        maxAttempts:
          3,

        humanAvailable:
          false,
      },
    });

  assert.equal(
    exhausted
      .attemptBudget
      .exhausted,
    true,
  );

  assert.equal(
    exhausted.selected
      .action,
    "stop-safely",
  );

  pass(
    "recovery attempt exhaustion stops safely instead of producing an infinite recovery loop",
  );

  const authorityBlock =
    engine.decide({
      failure:
        failure(
          "authority-block",
        ),

      context: {
        humanAvailable:
          true,

        alternateModelIds: [
          "ollama:anything",
        ],
      },
    });

  assert.equal(
    authorityBlock
      .selected.action,
    "request-human-clarification",
  );

  assert.notEqual(
    authorityBlock
      .selected.action,
    "switch-model",
  );

  pass(
    "authority blocks cannot be bypassed by rerouting to another model",
  );

  assert.equal(
    resumablePartial
      .selected
      .mayExecute,
    false,
  );

  assert.equal(
    resumablePartial
      .invariants
      .recoveryExecuted,
    false,
  );

  assert.equal(
    resumablePartial
      .invariants
      .toolInvoked,
    false,
  );

  assert.equal(
    resumablePartial
      .invariants
      .modelInvoked,
    false,
  );

  assert.equal(
    resumablePartial
      .invariants
      .executionResumed,
    false,
  );

  assert.equal(
    resumablePartial
      .invariants
      .authorityBypassed,
    false,
  );

  assert.equal(
    resumablePartial
      .invariants
      .completedWorkDiscarded,
    false,
  );

  assert.equal(
    resumablePartial
      .invariants
      .sideEffectReplayAssumedSafe,
    false,
  );

  pass(
    "OH-4AB plans recovery only; it does not invoke models/tools, resume execution, bypass authority, discard completed work, or assume side-effect replay is safe",
  );

  console.log("");

  console.log(
    "OH-4AB failure recovery verification complete.",
  );
}

main();