import assert from "node:assert/strict";
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
    "Chernobog OH-4F â€” Evaluation Framework Verification",
  );
  console.log(
    "==================================================",
  );

  const telemetry:
    string[] =
      [];

  const framework =
    new EvaluationFramework({
      telemetryRecorder:
        async ({
          methodId,
        }) => {
          telemetry.push(
            methodId,
          );
        },
    });

  framework.registerMethod({
    id:
      "tests.schema",
    label:
      "Schema tests",
    kind:
      "automated-test",
    perspective:
      "objective",
    weight:
      2,
    required:
      true,
    executor:
      ({ method }) =>
        createEvaluationMethodResult({
          methodId:
            method.id,
          kind:
            method.kind,
          perspective:
            method.perspective,
          score:
            1,
          summary:
            "All deterministic schema tests passed.",
          evidence: [
            {
              label:
                "schema",
              detail:
                "3/3 tests passed",
              source:
                "test",
            },
          ],
        }),
  });

  framework.registerMethod({
    id:
      "validator.grounding",
    label:
      "Grounding validator",
    kind:
      "validator",
    perspective:
      "objective",
    weight:
      2,
    required:
      true,
    executor:
      ({ method }) =>
        createEvaluationMethodResult({
          methodId:
            method.id,
          kind:
            method.kind,
          perspective:
            method.perspective,
          score:
            0.8,
          passThreshold:
            0.75,
          summary:
            "Grounding validator passed.",
          evidence: [
            {
              label:
                "grounding",
              detail:
                "No unsupported claims detected.",
              source:
                "validator",
            },
          ],
        }),
  });

  framework.registerMethod({
    id:
      "facts.primary",
    label:
      "Factual check",
    kind:
      "factual-check",
    perspective:
      "objective",
    weight:
      1,
    required:
      false,
    executor:
      ({ method }) =>
        createEvaluationMethodResult({
          methodId:
            method.id,
          kind:
            method.kind,
          perspective:
            method.perspective,
          score:
            0.6,
          passThreshold:
            0.5,
          summary:
            "Factual spot-check passed.",
          evidence: [
            {
              label:
                "facts",
              detail:
                "3/5 claims independently checked.",
              source:
                "fact",
            },
          ],
        }),
  });

  framework.registerMethod({
    id:
      "rubric.quality",
    label:
      "Quality rubric",
    kind:
      "rubric",
    perspective:
      "objective",
    weight:
      1,
    required:
      false,
    executor:
      ({ method }) =>
        createEvaluationMethodResult({
          methodId:
            method.id,
          kind:
            method.kind,
          perspective:
            method.perspective,
          score:
            0.7,
          summary:
            "Quality rubric scored 0.7.",
          evidence: [
            {
              label:
                "rubric",
              detail:
                "Clarity 0.8, completeness 0.6.",
              source:
                "rubric",
            },
          ],
        }),
  });

  framework.registerMethod({
    id:
      "preference.user",
    label:
      "User preference",
    kind:
      "human-preference",
    perspective:
      "subjective",
    weight:
      1,
    required:
      false,
    executor:
      ({ method }) =>
        createEvaluationMethodResult({
          methodId:
            method.id,
          kind:
            method.kind,
          perspective:
            method.perspective,
          score:
            0.9,
          summary:
            "User strongly preferred this response.",
          evidence: [
            {
              label:
                "preference",
              detail:
                "Human preference signal.",
              source:
                "human",
            },
          ],
        }),
  });

  pass(
    "framework registers tests, validators, rubrics, factual checks and human preference methods",
  );

  assert.throws(
    () =>
      framework.registerMethod({
        id:
          "bad.preference",
        label:
          "Invalid preference",
        kind:
          "human-preference",
        perspective:
          "objective",
        weight:
          1,
        required:
          false,
        executor:
          () =>
            createEvaluationMethodResult({
              methodId:
                "bad.preference",
              kind:
                "human-preference",
              perspective:
                "objective",
              score:
                1,
              summary:
                "invalid",
            }),
      }),
    /must be subjective/,
  );

  assert.throws(
    () =>
      framework.registerMethod({
        id:
          "bad.validator",
        label:
          "Invalid validator",
        kind:
          "validator",
        perspective:
          "subjective",
        weight:
          1,
        required:
          false,
        executor:
          () =>
            createEvaluationMethodResult({
              methodId:
                "bad.validator",
              kind:
                "validator",
              perspective:
                "subjective",
              score:
                1,
              summary:
                "invalid",
            }),
      }),
    /must be objective/,
  );

  pass(
    "framework enforces objective/subjective method boundaries",
  );

  framework.registerProfile({
    taskClass:
      "planning",
    methodIds: [
      "tests.schema",
      "validator.grounding",
      "facts.primary",
      "rubric.quality",
      "preference.user",
    ],
    objectivePassThreshold:
      0.7,
    objectiveMinimumCoverage:
      1,
    requireSubjectiveSignal:
      true,
  });

  const report =
    await framework.evaluate({
      taskClass:
        "planning",
      input:
        "Plan a project.",
      output:
        "Structured project plan.",
      provider:
        "fake",
      model:
        "alpha",
      correlationId:
        "eval-1",
    });

  assert.equal(
    report.outcome,
    "pass",
  );

  assert.equal(
    report.results.length,
    5,
  );

  assert.ok(
    report.objective.available,
  );

  assert.ok(
    report.subjective.available,
  );

  assert.equal(
    report.objective.methodCount,
    4,
  );

  assert.equal(
    report.subjective.methodCount,
    1,
  );

  pass(
    "task-class profile executes structured weighted evaluation",
  );

  assert.notEqual(
    report.objective.score,
    report.subjective.score,
  );

  assert.equal(
    report.subjective.score,
    0.9,
  );

  pass(
    "objective quality and subjective preference remain separate score channels",
  );

  assert.deepEqual(
    telemetry.sort(),
    [
      "facts.primary",
      "preference.user",
      "rubric.quality",
      "tests.schema",
      "validator.grounding",
    ].sort(),
  );

  pass(
    "every evaluation method emits a telemetry signal through the injected boundary",
  );

  const failing =
    new EvaluationFramework({
      telemetryRecorder:
        async () => {},
    });

  failing.registerMethod({
    id:
      "required.validator",
    label:
      "Required validator",
    kind:
      "validator",
    perspective:
      "objective",
    weight:
      1,
    required:
      true,
    executor:
      ({ method }) =>
        createEvaluationMethodResult({
          methodId:
            method.id,
          kind:
            method.kind,
          perspective:
            method.perspective,
          score:
            0.2,
          passed:
            false,
          summary:
            "Critical validation failed.",
          issues: [
            {
              code:
                "critical",
              message:
                "Required evidence missing.",
              severity:
                "error",
            },
          ],
        }),
  });

  failing.registerProfile({
    taskClass:
      "factual",
    methodIds: [
      "required.validator",
    ],
    objectivePassThreshold:
      0.5,
    objectiveMinimumCoverage:
      1,
  });

  const failedReport =
    await failing.evaluate({
      taskClass:
        "factual",
      input:
        "question",
      output:
        "answer",
    });

  assert.equal(
    failedReport.outcome,
    "fail",
  );

  assert.deepEqual(
    failedReport.requiredFailures,
    [
      "required.validator",
    ],
  );

  pass(
    "required evaluation failures deterministically fail the report",
  );

  const missing =
    new EvaluationFramework({
      telemetryRecorder:
        async () => {},
    });

  missing.registerProfile({
    taskClass:
      "code",
    methodIds: [
      "missing.test",
    ],
    objectivePassThreshold:
      0.8,
    objectiveMinimumCoverage:
      1,
  });

  const missingReport =
    await missing.evaluate({
      taskClass:
        "code",
      input:
        "code task",
      output:
        "code output",
    });

  assert.equal(
    missingReport.outcome,
    "fail",
  );

  assert.deepEqual(
    missingReport.missingMethods,
    [
      "missing.test",
    ],
  );

  pass(
    "missing required evaluation machinery cannot silently produce a passing score",
  );

  console.log("");
  console.log(
    "OH-4F evaluation framework verification complete.",
  );
}

void main().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);