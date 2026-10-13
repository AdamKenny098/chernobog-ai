import assert from "node:assert/strict";

import {
  mkdtemp,
  readFile,
  rm,
} from "node:fs/promises";

import {
  tmpdir,
} from "node:os";

import {
  join,
} from "node:path";

import {
  CONTINUOUS_CALIBRATION_VERSION,
  ContinuousCalibrationEngine,
  type CalibrationObservation,
} from "@chernobog/models/continuousCalibration";

function pass(
  message: string,
) {
  console.log(
    `PASS ${message}`,
  );
}

function observation(
  input: {
    id: string;

    observedAt: string;

    source?:
      "real-work"
      | "scheduled-evaluation";

    modelVersion?:
      string;

    objectiveScore:
      number;

    preferenceScore?:
      number;

    userRating?:
      number;

    verdict?:
      "pass"
      | "revise"
      | "reject"
      | "blocked"
      | "unknown";

    executionSucceeded?:
      boolean;
  },
): CalibrationObservation {
  return {
    id:
      input.id,

    observedAt:
      input.observedAt,

    source:
      input.source ??
      "real-work",

    modelId:
      "ollama:qwen",

    modelVersion:
      input.modelVersion ??
      "v2",

    strategy:
      "critic-loop",

    task: {
      domain:
        "coding",

      complexity:
        "complex",

      factuality:
        "high",

      reasoningDepth:
        "deep",
    },

    objective: {
      score:
        input.objectiveScore,

      success:
        input.objectiveScore >=
        0.5,

      verificationVerdict:
        input.verdict ??
        (
          input.objectiveScore >=
          0.5
            ? "pass"
            : "reject"
        ),

      executionSucceeded:
        input
          .executionSucceeded,

      evidenceConfidence:
        1,
    },

    subjective:
      input.preferenceScore ===
        undefined &&
      input.userRating ===
        undefined
        ? undefined
        : {
            preferenceScore:
              input
                .preferenceScore,

            userRating:
              input
                .userRating,

            source:
              "explicit-user",
          },

    telemetry: {
      latencyMs:
        1000,

      cost:
        0,

      retries:
        0,

      fallbackCount:
        0,
    },
  };
}

async function main() {
  console.log(
    "Chernobog OH-4Z â€” Continuous Calibration Verification",
  );

  console.log(
    "=====================================================",
  );

  const now =
    new Date(
      "2026-10-11T10:00:00.000Z",
    );

  const engine =
    new ContinuousCalibrationEngine({
      clock:
        () => now,

      policy: {
        halfLifeDays:
          10,

        scheduledEvaluationIntervalDays:
          14,

        minimumEffectiveSamples:
          1,

        strongSampleCount:
          4,
      },
    });

  engine.ingestMany([
    observation({
      id:
        "real:1",

      observedAt:
        "2026-10-10T10:00:00.000Z",

      objectiveScore:
        0.9,

      verdict:
        "pass",

      executionSucceeded:
        true,
    }),

    observation({
      id:
        "real:2",

      observedAt:
        "2026-10-11T09:00:00.000Z",

      objectiveScore:
        1,

      verdict:
        "pass",

      executionSucceeded:
        true,
    }),
  ]);

  const realWorkEstimate =
    engine.estimate(
      {
        modelId:
          "ollama:qwen",

        modelVersion:
          "v2",

        strategy:
          "critic-loop",
      },

      "coding",
  );

  assert.equal(
    realWorkEstimate
      .sampleCount,
    2,
  );

  assert.ok(
    realWorkEstimate
      .objectiveScore >
    0.9,
  );

  assert.equal(
    realWorkEstimate
      .sourceCounts
      .realWork,
    2,
  );

  pass(
    "real-work outcomes continuously update empirical objective capability estimates",
  );

  const beforePreference =
    realWorkEstimate
      .objectiveScore;

  engine.ingest(
    observation({
      id:
        "preference-only",

      observedAt:
        "2026-10-11T09:30:00.000Z",

      objectiveScore:
        beforePreference,

      preferenceScore:
        0,

      userRating:
        0,
    }),
  );

  const preferenceEstimate =
    engine.estimate(
      {
        modelId:
          "ollama:qwen",

        modelVersion:
          "v2",

        strategy:
          "critic-loop",
      },

      "coding",
  );

  assert.ok(
    preferenceEstimate
      .subjective
      .sampleCount >
    0,
  );

  assert.ok(
    Math.abs(
      preferenceEstimate
        .objectiveScore -
      beforePreference,
    ) <
    0.02,
  );

  pass(
    "subjective preference is tracked separately and cannot directly redefine objective capability",
  );

  engine.ingest(
    observation({
      id:
        "scheduled:1",

      observedAt:
        "2026-10-11T09:45:00.000Z",

      source:
        "scheduled-evaluation",

      objectiveScore:
        0.95,

      verdict:
        "pass",
    }),
  );

  const scheduledEstimate =
    engine.estimate(
      {
        modelId:
          "ollama:qwen",

        modelVersion:
          "v2",

        strategy:
          "critic-loop",
      },

      "coding",
  );

  assert.equal(
    scheduledEstimate
      .sourceCounts
      .scheduledEvaluation,
    1,
  );

  assert.equal(
    scheduledEstimate
      .recalibration
      .reasons
      .includes(
        "no-scheduled-evaluation-for-current-version",
      ),
    false,
  );

  pass(
    "scheduled evaluation evidence refreshes the current-version benchmark state",
  );

  const recency =
    new ContinuousCalibrationEngine({
      clock:
        () => now,

      policy: {
        halfLifeDays:
          2,

        minimumEffectiveSamples:
          0.1,

        strongSampleCount:
          2,
      },
    });

  recency.ingestMany([
    observation({
      id:
        "old-bad",

      observedAt:
        "2026-09-01T10:00:00.000Z",

      objectiveScore:
        0,
    }),

    observation({
      id:
        "recent-good",

      observedAt:
        "2026-10-11T09:00:00.000Z",

      objectiveScore:
        1,
    }),
  ]);

  const recencyEstimate =
    recency.estimate(
      {
        modelId:
          "ollama:qwen",

        modelVersion:
          "v2",

        strategy:
          "critic-loop",
      },

      "coding",
  );

  assert.ok(
    recencyEstimate
      .objectiveScore >
    0.95,
  );

  pass(
    "recency decay prevents ancient benchmark failures from fossilizing current capability estimates",
  );

  const versionIsolation =
    new ContinuousCalibrationEngine({
      clock:
        () => now,

      policy: {
        minimumEffectiveSamples:
          0.1,
      },
    });

  versionIsolation.ingestMany([
    observation({
      id:
        "v1-great",

      observedAt:
        "2026-10-11T08:00:00.000Z",

      modelVersion:
        "v1",

      objectiveScore:
        1,
    }),

    observation({
      id:
        "v2-poor",

      observedAt:
        "2026-10-11T09:00:00.000Z",

      modelVersion:
        "v2",

      objectiveScore:
        0.2,
    }),
  ]);

  const v2Estimate =
    versionIsolation.estimate(
      {
        modelId:
          "ollama:qwen",

        modelVersion:
          "v2",

        strategy:
          "critic-loop",
      },

      "coding",
  );

  assert.ok(
    v2Estimate
      .objectiveScore <
    0.3,
  );

  assert.equal(
    v2Estimate
      .sampleCount,
    1,
  );

  pass(
    "old model-version evidence cannot leak into a new model version's capability estimate",
  );

  const staleEngine =
    new ContinuousCalibrationEngine({
      clock:
        () => now,

      policy: {
        scheduledEvaluationIntervalDays:
          7,

        minimumEffectiveSamples:
          0.1,
      },
    });

  staleEngine.ingest(
    observation({
      id:
        "stale-scheduled",

      observedAt:
        "2026-09-20T10:00:00.000Z",

      source:
        "scheduled-evaluation",

      objectiveScore:
        0.9,
    }),
  );

  const staleSnapshot =
    staleEngine.snapshot([
      {
        modelId:
          "ollama:qwen",

        modelVersion:
          "v2",

        strategy:
          "critic-loop",

        domains: [
          "coding",
        ],
      },

      {
        modelId:
          "ollama:new-model",

        modelVersion:
          "2026-10",

        strategy:
          "single-model",

        domains: [
          "coding",
        ],
      },
    ]);

  assert.equal(
    staleSnapshot.version,
    CONTINUOUS_CALIBRATION_VERSION,
  );

  assert.ok(
    staleSnapshot
      .dueSubjects
      .some(
        (subject) =>
          subject.modelId ===
            "ollama:qwen" &&
          subject.reasons
            .includes(
              "scheduled-evaluation-stale",
            ),
      ),
  );

  assert.ok(
    staleSnapshot
      .dueSubjects
      .some(
        (subject) =>
          subject.modelId ===
            "ollama:new-model" &&
          subject.reasons
            .includes(
              "no-scheduled-evaluation-for-current-version",
            ),
      ),
  );

  pass(
    "stale and never-evaluated current model versions are surfaced for scheduled recalibration",
  );

  const tempRoot =
    await mkdtemp(
      join(
        tmpdir(),
        "chernobog-oh4z-",
      ),
    );

  const filePath =
    join(
      tempRoot,
      "calibration.json",
    );

  try {
    const persisted =
      new ContinuousCalibrationEngine({
        filePath,

        clock:
          () => now,
      });

    persisted.ingest(
      observation({
        id:
          "persisted:1",

        observedAt:
          "2026-10-11T09:59:00.000Z",

        source:
          "scheduled-evaluation",

        objectiveScore:
          0.88,
      }),
    );

    await persisted.save();

    const raw =
      await readFile(
        filePath,
        "utf8",
      );

    assert.match(
      raw,
      /persisted:1/,
    );

    const restored =
      new ContinuousCalibrationEngine({
        filePath,

        clock:
          () => now,
      });

    await restored.load();

    assert.equal(
      restored.size,
      1,
    );

    assert.equal(
      restored.list()[0]
        ?.id,
      "persisted:1",
    );

    pass(
      "continuous calibration evidence persists atomically and survives runtime restart",
    );
  } finally {
    await rm(
      tempRoot,
      {
        recursive:
          true,

        force:
          true,
      },
    );
  }

  const invariants =
    engine.snapshot([
      {
        modelId:
          "ollama:qwen",

        modelVersion:
          "v2",

        strategy:
          "critic-loop",

        domains: [
          "coding",
        ],
      },
    ]).invariants;

  assert.equal(
    invariants
      .subjectivePreferenceAffectsObjectiveScore,
    false,
  );

  assert.equal(
    invariants
      .crossVersionEvidenceMixed,
    false,
  );

  assert.equal(
    invariants
      .routingMutated,
    false,
  );

  assert.equal(
    invariants
      .registryMutated,
    false,
  );

  assert.equal(
    invariants
      .scheduledEvaluationExecuted,
    false,
  );

  pass(
    "OH-4Z updates empirical evidence only; routing/registry mutation and actual scheduled evaluation execution stay downstream",
  );

  console.log("");

  console.log(
    "OH-4Z continuous calibration verification complete.",
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