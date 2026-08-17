import assert from "node:assert/strict";
import {
  mkdtemp,
  readFile,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  getChernobogEventBus,
} from "../lib/chernobog/events";

import {
  publishChernobogEventSafely,
} from "../lib/chernobog/events/publishers";

import {
  runExecutionTask,
} from "../lib/chernobog/execution/runExecutionTask";

import {
  ExecutionTask,
} from "../lib/chernobog/execution/types";

import {
  generateWithOllama,
} from "../lib/chernobog/llm/ollamaClient";

import {
  executeTool,
} from "../lib/chernobog/tools/executor";

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

async function main(): Promise<void> {
  const root = await mkdtemp(
    join(
      tmpdir(),
      "chernobog-phase11-b1-"
    )
  );

  const eventFile = join(
    root,
    "events.jsonl"
  );

  const previousEventLogPath =
    process.env.CHERNOBOG_EVENT_LOG_PATH;

  const previousFetch =
    globalThis.fetch;

  const secretPrompt =
    "PHASE11-B1-SECRET-PROMPT-DO-NOT-PERSIST";

  /*
   * Redirect event persistence into a temporary
   * verification file.
   */
  process.env.CHERNOBOG_EVENT_LOG_PATH =
    eventFile;

  /*
   * Mock Ollama.
   *
   * We want to test the real Chernobog model client
   * without depending on Ollama actually being online.
   */
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        response:
          "Phase 11F-B1 verification response",
      }),
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/json",
        },
      }
    );

  try {
    const now =
      new Date().toISOString();

    const task: ExecutionTask = {
      id:
        "phase11-b1-verification-task",

      category:
        "system_operation",

      input:
        "Verify runtime event publishers",

      goal:
        "Verify runtime event publishers",

      status:
        "pending",

      risk:
        "safe",

      steps: [
        {
          id:
            "phase11-b1-tool-step",

          kind:
            "tool",

          label:
            "Run a safe registered tool",

          status:
            "pending",

          action:
            "get_time",

          input: {},

          risk:
            "safe",
        },

        {
          id:
            "phase11-b1-model-step",

          kind:
            "model",

          label:
            "Run the model client",

          status:
            "pending",

          action:
            "verify_model",

          input: {},

          risk:
            "safe",
        },
      ],

      currentStepId:
        "phase11-b1-tool-step",

      approval: {
        required: false,
      },

      context: {},

      createdAt: now,
      updatedAt: now,
    };

    const completed =
      await runExecutionTask(
        task,
        {
          handlers: {
            async get_time() {
              const result =
                await executeTool(
                  "get_time",
                  {}
                );

              if (!result.ok) {
                return {
                  success: false,
                  error:
                    result.error,
                };
              }

              return {
                success: true,
                output:
                  result.data,
              };
            },

            async verify_model() {
              const result =
                await generateWithOllama({
                  role:
                    "default",

                  prompt:
                    secretPrompt,

                  temperature:
                    0,

                  timeoutMs:
                    5_000,
                });

              if (!result.ok) {
                return {
                  success: false,
                  error:
                    result.error,
                };
              }

              return {
                success: true,
                output:
                  result.text,
              };
            },
          },
        }
      );

    assert.equal(
      completed.status,
      "completed"
    );

    pass(
      "instrumentation preserves successful execution behaviour"
    );

    /*
     * Pull only events belonging to this
     * execution task.
     */
    const events =
      await getChernobogEventBus().query({
        correlationId:
          task.id,

        newestFirst:
          false,
      });

    const eventTypes =
      events.map(
        (event) =>
          event.type
      );

    assert.deepEqual(
      eventTypes,
      [
        "execution.started",
        "tool.started",
        "tool.completed",
        "model.requested",
        "model.completed",
        "execution.completed",
      ]
    );

    pass(
      "runtime publishers emit the expected causal lifecycle"
    );

    /*
     * Tool events must point back to the
     * tool execution step.
     */
    const toolEvents =
      events.filter(
        (event) =>
          event.type.startsWith(
            "tool."
          )
      );

    assert.equal(
      toolEvents.length,
      2
    );

    assert.ok(
      toolEvents.every(
        (event) =>
          event.causationId ===
          "phase11-b1-tool-step"
      )
    );

    pass(
      "tool events inherit execution-step causality"
    );

    /*
     * Model events must point back to the
     * model execution step.
     */
    const modelEvents =
      events.filter(
        (event) =>
          event.type.startsWith(
            "model."
          )
      );

    assert.equal(
      modelEvents.length,
      2
    );

    assert.ok(
      modelEvents.every(
        (event) =>
          event.causationId ===
          "phase11-b1-model-step"
      )
    );

    pass(
      "model events inherit execution-step causality"
    );

    /*
     * Verify that the model prompt was NOT
     * copied into persistent telemetry.
     */
    const serializedEvents =
      await readFile(
        eventFile,
        "utf8"
      );

    assert.equal(
      serializedEvents.includes(
        secretPrompt
      ),
      false
    );

    pass(
      "model prompt content is not persisted in event telemetry"
    );

    /*
     * We should still record prompt dimensions,
     * just not the contents themselves.
     */
    const requestedModelEvent =
      modelEvents.find(
        (event) =>
          event.type ===
          "model.requested"
      );

    assert.ok(
      requestedModelEvent
    );

    assert.equal(
      (
        requestedModelEvent.payload as {
          promptChars?: number;
        }
      ).promptChars,
      secretPrompt.length
    );

    pass(
      "model telemetry records request dimensions without storing content"
    );

    /*
     * Finally prove that telemetry failure itself
     * cannot propagate into normal operations.
     */
    const isolated =
      await publishChernobogEventSafely(
        {
          type:
            "verification.telemetry_failure",

          source: {
            subsystem:
              "verification",
          },

          payload: {
            expected:
              "telemetry failure",
          },
        },

        {
          async publish() {
            throw new Error(
              "Simulated event-store failure"
            );
          },
        }
      );

    assert.equal(
      isolated,
      null
    );

    pass(
      "event telemetry failures remain isolated from observed operations"
    );

    console.log(
      "\nChernobog Phase 11F-B1 runtime publisher verification passed."
    );
  } finally {
    /*
     * Restore global/environment state.
     */
    globalThis.fetch =
      previousFetch;

    if (
      previousEventLogPath ===
      undefined
    ) {
      delete process.env
        .CHERNOBOG_EVENT_LOG_PATH;
    } else {
      process.env.CHERNOBOG_EVENT_LOG_PATH =
        previousEventLogPath;
    }

    await rm(
      root,
      {
        recursive: true,
        force: true,
      }
    );
  }
}

main().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  }
);