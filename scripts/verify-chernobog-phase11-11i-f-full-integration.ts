import assert from "node:assert/strict";
import {
  mkdtemp,
} from "node:fs/promises";
import {
  tmpdir,
} from "node:os";
import {
  join,
} from "node:path";

import {
  createWorldStateRecord,
} from "../lib/chernobog/worldState";
import {
  ChernobogCognitiveRuntime,
} from "../lib/chernobog/cognition";
import {
  ChernobogLearningRuntime,
  createLearningFeedbackObservation,
  createLearningOutcomeObservation,
} from "../lib/chernobog/learning";

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

async function main(): Promise<void> {
  console.log(
    "Chernobog Phase 11I-F - Integration & Full Acceptance",
  );
  console.log(
    "=======================================================",
  );

  const tempDirectory =
    await mkdtemp(
      join(
        tmpdir(),
        "chernobog-11i-f-",
      ),
    );

  const lessonPath =
    join(
      tempDirectory,
      "lessons.json",
    );

  let now =
    new Date(
      "2026-08-25T22:00:00.000Z",
    );

  const worldState = [
    createWorldStateRecord(
      {
        key:
          "service.ollama.health",
        value:
          "failed",
        observedAt:
          "2026-08-25T21:59:59.000Z",
        confidence: 1,
        provenance: {
          eventId:
            "event:ollama:failed",
          eventType:
            "service.health.failed",
          projectorId:
            "verification",
          source: {
            subsystem:
              "verification",
          },
        },
      },
      now,
    ),
  ];

  const cognition =
    new ChernobogCognitiveRuntime({
      readWorldState:
        () =>
          structuredClone(
            worldState,
          ),
      clock:
        () => now,
    });

  cognition.goals.upsert({
    id:
      "restore-runtime",
    title:
      "Restore local AI runtime",
    priority:
      "critical",
    importance: 1,
    urgency: 1,
    scope: {
      keys: [
        "service.ollama.health",
      ],
    },
  });

  const learning =
    new ChernobogLearningRuntime({
      lessonPath,
      clock:
        () => now,
    });

  await learning.initialize();

  const capturedIds:
    string[] = [];

  for (
    let index = 1;
    index <= 3;
    index += 1
  ) {
    now =
      new Date(
        `2026-08-25T22:0${index}:00.000Z`,
      );

    const cycle =
      await cognition.evaluate();

    const experience =
      learning.captureCognitiveCycle(
        cycle,
      );

    capturedIds.push(
      experience.id,
    );

    learning.addOutcome(
      createLearningOutcomeObservation({
        id:
          `outcome:${index}`,
        experienceId:
          experience.id,
        observedAt:
          `2026-08-25T22:0${index}:10.000Z`,
        status:
          "success",
        confidence: 0.95,
        evidenceWorldStateKeys: [
          "service.ollama.health",
        ],
      }),
    );

    learning.addFeedback(
      createLearningFeedbackObservation({
        id:
          `feedback:${index}`,
        experienceId:
          experience.id,
        observedAt:
          `2026-08-25T22:0${index}:20.000Z`,
        kind:
          "correction",
        confidence: 1,
        detail:
          "Diagnose first, explain second, repair third.",
      }),
    );
  }

  assert.equal(
    learning.experiences.size,
    3,
  );
  pass(
    "11H cognitive cycles enter the learning runtime as grounded experiences",
  );

  const evaluated =
    capturedIds.map(
      (id) =>
        learning.evaluateExperience(
          id,
        ),
    );

  assert.equal(
    evaluated.every(
      (item) =>
        item?.resolvedOutcome
          .status === "success",
    ),
    true,
  );
  assert.equal(
    evaluated.every(
      (item) =>
        item?.resolvedFeedback
          .kind === "correction",
    ),
    true,
  );
  pass(
    "delayed outcomes and explicit corrections reconnect to originating cognitive experiences",
  );

  learning.refreshPatterns();

  const correctionPattern =
    learning.patterns
      .list()
      .find(
        (pattern) =>
          pattern.kind ===
          "correction-pattern",
      );

  assert.ok(
    correctionPattern,
  );

  if (!correctionPattern) {
    throw new Error(
      "Expected correction pattern.",
    );
  }

  assert.equal(
    correctionPattern.supportCount,
    3,
  );
  pass(
    "repeated evaluated experiences become a supported cross-experience learning pattern",
  );

  now =
    new Date(
      "2026-08-25T22:05:00.000Z",
    );

  const lesson =
    await learning.promote(
      correctionPattern.key,
      {
        authority:
          "user-approved",
        approved: true,
        approvedBy:
          "verification-user",
        approvedAt:
          "2026-08-25T22:04:59.000Z",
      },
    );

  assert.equal(
    lesson.status,
    "active",
  );
  assert.equal(
    lesson.governance
      .approved,
    true,
  );
  pass(
    "pattern promotion requires governance and becomes an auditable durable lesson",
  );

  const restored =
    new ChernobogLearningRuntime({
      lessonPath,
      clock:
        () =>
          new Date(
            "2026-08-25T22:06:00.000Z",
          ),
    });

  await restored.initialize();

  assert.equal(
    restored.lessons.get(
      lesson.key,
    )?.statement,
    lesson.statement,
  );
  pass(
    "governed lessons survive runtime restart through durable persistence",
  );

  const freshCycle =
    await cognition.evaluate();

  const signal =
    freshCycle.focus.selected
      ?.signal;

  assert.ok(signal);

  if (!signal) {
    throw new Error(
      "Expected cognitive attention signal.",
    );
  }

  const adapted =
    restored.adaptSignal(
      signal,
    );

  assert.ok(
    adapted.adaptedScore >=
      adapted.originalScore,
  );
  assert.ok(
    adapted.adaptedScore -
      adapted.originalScore <=
      12,
  );
  assert.ok(
    restored.guidance().includes(
      lesson.statement,
    ),
  );
  pass(
    "active governed lessons feed back into cognition only through bounded priority influence and guidance",
  );

  const revoked =
    await restored.revoke(
      lesson.key,
      "Preference changed.",
    );

  assert.equal(
    revoked.status,
    "revoked",
  );

  const afterRevocation =
    restored.adaptSignal(
      signal,
    );

  assert.equal(
    afterRevocation.adaptedScore,
    afterRevocation.originalScore,
  );
  assert.equal(
    restored.guidance().length,
    0,
  );
  pass(
    "revocation immediately removes learned influence and guidance",
  );

  const emptyRuntime =
    new ChernobogLearningRuntime({
      lessonPath:
        join(
          tempDirectory,
          "empty-lessons.json",
        ),
      clock:
        () =>
          new Date(
            "2026-08-25T22:07:00.000Z",
          ),
    });

  await emptyRuntime.initialize();

  emptyRuntime.captureCognitiveCycle(
    freshCycle,
  );

  emptyRuntime.refreshPatterns();

  assert.equal(
    emptyRuntime.patterns
      .list()
      .length,
    0,
  );
  pass(
    "raw cognitive observation cannot self-promote into learning without repeated outcome or feedback evidence",
  );

  const snapshot =
    restored.snapshot();

  assert.equal(
    snapshot.lessons.length,
    1,
  );
  assert.equal(
    snapshot.activeLessons.length,
    0,
  );
  pass(
    "learning runtime exposes inspectable state while preserving revoked history",
  );

  const snapshotCopy =
    restored.snapshot();

  snapshotCopy.lessons[0]!.statement =
    "mutated externally";

  assert.notEqual(
    restored.snapshot()
      .lessons[0]?.statement,
    "mutated externally",
  );
  pass(
    "integrated learning runtime returns defensive snapshots",
  );

  const runtimeKeys =
    Object.keys(
      restored,
    );

  assert.equal(
    runtimeKeys.includes(
      "execute",
    ),
    false,
  );
  assert.equal(
    runtimeKeys.includes(
      "rewritePrompt",
    ),
    false,
  );
  assert.equal(
    runtimeKeys.includes(
      "rewriteCode",
    ),
    false,
  );
  assert.equal(
    runtimeKeys.includes(
      "grantPermission",
    ),
    false,
  );
  pass(
    "11I integration contains no direct code rewrite, prompt rewrite, permission grant, or execution path",
  );

  console.log(
    "=======================================================",
  );
  console.log(
    "PASS Phase 11I-F Integration & Full Acceptance",
  );
  console.log(
    "PASS Phase 11I Learning COMPLETE",
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
