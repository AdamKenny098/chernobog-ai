import assert from "node:assert/strict";

import {
  createChernobogEvent,
} from "@/lib/chernobog/events/schema";

import type {
  ChernobogEvent,
  ChernobogEventInput,
  ChernobogEventPublishResult,
  ChernobogEventQuery,
} from "@/lib/chernobog/events";

import {
  DECISION_PROVENANCE_EVENT_TYPE,
  DECISION_PROVENANCE_VERSION,
  DecisionProvenanceRecorder,
  type DecisionProvenanceEventAccess,
} from "@chernobog/models/decisionProvenance";

function pass(
  message: string,
) {
  console.log(
    `PASS ${message}`,
  );
}

class MemoryEventAccess
  implements DecisionProvenanceEventAccess
{
  readonly events:
    ChernobogEvent[] =
      [];

  private counter =
    0;

  async publish<TPayload>(
    input:
      ChernobogEventInput<TPayload>,
  ): Promise<
    ChernobogEventPublishResult
  > {
    this.counter +=
      1;

    const event =
      createChernobogEvent(
        input,
        new Date(
          `2026-10-11T10:00:${String(this.counter).padStart(2, "0")}.000Z`,
        ),
      );

    this.events.push(
      event,
    );

    return {
      event,
      deduplicated:
        false,
      delivered:
        0,
      handlerErrors:
        [],
    };
  }

  async query(
    query:
      ChernobogEventQuery = {},
  ): Promise<
    ChernobogEvent[]
  > {
    return this.events
      .filter(
        (event) =>
          (
            !query.types
              ?.length ||
            query.types
              .includes(
                event.type,
              )
          ) &&
          (
            !query.correlationId ||
            event.correlationId ===
              query.correlationId
          ),
      )
      .slice(
        0,
        query.limit ??
        100,
      )
      .map(
        (event) =>
          structuredClone(
            event,
          ),
      );
  }
}

function baseInput() {
  return {
    correlationId:
      "task:oh4aa:test",

    causationId:
      "event:user-input:1",

    subject:
      "chernobog",

    scope:
      "project:chernobog",

    task: {
      id:
        "task:test",

      interpretedIntent:
        "Repair the selected repository implementation.",

      goal:
        "Produce a verified repository repair.",

      desiredOutcome:
        "Verifier and typecheck both pass.",

      constraints: [
        "Do not bypass authority.",
        "Do not invent missing repository state.",
      ],

      unresolvedQuestions:
        [],
    },

    context: [
      {
        id:
          "ctx:repo",

        kind:
          "project-state",

        sourceRef:
          "repo:chernobog",

        selected:
          true,

        reason:
          "Current repository state is required.",

        confidence:
          1,

        freshness:
          "fresh",
      },

      {
        id:
          "ctx:old-note",

        kind:
          "memory",

        sourceRef:
          "memory:old-note",

        selected:
          false,

        reason:
          "Rejected as stale.",
      },
    ],

    stages: [
      {
        stage:
          "verification" as const,

        version:
          "oh4t.test",

        status:
          "accepted" as const,

        decision:
          "pass",

        reasons: [
          "Deterministic verifier passed.",
          "Typecheck passed.",
        ],

        evidenceRefs: [
          "verifier:oh4t",
          "typecheck:clean",
        ],
      },

      {
        stage:
          "interpret" as const,

        version:
          "oh4j.test",

        status:
          "completed" as const,

        decision:
          "repository repair requested",

        reasons: [
          "User supplied repository and acceptance requirement.",
        ],

        evidenceRefs: [
          "event:user-input:1",
        ],
      },

      {
        stage:
          "model-route" as const,

        version:
          "oh4m.test",

        status:
          "selected" as const,

        decision:
          "ollama:qwen",

        reasons: [
          "Highest eligible empirical score for coding.",
        ],

        evidenceRefs: [
          "calibration:qwen:coding",
        ],
      },

      {
        stage:
          "strategy-route" as const,

        version:
          "oh4n.test",

        status:
          "selected" as const,

        decision:
          "critic-loop",

        reasons: [
          "Task requires implementation plus independent verification.",
        ],

        evidenceRefs:
          [],
      },

      {
        stage:
          "authority" as const,

        version:
          "oh4w.test",

        status:
          "accepted" as const,

        decision:
          "permitted",

        reasons: [
          "Bounded authority and safe operation.",
        ],

        evidenceRefs: [
          "governance:allow",
        ],
      },
    ],

    outcome: {
      status:
        "accepted" as const,

      reason:
        "Verification passed and authority permitted the result.",

      finalArtifactRef:
        "artifact:repair",
    },

    metadata: {
      projectId:
        "chernobog",

      chainOfThought:
        "THIS MUST NEVER BE RETAINED",

      nested: {
        scratchReasoning:
          "THIS MUST ALSO BE REDACTED",

        safeValue:
          "kept",
      },
    },
  };
}

async function main() {
  console.log(
    "Chernobog OH-4AA â€” Decision Provenance Verification",
  );

  console.log(
    "==================================================",
  );

  const access =
    new MemoryEventAccess();

  const recorder =
    new DecisionProvenanceRecorder({
      access,

      clock:
        () =>
          new Date(
            "2026-10-11T10:00:00.000Z",
          ),
    });

  const first =
    await recorder.record(
      baseInput(),
    );

  assert.equal(
    first.record
      .version,
    DECISION_PROVENANCE_VERSION,
  );

  assert.equal(
    first.persisted,
    true,
  );

  assert.equal(
    access.events
      .length,
    1,
  );

  assert.equal(
    access.events[0]
      ?.type,
    DECISION_PROVENANCE_EVENT_TYPE,
  );

  assert.equal(
    access.events[0]
      ?.correlationId,
    "task:oh4aa:test",
  );

  assert.equal(
    access.events[0]
      ?.causationId,
    "event:user-input:1",
  );

  pass(
    "decision provenance is durably published onto the existing Event Spine with correlation and causation identity",
  );

  assert.deepEqual(
    first.record
      .stages
      .map(
        (stage) =>
          stage.stage,
      ),
    [
      "interpret",
      "model-route",
      "strategy-route",
      "verification",
      "authority",
    ],
  );

  pass(
    "decision stages are normalized into canonical cognitive pipeline order regardless of caller ordering",
  );

  const modelRoute =
    first.record
      .stages
      .find(
        (stage) =>
          stage.stage ===
          "model-route",
      );

  assert.equal(
    modelRoute
      ?.decision,
    "ollama:qwen",
  );

  assert.ok(
    modelRoute
      ?.reasons
      .includes(
        "Highest eligible empirical score for coding.",
      ),
  );

  assert.ok(
    modelRoute
      ?.evidenceRefs
      .includes(
        "calibration:qwen:coding",
      ),
  );

  pass(
    "selected model/strategy decisions retain explicit reasons and evidence references instead of opaque labels",
  );

  assert.equal(
    first.record
      .context
      .find(
        (item) =>
          item.id ===
          "ctx:repo",
      )
      ?.selected,
    true,
  );

  assert.equal(
    first.record
      .context
      .find(
        (item) =>
          item.id ===
          "ctx:old-note",
      )
      ?.selected,
    false,
  );

  pass(
    "context provenance records both selected and rejected context with inspectable selection reasons",
  );

  assert.equal(
    first.record
      .metadata
      .chainOfThought,
    "[redacted-by-oh4aa]",
  );

  assert.equal(
    (
      first.record
        .metadata
        .nested as
        Record<
          string,
          unknown
        >
    )
      .scratchReasoning,
    "[redacted-by-oh4aa]",
  );

  assert.equal(
    (
      first.record
        .metadata
        .nested as
        Record<
          string,
          unknown
        >
    )
      .safeValue,
    "kept",
  );

  pass(
    "hidden/private scratch-reasoning fields are redacted while ordinary audit metadata remains inspectable",
  );

  const queried =
    await recorder
      .findByCorrelationId(
        "task:oh4aa:test",
      );

  assert.equal(
    queried.length,
    1,
  );

  assert.equal(
    queried[0]
      ?.id,
    first.record.id,
  );

  pass(
    "provenance records can be reconstructed from the Event Spine by correlation ID",
  );

  const second =
    await recorder.record(
      baseInput(),
    );

  assert.equal(
    second.record.id,
    first.record.id,
  );

  pass(
    "equivalent decision material receives a stable provenance identity for dedupe/audit correlation",
  );

  await assert.rejects(
    () =>
      recorder.record({
        ...baseInput(),

        stages: [
          ...baseInput()
            .stages,

          {
            stage:
              "model-route",

            status:
              "selected",

            decision:
              "duplicate",

            reasons:
              [],

            evidenceRefs:
              [],
          },
        ],
      }),
    /appears more than once/i,
  );

  pass(
    "duplicate stage claims fail closed instead of creating an ambiguous provenance trail",
  );

  class FailingAccess
    extends MemoryEventAccess
  {
    override async publish<TPayload>(
      _input:
        ChernobogEventInput<TPayload>,
    ): Promise<
      ChernobogEventPublishResult
    > {
      throw new Error(
        "simulated event persistence failure",
      );
    }
  }

  const failing =
    new DecisionProvenanceRecorder({
      access:
        new FailingAccess(),
    });

  await assert.rejects(
    () =>
      failing.record(
        baseInput(),
      ),
    /simulated event persistence failure/i,
  );

  pass(
    "important decision provenance fails visibly when durable Event Spine persistence fails instead of silently claiming traceability",
  );

  assert.equal(
    first.record
      .invariants
      .hiddenScratchReasoningRequired,
    false,
  );

  assert.equal(
    first.record
      .invariants
      .hiddenScratchReasoningPersisted,
    false,
  );

  assert.equal(
    first.record
      .invariants
      .routingMutated,
    false,
  );

  assert.equal(
    first.record
      .invariants
      .authorityMutated,
    false,
  );

  assert.equal(
    first.record
      .invariants
      .executionStarted,
    false,
  );

  pass(
    "OH-4AA observes and explains decisions without mutating routing, authority, execution, or hidden reasoning state",
  );

  console.log("");

  console.log(
    "OH-4AA decision provenance verification complete.",
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