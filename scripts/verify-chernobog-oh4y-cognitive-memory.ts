import assert from "node:assert/strict";

import {
  COGNITIVE_MEMORY_VERSION,
  CognitiveMemory,
} from "@chernobog/models/cognitiveMemory";

import {
  getChernobogLearningRuntime,
} from "@/lib/chernobog/learning";

function pass(
  message: string,
) {
  console.log(
    `PASS ${message}`,
  );
}

async function main() {
  console.log(
    "Chernobog OH-4Y â€” Cognitive Memory Verification",
  );
  console.log(
    "==============================================",
  );

  const runtime =
    await getChernobogLearningRuntime();

  runtime.experiences
    .clear();

  runtime.evaluations
    .clear();

  runtime.patterns
    .clear();

  const initialLessonCount =
    runtime.lessons
      .list()
      .length;

  const memory =
    new CognitiveMemory();

  const first =
    await memory.record({
      occurredAt:
        "2026-10-11T09:00:00.000Z",

      recordedAt:
        "2026-10-11T09:00:01.000Z",

      artifacts: {
        taskId:
          "task:success:1",

        projectId:
          "chernobog",

        taskKind:
          "code-change",

        domain:
          "coding",

        modelId:
          "ollama:qwen",

        strategy:
          "critic-loop",

        verificationVerdict:
          "pass",

        confidenceScore:
          0.93,

        escalationKind:
          "none",

        authorityStatus:
          "permitted",

        actionStatus:
          "completed",

        sourceVersions: {
          criticVerification:
            "oh4t.test",

          confidenceEngine:
            "oh4u.test",

          authorityBridge:
            "oh4w.test",

          actionBridge:
            "oh4x.test",
        },
      },

      execution: {
        actionIntentId:
          "intent:1",

        idempotencyKey:
          "oh4x:test:1",

        targetKind:
          "tool",

        targetName:
          "write_project_file",

        status:
          "completed",
      },

      outcome: {
        status:
          "success",

        score:
          1,

        confidence:
          0.95,

        detail:
          "Verifier and typecheck passed.",
      },

      evidence: {
        eventIds: [
          "event:1",
        ],

        cognitiveDecisionIds: [
          "decision:1",
        ],
      },
    });

  assert.equal(
    first.version,
    COGNITIVE_MEMORY_VERSION,
  );

  assert.equal(
    first.evaluation
      .resolvedOutcome
      .status,
    "success",
  );

  assert.equal(
    first.experience
      .context
      .projectId,
    "chernobog",
  );

  assert.equal(
    first.invariants
      .automaticLessonPromotion,
    false,
  );

  pass(
    "successful OH-4 task outcome becomes a grounded learning experience with project/model/strategy provenance",
  );

  await memory.record({
    occurredAt:
      "2026-10-11T09:01:00.000Z",

    recordedAt:
      "2026-10-11T09:01:01.000Z",

    artifacts: {
      taskId:
        "task:success:2",

      projectId:
        "chernobog",

      taskKind:
        "code-change",

      domain:
        "coding",

      modelId:
        "ollama:qwen",

      strategy:
        "critic-loop",

      verificationVerdict:
        "pass",

      confidenceScore:
        0.91,
    },

    outcome: {
      status:
        "success",

      score:
        0.9,

      confidence:
        0.92,

      detail:
        "Second independently observed success.",
    },
  });

  const third =
    await memory.record({
      occurredAt:
        "2026-10-11T09:02:00.000Z",

      recordedAt:
        "2026-10-11T09:02:01.000Z",

      artifacts: {
        taskId:
          "task:success:3",

        projectId:
          "chernobog",

        taskKind:
          "code-change",

        domain:
          "coding",

        modelId:
          "ollama:qwen",

        strategy:
          "critic-loop",

        verificationVerdict:
          "pass",

        confidenceScore:
          0.94,
      },

      outcome: {
        status:
          "success",

        score:
          1,

        confidence:
          0.96,

        detail:
          "Third independently observed success.",
      },
    });

  assert.ok(
    third.patternRefresh
      .activeProjectPatterns
      .some(
        (pattern) =>
          pattern.kind ===
          "success-pattern",
      ),
  );

  pass(
    "repeated project-scoped successes can mature into learning-pattern candidates through the existing pattern extractor",
  );

  const failure =
    await memory.record({
      occurredAt:
        "2026-10-11T09:03:00.000Z",

      recordedAt:
        "2026-10-11T09:03:01.000Z",

      artifacts: {
        taskId:
          "task:failure:1",

        projectId:
          "chernobog",

        taskKind:
          "repo-migration",

        domain:
          "coding",

        modelId:
          "ollama:small",

        strategy:
          "single-model",

        verificationVerdict:
          "reject",

        confidenceScore:
          0.12,

        escalationKind:
          "switch-model",

        authorityStatus:
          "blocked",

        actionStatus:
          "not-run",
      },

      execution: {
        status:
          "failed",

        failureKind:
          "verification-failed",

        detail:
          "Candidate failed deterministic verification.",
      },

      outcome: {
        status:
          "failure",

        score:
          -1,

        confidence:
          1,

        detail:
          "Deterministic verifier rejected the result.",
      },
    });

  assert.equal(
    failure.evaluation
      .resolvedOutcome
      .status,
    "failure",
  );

  assert.equal(
    failure.experience
      .context
      .escalationKind,
    "switch-model",
  );

  pass(
    "failures and recovery context are retained as outcome evidence instead of being discarded",
  );

  const preference =
    await memory.record({
      occurredAt:
        "2026-10-11T09:04:00.000Z",

      recordedAt:
        "2026-10-11T09:04:01.000Z",

      artifacts: {
        taskId:
          "task:preference:1",

        projectId:
          "chernobog",

        taskKind:
          "creative-response",

        domain:
          "creative",

        modelId:
          "ollama:creative",

        strategy:
          "single-model",

        confidenceScore:
          0.8,
      },

      feedback: {
        kind:
          "explicit-positive",

        confidence:
          1,

        detail:
          "User preferred this voice and pacing.",
      },
    });

  assert.equal(
    preference.evaluation
      .resolvedFeedback
      .kind,
    "explicit-positive",
  );

  assert.equal(
    preference.evaluation
      .resolvedOutcome
      .status,
    "unknown",
  );

  pass(
    "subjective preference remains separate from objective task outcome",
  );

  const correction =
    await memory.record({
      occurredAt:
        "2026-10-11T09:05:00.000Z",

      recordedAt:
        "2026-10-11T09:05:01.000Z",

      artifacts: {
        taskId:
          "task:correction:1",

        projectId:
          "chernobog",

        taskKind:
          "roadmap-recall",

        domain:
          "project-memory",

        modelId:
          "ollama:qwen",

        strategy:
          "single-model",

        confidenceScore:
          0.6,
      },

      feedback: {
        kind:
          "correction",

        confidence:
          1,

        detail:
          "OH-4V was complete; do not report it as active.",
      },
    });

  assert.equal(
    correction.evaluation
      .resolvedFeedback
      .kind,
    "correction",
  );

  assert.equal(
    correction.invariants
      .directLearnedLessonWrite,
    false,
  );

  pass(
    "explicit corrections enter the governed learning-evaluation path without becoming instant durable truth",
  );

  const lessonCountAfter =
    runtime.lessons
      .list()
      .length;

  assert.equal(
    lessonCountAfter,
    initialLessonCount,
  );

  assert.equal(
    correction.lessonState
      .lessonPromotionPerformed,
    false,
  );

  pass(
    "OH-4Y never promotes learned lessons automatically; the existing governed lesson-promotion gate retains authority",
  );

  const snapshot =
    runtime.snapshot();

  assert.ok(
    snapshot.experiences
      .length >=
    6,
  );

  assert.ok(
    snapshot.patterns
      .every(
        (pattern) =>
          pattern.scope ===
            "global" ||
          (
            pattern.scope ===
              "project" &&
            Boolean(
              pattern.projectId,
            )
          ),
      ),
  );

  pass(
    "recorded cognitive memory reuses the canonical learning runtime and preserves global/project scoping",
  );

  console.log("");
  console.log(
    "OH-4Y cognitive memory verification complete.",
  );
}

void main().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);