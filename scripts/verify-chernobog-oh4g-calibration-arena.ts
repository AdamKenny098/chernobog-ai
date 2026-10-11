import assert from "node:assert/strict";
import {
  CalibrationArena,
  type CalibrationCandidate,
  type CalibrationTask,
} from "@chernobog/models/calibrationArena";
import {
  EvaluationFramework,
  createEvaluationMethodResult,
} from "@chernobog/models/evaluation";

function pass(
  message: string,
) {
  console.log(
    `PASS ${message}`,
  );
}

async function main() {
  console.log(
    "Chernobog OH-4G â€” Calibration Arena Verification",
  );
  console.log(
    "===============================================",
  );

  const framework =
    new EvaluationFramework({
      telemetryRecorder:
        async () => {},
    });

  framework.registerMethod({
    id:
      "objective.answer-quality",
    label:
      "Answer quality",
    kind:
      "rubric",
    perspective:
      "objective",
    weight:
      1,
    required:
      true,
    executor:
      ({
        artifact,
        method,
      }) => {
        const output =
          String(
            artifact.output ??
            "",
          );

        const expected =
          String(
            artifact.expected ??
            "",
          );

        const score =
          output.includes(
            expected,
          )
            ? 1
            : 0.25;

        return createEvaluationMethodResult({
          methodId:
            method.id,
          kind:
            method.kind,
          perspective:
            method.perspective,
          score,
          passThreshold:
            0.5,
          summary:
            "Deterministic calibration quality score.",
        });
      },
  });

  framework.registerMethod({
    id:
      "subjective.style",
    label:
      "Style preference",
    kind:
      "human-preference",
    perspective:
      "subjective",
    weight:
      1,
    required:
      false,
    executor:
      ({
        artifact,
        method,
      }) => {
        const output =
          String(
            artifact.output ??
            "",
          );

        return createEvaluationMethodResult({
          methodId:
            method.id,
          kind:
            method.kind,
          perspective:
            method.perspective,
          score:
            output.includes(
              "concise",
            )
              ? 0.9
              : 0.4,
          summary:
            "Synthetic preference signal for verifier.",
        });
      },
  });

  framework.registerProfile({
    taskClass:
      "planning",
    methodIds: [
      "objective.answer-quality",
      "subjective.style",
    ],
    objectivePassThreshold:
      0.5,
    objectiveMinimumCoverage:
      1,
  });

  const candidates:
    CalibrationCandidate[] = [
      {
        id:
          "alpha-direct",
        provider:
          "fake",
        modelId:
          "alpha",
        strategyId:
          "direct",
      },
      {
        id:
          "beta-direct",
        provider:
          "fake",
        modelId:
          "beta",
        strategyId:
          "direct",
      },
      {
        id:
          "alpha-structured",
        provider:
          "fake",
        modelId:
          "alpha",
        strategyId:
          "structured",
      },
    ];

  const tasks:
    CalibrationTask[] = [
      {
        id:
          "plan-1",
        taskClass:
          "planning",
        input:
          "Build a release plan",
        expected:
          "release",
      },
      {
        id:
          "plan-2",
        taskClass:
          "planning",
        input:
          "Build a migration plan",
        expected:
          "migration",
      },
    ];

  const observedInputs:
    Array<{
      candidateId: string;
      taskId: string;
      input: unknown;
    }> =
      [];

  const arena =
    new CalibrationArena(
      framework,
      async (
        candidate,
        task,
      ) => {
        observedInputs.push({
          candidateId:
            candidate.id,
          taskId:
            task.id,
          input:
            structuredClone(
              task.input,
            ),
        });

        const expected =
          String(
            task.expected,
          );

        const strong =
          candidate.modelId ===
            "alpha" ||
          candidate.strategyId ===
            "structured";

        return {
          candidateId:
            candidate.id,
          taskId:
            task.id,
          ok:
            true,
          output:
            strong
              ? `${expected} concise`
              : "generic verbose",
          durationMs:
            candidate.modelId ===
            "alpha"
              ? 10
              : 20,
        };
      },
    );

  const result =
    await arena.run(
      candidates,
      tasks,
      {
        blind:
          true,
      },
    );

  assert.equal(
    result.samples.length,
    6,
  );

  pass(
    "arena executes every candidate against every equivalent calibration task",
  );

  for (
    const task
    of tasks
  ) {
    const observed =
      observedInputs.filter(
        (item) =>
          item.taskId ===
          task.id,
      );

    assert.equal(
      observed.length,
      candidates.length,
    );

    assert.deepEqual(
      observed.map(
        (item) =>
          item.input,
      ),
      candidates.map(
        () =>
          task.input,
      ),
    );
  }

  pass(
    "candidate comparison preserves equivalent task inputs",
  );

  assert.deepEqual(
    Object.values(
      result.blindMap,
    ),
    [
      "candidate-01",
      "candidate-02",
      "candidate-03",
    ],
  );

  assert.ok(
    result.samples.every(
      (sample) =>
        sample.evaluation
          ?.results.every(
            (methodResult) =>
              methodResult.methodId.length >
              0,
          ),
    ),
  );

  pass(
    "blind calibration uses anonymous labels while still evaluating every successful sample through OH-4F",
  );

  const alphaModel =
    result.capabilityScores.find(
      (score) =>
        score.subjectKind ===
          "model" &&
        score.subjectId ===
          "alpha" &&
        score.taskClass ===
          "planning",
    );

  const betaModel =
    result.capabilityScores.find(
      (score) =>
        score.subjectKind ===
          "model" &&
        score.subjectId ===
          "beta" &&
        score.taskClass ===
          "planning",
    );

  assert.ok(
    alphaModel,
  );

  assert.ok(
    betaModel,
  );

  assert.equal(
    alphaModel.objectiveScore,
    1,
  );

  assert.equal(
    betaModel.objectiveScore,
    0.25,
  );

  assert.equal(
    alphaModel.subjectiveScore,
    0.9,
  );

  assert.equal(
    betaModel.subjectiveScore,
    0.4,
  );

  pass(
    "arena establishes separate empirical objective and subjective capability scores per model",
  );

  const structuredStrategy =
    result.capabilityScores.find(
      (score) =>
        score.subjectKind ===
          "strategy" &&
        score.subjectId ===
          "structured" &&
        score.taskClass ===
          "planning",
    );

  assert.ok(
    structuredStrategy,
  );

  assert.equal(
    structuredStrategy.objectiveScore,
    1,
  );

  pass(
    "arena scores strategy performance separately from model performance",
  );

  const candidateScore =
    result.capabilityScores.find(
      (score) =>
        score.subjectKind ===
          "candidate" &&
        score.subjectId ===
          "alpha-direct",
    );

  assert.equal(
    candidateScore?.sampleCount,
    2,
  );

  assert.equal(
    candidateScore?.blindSamples,
    2,
  );

  assert.equal(
    candidateScore?.executionSuccessRate,
    1,
  );

  pass(
    "arena records empirical sample counts, success rate, pass rate and blind coverage",
  );

  console.log("");
  console.log(
    "OH-4G calibration arena verification complete.",
  );
}

void main().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);