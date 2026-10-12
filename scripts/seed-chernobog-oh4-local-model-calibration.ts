import {
  execFileSync,
} from "node:child_process";

import {
  getContinuousCalibrationEngine,
  type CalibrationObservation,
} from "../packages/models/src/continuousCalibration";

const EVALUATION_ID =
  "oh4-local-model-baseline-2026-10-12";

function ollamaVersions():
  Map<string, string> {
  const output =
    execFileSync(
      "ollama",
      ["list"],
      {
        encoding: "utf8",
      },
    );

  const versions =
    new Map<string, string>();

  for (
    const line
    of output.split(/\r?\n/)
  ) {
    const columns =
      line.trim().split(/\s+/);

    if (
      columns.length >= 2 &&
      columns[0] !== "NAME"
    ) {
      versions.set(
        columns[0]!,
        columns[1]!,
      );
    }
  }

  return versions;
}

const installed =
  ollamaVersions();

function versionFor(
  model: string,
): string {
  return (
    installed.get(model) ??
    `tag:${model}`
  );
}

type BenchmarkRow = {
  model: string;
  domain: string;
  taskId: string;
  score: number;
  latencyMs: number;
  verdict:
    | "pass"
    | "reject";
};

const rows:
  BenchmarkRow[] = [
    // Qwen 3.5: validated correct with thinking disabled.
    {
      model: "qwen3.5:9b",
      domain: "general-reasoning",
      taskId: "reasoning",
      score: 1,
      latencyMs: 71820,
      verdict: "pass",
    },
    {
      model: "qwen3.5:9b",
      domain: "context-comprehension",
      taskId: "context",
      score: 1,
      latencyMs: 3800,
      verdict: "pass",
    },
    {
      model: "qwen3.5:9b",
      domain: "coding",
      taskId: "code-diagnosis",
      score: 1,
      latencyMs: 8690,
      verdict: "pass",
    },
    {
      model: "qwen3.5:9b",
      domain: "critic",
      taskId: "critic",
      score: 1,
      latencyMs: 1410,
      verdict: "pass",
    },
    {
      model: "qwen3.5:9b",
      domain: "planning",
      taskId: "planning",
      score: 1,
      latencyMs: 5360,
      verdict: "pass",
    },

    // GPT-OSS 20B: validated correct across the baseline suite.
    {
      model: "gpt-oss:20b",
      domain: "general-reasoning",
      taskId: "reasoning",
      score: 1,
      latencyMs: 141280,
      verdict: "pass",
    },
    {
      model: "gpt-oss:20b",
      domain: "context-comprehension",
      taskId: "context",
      score: 1,
      latencyMs: 7120,
      verdict: "pass",
    },
    {
      model: "gpt-oss:20b",
      domain: "coding",
      taskId: "code-diagnosis",
      score: 1,
      latencyMs: 15410,
      verdict: "pass",
    },
    {
      model: "gpt-oss:20b",
      domain: "critic",
      taskId: "critic",
      score: 1,
      latencyMs: 15600,
      verdict: "pass",
    },
    {
      model: "gpt-oss:20b",
      domain: "planning",
      taskId: "planning",
      score: 1,
      latencyMs: 24830,
      verdict: "pass",
    },

    // Qwen3 Coder 30B: validated correct; retained as deep coding specialist.
    {
      model: "qwen3-coder:30b",
      domain: "general-reasoning",
      taskId: "reasoning",
      score: 1,
      latencyMs: 160790,
      verdict: "pass",
    },
    {
      model: "qwen3-coder:30b",
      domain: "context-comprehension",
      taskId: "context",
      score: 1,
      latencyMs: 11120,
      verdict: "pass",
    },
    {
      model: "qwen3-coder:30b",
      domain: "coding",
      taskId: "code-diagnosis",
      score: 1,
      latencyMs: 19230,
      verdict: "pass",
    },
    {
      model: "qwen3-coder:30b",
      domain: "critic",
      taskId: "critic",
      score: 1,
      latencyMs: 7150,
      verdict: "pass",
    },
    {
      model: "qwen3-coder:30b",
      domain: "planning",
      taskId: "planning",
      score: 1,
      latencyMs: 14400,
      verdict: "pass",
    },

    // DeepSeek Coder V2: fast coding baseline, but failed the two general tests.
    {
      model: "deepseek-coder-v2:16b",
      domain: "general-reasoning",
      taskId: "reasoning",
      score: 0,
      latencyMs: 88470,
      verdict: "reject",
    },
    {
      model: "deepseek-coder-v2:16b",
      domain: "context-comprehension",
      taskId: "context",
      score: 0,
      latencyMs: 3590,
      verdict: "reject",
    },
    {
      model: "deepseek-coder-v2:16b",
      domain: "coding",
      taskId: "code-diagnosis",
      score: 1,
      latencyMs: 3460,
      verdict: "pass",
    },
    {
      model: "deepseek-coder-v2:16b",
      domain: "critic",
      taskId: "critic",
      score: 1,
      latencyMs: 8370,
      verdict: "pass",
    },
    {
      model: "deepseek-coder-v2:16b",
      domain: "planning",
      taskId: "planning",
      score: 1,
      latencyMs: 8090,
      verdict: "pass",
    },

    // DeepSeek R1: kept experimental. Current integration repeatedly exhausted
    // the output budget without a usable final response.
    {
      model: "deepseek-r1:8b",
      domain: "general-reasoning",
      taskId: "reasoning",
      score: 0,
      latencyMs: 58470,
      verdict: "reject",
    },
    {
      model: "deepseek-r1:8b",
      domain: "context-comprehension",
      taskId: "context",
      score: 0,
      latencyMs: 10160,
      verdict: "reject",
    },
    {
      model: "deepseek-r1:8b",
      domain: "critic",
      taskId: "critic",
      score: 0,
      latencyMs: 9950,
      verdict: "reject",
    },
    {
      model: "deepseek-r1:8b",
      domain: "planning",
      taskId: "planning",
      score: 0,
      latencyMs: 9900,
      verdict: "reject",
    },
  ];

async function main() {
  const engine =
    await getContinuousCalibrationEngine();

  const now =
    new Date().toISOString();

  const observations:
    CalibrationObservation[] =
      rows.map(
        (row) => ({
          id:
            `${EVALUATION_ID}:${row.model}:${row.taskId}`,

          observedAt:
            now,

          source:
            "scheduled-evaluation",

          modelId:
            `ollama:${row.model}`,

          modelVersion:
            versionFor(
              row.model,
            ),

          strategy:
            "single-model",

          task: {
            domain:
              row.domain,
          },

          objective: {
            score:
              row.score,

            success:
              row.verdict ===
              "pass",

            verificationVerdict:
              row.verdict,

            executionSucceeded:
              true,

            evidenceConfidence:
              1,
          },

          telemetry: {
            latencyMs:
              row.latencyMs,

            cost:
              0,

            retries:
              0,

            fallbackCount:
              0,
          },

          provenance: {
            evaluationId:
              EVALUATION_ID,

            taskId:
              row.taskId,
          },
        }),
      );

  engine.ingestMany(
    observations,
  );

  await engine.save();

  const modelNames =
    [
      ...new Set(
        rows.map(
          (row) =>
            row.model,
        ),
      ),
    ];

  const subjects =
    modelNames.map(
      (model) => ({
        modelId:
          `ollama:${model}`,

        modelVersion:
          versionFor(
            model,
          ),

        strategy:
          "single-model",

        domains:
          [
            ...new Set(
              rows
                .filter(
                  (row) =>
                    row.model ===
                    model,
                )
                .map(
                  (row) =>
                    row.domain,
                ),
            ),
          ],
      }),
    );

  const snapshot =
    engine.snapshot(
      subjects,
    );

  console.log(
    "OH-4 local model calibration seeded.",
  );

  console.log(
    JSON.stringify(
      {
        version:
          snapshot.version,

        observationCount:
          snapshot.observationCount,

        estimates:
          snapshot.estimates.map(
            (estimate) => ({
              modelId:
                estimate.modelId,

              modelVersion:
                estimate.modelVersion,

              domain:
                estimate.domain,

              objectiveScore:
                estimate.objectiveScore,

              confidence:
                estimate.confidence,

              sampleCount:
                estimate.sampleCount,

              weightedLatencyMs:
                estimate.telemetry
                  .weightedLatencyMs,

              passRate:
                estimate.verification
                  .passRate,
            }),
          ),
      },
      null,
      2,
    ),
  );
}

void main();