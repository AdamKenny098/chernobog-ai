import assert from "node:assert/strict";

import {
  mkdtemp,
  rm,
} from "node:fs/promises";

import {
  tmpdir,
} from "node:os";

import {
  join,
} from "node:path";

import {
  AUTONOMOUS_COGNITIVE_LOOP_VERSION,
  AUTONOMOUS_COGNITIVE_STAGE_ORDER,
  AutonomousCognitiveLoop,
  JsonAutonomousCognitiveLoopStore,
  type AutonomousCognitiveLoopEvent,
  type AutonomousCognitiveLoopHandlers,
  type AutonomousCognitiveLoopState,
  type AutonomousCognitiveStage,
} from "@chernobog/models/autonomousCognitiveLoop";

function pass(
  message: string,
) {
  console.log(
    `PASS ${message}`,
  );
}

function successfulHandlers(
  seen:
    AutonomousCognitiveStage[],
): AutonomousCognitiveLoopHandlers {
  return Object.fromEntries(
    AUTONOMOUS_COGNITIVE_STAGE_ORDER
      .map(
        (stage) => [
          stage,
          async () => {
            seen.push(
              stage,
            );

            return {
              status:
                "completed" as const,

              artifact: {
                stage,

                ok:
                  true,
              },
            };
          },
        ],
      ),
  ) as unknown as
    AutonomousCognitiveLoopHandlers;
}

async function withTempStore<T>(
  callback:
    (
      store:
        JsonAutonomousCognitiveLoopStore,
      directory:
        string,
    ) =>
      Promise<T>,
): Promise<T> {
  const directory =
    await mkdtemp(
      join(
        tmpdir(),
        "chernobog-oh4ad-",
      ),
    );

  try {
    return await callback(
      new JsonAutonomousCognitiveLoopStore(
        directory,
      ),
      directory,
    );
  } finally {
    await rm(
      directory,
      {
        recursive:
          true,

        force:
          true,
      },
    );
  }
}

async function main() {
  console.log(
    "Chernobog OH-4AD â€” Autonomous Cognitive Loop Verification",
  );

  console.log(
    "========================================================",
  );

  await withTempStore(
    async (
      store,
    ) => {
      const seen:
        AutonomousCognitiveStage[] =
          [];

      const events:
        AutonomousCognitiveLoopEvent[] =
          [];

      const loop =
        new AutonomousCognitiveLoop(
          successfulHandlers(
            seen,
          ),
          {
            store,

            eventPublisher:
              (event) => {
                events.push(
                  event,
                );
              },
          },
        );

      const state =
        await loop.start({
          rawInput:
            "Build and verify the requested change.",

          profile:
            "deep",

          subject:
            "chernobog",
        });

      assert.equal(
        state.version,
        AUTONOMOUS_COGNITIVE_LOOP_VERSION,
      );

      assert.equal(
        state.status,
        "completed",
      );

      assert.deepEqual(
        seen,
        [
          ...AUTONOMOUS_COGNITIVE_STAGE_ORDER,
        ],
      );

      assert.equal(
        state.stages
          .every(
            (stage) =>
              stage.status ===
              "completed",
          ),
        true,
      );

      assert.ok(
        events.some(
          (event) =>
            event.type ===
            "cognition.autonomous-loop.completed",
        ),
      );

      pass(
        "complete Observe â†’ Interpret â†’ Contextualize â†’ Prioritize â†’ Strategy â†’ Models â†’ Prompt â†’ Reason/Plan â†’ Validate â†’ Authorize â†’ Act â†’ Verify â†’ Record â†’ Learn sequence executes in canonical order",
      );
    },
  );

  await withTempStore(
    async (
      store,
    ) => {
      let authorizeRuns =
        0;

      const handlers =
        successfulHandlers(
          [],
        );

      handlers.authorize =
        async (
          context,
        ) => {
          authorizeRuns +=
            1;

          if (
            context.humanInput ===
            undefined
          ) {
            return {
              status:
                "waiting-human",

              reason:
                "Approval is required.",

              questions: [
                "Approve this action?",
              ],
            };
          }

          return {
            status:
              "completed",

            artifact: {
              approval:
                context.humanInput,
            },
          };
        };

      const loop =
        new AutonomousCognitiveLoop(
          handlers,
          {
            store,

            eventPublisher:
              () => {},
          },
        );

      const waiting =
        await loop.start({
          rawInput:
            "Perform governed action.",
        });

      assert.equal(
        waiting.status,
        "waiting-human",
      );

      assert.equal(
        waiting
          .waitingForHuman
          ?.stage,
        "authorize",
      );

      const persisted =
        await store.load(
          waiting.id,
        );

      assert.equal(
        persisted.status,
        "waiting-human",
      );

      const resumed =
        await loop.resume(
          waiting.id,
          {
            humanInput: {
              approved:
                true,
            },
          },
        );

      assert.equal(
        resumed.status,
        "completed",
      );

      assert.equal(
        authorizeRuns,
        2,
      );

      assert.equal(
        resumed
          .humanInterventions
          .length,
        1,
      );

      pass(
        "human intervention pauses durably at the active stage and resumes the same loop with supplied human input",
      );
    },
  );

  await withTempStore(
    async (
      store,
    ) => {
      const seen:
        AutonomousCognitiveStage[] =
          [];

      const loop =
        new AutonomousCognitiveLoop(
          successfulHandlers(
            seen,
          ),
          {
            store,

            eventPublisher:
              () => {},
          },
        );

      const created =
        await loop.create({
          rawInput:
            "Interruptible task.",
        });

      let checks =
        0;

      const interrupted =
        await loop.run(
          created.id,
          {
            shouldInterrupt:
              () => {
                checks +=
                  1;

                return (
                  checks ===
                  4
                );
              },
          },
        );

      assert.equal(
        interrupted.status,
        "interrupted",
      );

      assert.ok(
        seen.length >
        0,
      );

      const completedBeforeResume =
        interrupted.stages
          .filter(
            (stage) =>
              stage.status ===
              "completed",
          )
          .length;

      const resumed =
        await loop.resume(
          interrupted.id,
        );

      assert.equal(
        resumed.status,
        "completed",
      );

      assert.equal(
        resumed.stages
          .filter(
            (stage) =>
              stage.status ===
              "completed",
          )
          .length,
        AUTONOMOUS_COGNITIVE_STAGE_ORDER
          .length,
      );

      assert.ok(
        completedBeforeResume <
        AUTONOMOUS_COGNITIVE_STAGE_ORDER
          .length,
      );

      pass(
        "external interruption checkpoints the loop and later resumes without restarting completed stages",
      );
    },
  );

  await withTempStore(
    async (
      store,
    ) => {
      const handlers =
        successfulHandlers(
          [],
        );

      let contextRuns =
        0;

      handlers.contextualize =
        async () => {
          contextRuns +=
            1;

          if (
            contextRuns ===
            1
          ) {
            return {
              status:
                "failed",

              error:
                "Required repository context was missing.",

              failure: {
                kind:
                  "context-problem",

                message:
                  "Required repository context was missing.",
              },

              recoveryContext: {
                contextCanBeEnriched:
                  true,

                humanAvailable:
                  true,
              },
            };
          }

          return {
            status:
              "completed",

            artifact: {
              recovered:
                true,
            },
          };
        };

      const loop =
        new AutonomousCognitiveLoop(
          handlers,
          {
            store,

            eventPublisher:
              () => {},
          },
        );

      const state =
        await loop.start({
          rawInput:
            "Recover missing context.",
        });

      assert.equal(
        state.status,
        "completed",
      );

      assert.equal(
        contextRuns,
        2,
      );

      assert.equal(
        state.recoveries[0]
          ?.action,
        "enrich-context",
      );

      assert.equal(
        state.recoveries[0]
          ?.resumedAtStage,
        "contextualize",
      );

      pass(
        "OH-4AB recovery directives re-enter the correct cognitive stage and continue the same durable loop",
      );
    },
  );

  await withTempStore(
    async (
      store,
    ) => {
      const handlers =
        successfulHandlers(
          [],
        );

      let actRuns =
        0;

      handlers.act =
        async () => {
          actRuns +=
            1;

          return {
            status:
              "completed",

            artifact: {
              sideEffect:
                "email-sent",
            },
          };
        };

      handlers.verify =
        async () => ({
          status:
            "failed",

          error:
            "Post-action verification failed.",

          failure: {
            kind:
              "verification-failure",

            message:
              "Post-action verification failed.",
          },

          recoveryContext: {
            criticAvailable:
              false,

            alternateModelIds: [
              "ollama:alternate",
            ],

            humanAvailable:
              true,

            partialExecution: {
              completedStepIds: [
                "send-email",
              ],

              sideEffectsObserved:
                true,

              resumable:
                false,
            },
          },
        });

      const loop =
        new AutonomousCognitiveLoop(
          handlers,
          {
            store,

            eventPublisher:
              () => {},
          },
        );

      const state =
        await loop.start({
          rawInput:
            "Send governed message.",
        });

      assert.equal(
        state.status,
        "waiting-human",
      );

      assert.equal(
        actRuns,
        1,
      );

      assert.match(
        state
          .waitingForHuman
          ?.reason ??
        "",
        /rewind across a completed action/i,
      );

      pass(
        "post-action failure cannot rewind and replay side effects without explicit safe checkpoint/idempotency evidence",
      );
    },
  );

  await withTempStore(
    async (
      store,
    ) => {
      const handlers =
        successfulHandlers(
          [],
        );

      let actRuns =
        0;

      handlers.act =
        async () => {
          actRuns +=
            1;

          if (
            actRuns ===
            1
          ) {
            return {
              status:
                "failed",

              error:
                "Transient tool timeout.",

              failure: {
                kind:
                  "tool-failure",

                message:
                  "Transient tool timeout.",

                transient:
                  true,

                retryable:
                  true,

                toolName:
                  "write_project_file",
              },

              recoveryContext: {
                toolRetrySafe:
                  true,

                partialExecution: {
                  completedStepIds:
                    [],

                  sideEffectsObserved:
                    true,

                  resumable:
                    true,

                  idempotencyKey:
                    "oh4x:test",

                  checkpointRef:
                    "checkpoint:before-write",
                },
              },
            };
          }

          return {
            status:
              "completed",

            artifact: {
              recovered:
                true,
            },
          };
        };

      const loop =
        new AutonomousCognitiveLoop(
          handlers,
          {
            store,

            eventPublisher:
              () => {},
          },
        );

      const state =
        await loop.start({
          rawInput:
            "Safely retry an idempotent action.",
        });

      assert.equal(
        state.status,
        "completed",
      );

      assert.equal(
        actRuns,
        2,
      );

      assert.equal(
        state.recoveries[0]
          ?.action,
        "retry-tool",
      );

      assert.equal(
        state.recoveries[0]
          ?.resumedAtStage,
        "act",
      );

      pass(
        "idempotent/checkpointed action recovery may safely re-enter Act without replaying completed upstream cognition",
      );
    },
  );

  await withTempStore(
    async (
      store,
    ) => {
      const handlers =
        successfulHandlers(
          [],
        );

      handlers.interpret =
        async () => ({
          status:
            "failed",

          error:
            "Unclassified failure.",

          failure: {
            kind:
              "unknown",

            message:
              "Unclassified failure.",
          },

          recoveryContext: {
            humanAvailable:
              false,
          },
        });

      const loop =
        new AutonomousCognitiveLoop(
          handlers,
          {
            store,

            policy: {
              maxRecoveryAttempts:
                2,

              maxStageExecutions:
                10,
            },

            eventPublisher:
              () => {},
          },
        );

      const state =
        await loop.start({
          rawInput:
            "Fail closed.",
        });

      assert.equal(
        state.status,
        "stopped",
      );

      assert.match(
        state
          .terminalReason ??
        "",
        /understood|failure|safe/i,
      );

      pass(
        "unrecoverable failures stop safely rather than collapsing into fabricated success",
      );
    },
  );

  await withTempStore(
    async (
      store,
    ) => {
      const handlers =
        successfulHandlers(
          [],
        );

      const loop =
        new AutonomousCognitiveLoop(
          handlers,
          {
            store,

            eventPublisher:
              () => {},
          },
        );

      const state =
        await loop.start({
          rawInput:
            "Check loop invariants.",
        });

      assert.equal(
        state.invariants
          .authorityBypassed,
        false,
      );

      assert.equal(
        state.invariants
          .directToolExecutionByLoop,
        false,
      );

      assert.equal(
        state.invariants
          .directModelExecutionByLoop,
        false,
      );

      assert.equal(
        state.invariants
          .hiddenScratchReasoningRequired,
        false,
      );

      assert.equal(
        state.invariants
          .completedWorkSilentlyDiscarded,
        false,
      );

      assert.equal(
        state.invariants
          .unsafePostActionRewindAllowed,
        false,
      );

      pass(
        "OH-4AD owns sequencing/checkpointing only; model/tool execution, authority, hidden reasoning, and unsafe replay remain delegated to their existing governed stages",
      );
    },
  );

  console.log("");

  console.log(
    "OH-4AD autonomous cognitive loop verification complete.",
  );
}

void main().catch(
  (error) => {
    console.error(
      error,
    );

    process.exitCode =
      1;
  },
);