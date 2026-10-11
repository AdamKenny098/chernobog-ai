import assert from "node:assert/strict";
import {
  createChernobogEvent,
  type ChernobogEvent,
  type ChernobogEventInput,
  type ChernobogEventPublishResult,
} from "../lib/chernobog/events";
import {
  buildPreferenceEstimates,
  learnPreferencesFromEvaluationReport,
  recordPairwisePreference,
  recordPreferenceRating,
} from "@chernobog/models/preferenceLearning";
import type {
  EvaluationReport,
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
    "Chernobog OH-4H â€” Preference Learning Verification",
  );
  console.log(
    "=================================================",
  );

  const captured:
    ChernobogEvent[] =
      [];

  const publisher = {
    async publish(
      input:
        ChernobogEventInput<unknown>,
    ): Promise<
      ChernobogEventPublishResult
    > {
      const event =
        createChernobogEvent(
          input,
        );

      captured.push(
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
    },
  };

  await recordPreferenceRating(
    {
      context: {
        taskClass:
          "creative-writing",
        projectKey:
          "vestige",
      },
      subject: {
        kind:
          "model",
        id:
          "model-alpha",
      },
      score:
        0.9,
      confidence:
        1,
      detail:
        "Matches project voice.",
    },
    publisher,
  );

  await recordPreferenceRating(
    {
      context: {
        taskClass:
          "creative-writing",
        projectKey:
          "vestige",
      },
      subject: {
        kind:
          "model",
        id:
          "model-alpha",
      },
      score:
        0.7,
      confidence:
        0.5,
    },
    publisher,
  );

  pass(
    "explicit model preference ratings are stored as subjective evidence",
  );

  await recordPairwisePreference(
    {
      context: {
        taskClass:
          "creative-writing",
        projectKey:
          "vestige",
      },
      winner: {
        kind:
          "model",
        id:
          "model-alpha",
      },
      loser: {
        kind:
          "model",
        id:
          "model-beta",
      },
      confidence:
        1,
      detail:
        "Alpha better matches voice.",
    },
    publisher,
  );

  assert.equal(
    captured.length,
    4,
  );

  pass(
    "pairwise preference produces symmetric win/loss evidence",
  );

  const estimates =
    buildPreferenceEstimates(
      captured,
      {
        taskClass:
          "creative-writing",
        projectKey:
          "vestige",
        subjectKind:
          "model",
      },
    );

  const alpha =
    estimates.find(
      (estimate) =>
        estimate.subject.id ===
        "model-alpha",
    );

  const beta =
    estimates.find(
      (estimate) =>
        estimate.subject.id ===
        "model-beta",
    );

  assert.ok(alpha);
  assert.ok(beta);

  assert.equal(
    alpha.perspective,
    "subjective",
  );

  assert.ok(
    (
      alpha.weightedScore ??
      0
    ) >
    (
      beta.weightedScore ??
      0
    ),
  );

  assert.equal(
    alpha.pairwiseWins,
    1,
  );

  assert.equal(
    beta.pairwiseLosses,
    1,
  );

  pass(
    "preference estimates are scoped, confidence-weighted and explicitly subjective",
  );

  const report:
    EvaluationReport = {
      taskClass:
        "creative-writing",
      evaluatedAt:
        new Date()
          .toISOString(),
      outcome:
        "pass",
      objective: {
        available:
          true,
        score:
          0.2,
        totalWeight:
          1,
        passedWeight:
          0,
        methodCount:
          1,
      },
      subjective: {
        available:
          true,
        score:
          0.95,
        totalWeight:
          1,
        passedWeight:
          1,
        methodCount:
          1,
      },
      results: [
        {
          methodId:
            "objective.correctness",
          kind:
            "rubric",
          perspective:
            "objective",
          score:
            0.2,
          passed:
            false,
          summary:
            "Objective score intentionally poor.",
          issues:
            [],
          evidence:
            [],
        },
        {
          methodId:
            "preference.voice",
          kind:
            "human-preference",
          perspective:
            "subjective",
          score:
            0.95,
          passed:
            true,
          summary:
            "Preferred project voice.",
          issues:
            [],
          evidence:
            [],
        },
      ],
      requiredFailures:
        [],
      missingMethods:
        [],
    };

  const before =
    captured.length;

  const learned =
    await learnPreferencesFromEvaluationReport(
      {
        report,
        subject: {
          kind:
            "model",
          id:
            "model-gamma",
        },
        projectKey:
          "vestige",
      },
      publisher,
    );

  assert.equal(
    learned,
    1,
  );

  assert.equal(
    captured.length,
    before + 1,
  );

  const learnedPayload =
    captured.at(-1)
      ?.payload as
      Record<string, unknown>;

  assert.equal(
    learnedPayload.score,
    0.95,
  );

  pass(
    "only subjective evaluation results are learned as preferences; objective scores are not imported",
  );

  await recordPreferenceRating(
    {
      context: {
        taskClass:
          "coding",
        projectKey:
          "chernobog",
      },
      subject: {
        kind:
          "model",
        id:
          "model-beta",
      },
      score:
        1,
      confidence:
        1,
      source:
        "user-correction",
      detail:
        "Preferred explanation style only.",
    },
    publisher,
  );

  const creative =
    buildPreferenceEstimates(
      captured,
      {
        taskClass:
          "creative-writing",
        projectKey:
          "vestige",
      },
    );

  const coding =
    buildPreferenceEstimates(
      captured,
      {
        taskClass:
          "coding",
        projectKey:
          "chernobog",
      },
    );

  assert.ok(
    creative.some(
      (estimate) =>
        estimate.subject.id ===
        "model-alpha",
    ),
  );

  assert.equal(
    creative.some(
      (estimate) =>
        estimate.subject.id ===
        "model-beta" &&
        estimate.context.projectKey ===
          "chernobog",
    ),
    false,
  );

  assert.equal(
    coding.length,
    1,
  );

  pass(
    "preferences remain scoped by task/project instead of becoming universal capability claims",
  );

  assert.ok(
    captured.every(
      (event) =>
        event.type ===
        "cognitive.preference.recorded",
    ),
  );

  assert.ok(
    captured.every(
      (event) =>
        event.metadata.tags
          ?.includes(
            "subjective",
          ),
    ),
  );

  pass(
    "preference learning uses a dedicated subjective Event Spine channel",
  );

  console.log("");
  console.log(
    "OH-4H preference learning verification complete.",
  );
}

void main().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);