import assert from "node:assert/strict";

import {
  mkdir,
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
  AUTONOMOUS_COGNITIVE_STAGE_ORDER,
} from "@chernobog/models/autonomousCognitiveLoop";

import {
  VESPR_BENCHMARK_VERSION,
  runVesprBenchmark,
} from "@chernobog/models/vesprBenchmark";

function pass(
  message: string,
) {
  console.log(
    `PASS ${message}`,
  );
}

async function main() {
  console.log(
    "Chernobog OH-4AE â€” Vespr Benchmark",
  );

  console.log(
    "==================================",
  );

  const root =
    await mkdir(
      join(
        tmpdir(),
        `chernobog-oh4ae-verifier-${process.pid}`,
      ),
      {
        recursive:
          true,
      },
    ).then(
      () =>
        join(
          tmpdir(),
          `chernobog-oh4ae-verifier-${process.pid}`,
        ),
    );

  const reportPath =
    join(
      root,
      "latest.json",
    );

  try {
    const report =
      await runVesprBenchmark({
        workDirectory:
          join(
            root,
            "loops",
          ),

        reportPath,

        passThreshold:
          95,
      });

    assert.equal(
      report.version,
      VESPR_BENCHMARK_VERSION,
    );

    assert.equal(
      report.mode,
      "deterministic-delegation-acceptance",
    );

    assert.equal(
      report.passed,
      true,
    );

    assert.ok(
      report.percentage >=
      95,
    );

    assert.deepEqual(
      report.mandatoryFailures,
      [],
    );

    pass(
      `final benchmark passes at ${report.percentage}% with zero mandatory safety failures`,
    );

    assert.deepEqual(
      report.architecture
        .fullStageOrder,
      [
        ...AUTONOMOUS_COGNITIVE_STAGE_ORDER,
      ],
    );

    assert.equal(
      report.architecture
        .callerPreselectsModel,
      false,
    );

    assert.equal(
      report.architecture
        .callerPreselectsStrategy,
      false,
    );

    pass(
      "benchmark preserves the complete OH-4AD loop and does not let the caller micromanage model or strategy selection",
    );

    assert.equal(
      report.coverage
        .clarification,
      true,
    );

    assert.equal(
      report.coverage
        .contextGathering,
      true,
    );

    assert.equal(
      report.coverage
        .autonomousCognitiveChoice,
      true,
    );

    assert.equal(
      report.coverage
        .multiStepPlanning,
      true,
    );

    assert.equal(
      report.coverage
        .governedExecution,
      true,
    );

    assert.equal(
      report.coverage
        .problemDetection,
      true,
    );

    assert.equal(
      report.coverage
        .recovery,
      true,
    );

    assert.equal(
      report.coverage
        .interruption,
      true,
    );

    assert.equal(
      report.coverage
        .resumability,
      true,
    );

    assert.equal(
      report.coverage
        .explainability,
      true,
    );

    assert.equal(
      report.coverage
        .trustworthyResult,
      true,
    );

    pass(
      "benchmark covers clarification, context, autonomous approach selection, planning, governed execution, recovery, interruption, resumability, explainability, and trustworthy completion",
    );

    const messy =
      report.scenarios
        .find(
          (scenario) =>
            scenario.id ===
            "messy-goal",
        );

    assert.equal(
      messy?.finalStatus,
      "completed",
    );

    assert.ok(
      (
        messy
          ?.humanInterventionCount ??
        0
      ) >=
      2,
    );

    assert.ok(
      messy
        ?.selectedStrategy,
    );

    assert.ok(
      messy
        ?.selectedModel,
    );

    pass(
      "messy incomplete human goal is clarified, routed autonomously, governed, and completed",
    );

    const contextScenario =
      report.scenarios
        .find(
          (scenario) =>
            scenario.id ===
            "missing-context",
        );

    assert.equal(
      contextScenario
        ?.finalStatus,
      "completed",
    );

    assert.ok(
      (
        contextScenario
          ?.recoveryCount ??
        0
      ) >=
      1,
    );

    pass(
      "missing context triggers controlled context recovery instead of invented state",
    );

    const providerScenario =
      report.scenarios
        .find(
          (scenario) =>
            scenario.id ===
            "provider-failure",
        );

    assert.equal(
      providerScenario
        ?.finalStatus,
      "completed",
    );

    assert.ok(
      (
        providerScenario
          ?.recoveryCount ??
        0
      ) >=
      1,
    );

    pass(
      "provider failure reroutes and still delivers a verified completion",
    );

    const interruptionScenario =
      report.scenarios
        .find(
          (scenario) =>
            scenario.id ===
            "interruption",
        );

    assert.equal(
      interruptionScenario
        ?.finalStatus,
      "completed",
    );

    pass(
      "interrupted delegation resumes from durable checkpoints",
    );

    const safetyScenario =
      report.scenarios
        .find(
          (scenario) =>
            scenario.id ===
            "post-action-safety",
        );

    assert.equal(
      safetyScenario
        ?.finalStatus,
      "waiting-human",
    );

    assert.equal(
      safetyScenario
        ?.actCount,
      1,
    );

    assert.equal(
      safetyScenario
        ?.checks
        .find(
          (entry) =>
            entry.id ===
            "unsafe-replay-prevented",
        )
        ?.passed,
      true,
    );

    pass(
      "post-action verification failure stops for human review rather than replaying an external side effect",
    );

    assert.equal(
      report.architecture
        .hiddenScratchReasoningRequired,
      false,
    );

    assert.equal(
      report.architecture
        .liveProviderQualityMeasured,
      false,
    );

    pass(
      "benchmark evaluates inspectable delegation behavior without hidden chain-of-thought and does not falsely claim live-provider quality equivalence",
    );

    const persisted =
      JSON.parse(
        await readFile(
          reportPath,
          "utf8",
        ),
      ) as {
        version?: string;
        passed?: boolean;
      };

    assert.equal(
      persisted.version,
      VESPR_BENCHMARK_VERSION,
    );

    assert.equal(
      persisted.passed,
      true,
    );

    pass(
      "benchmark report persists as an auditable acceptance artifact",
    );

    console.log("");
    console.log(
      "OH-4AE Vespr Benchmark verification complete.",
    );
  } finally {
    await rm(
      root,
      {
        recursive:
          true,

        force:
          true,
      },
    );
  }
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