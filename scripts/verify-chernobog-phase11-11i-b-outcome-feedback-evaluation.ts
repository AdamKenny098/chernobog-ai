import assert from "node:assert/strict";

import {
  ChernobogLearningEvaluationStore,
  createLearningExperience,
  createLearningFeedbackObservation,
  createLearningOutcomeObservation,
  evaluateLearningExperience,
} from "../lib/chernobog/learning";

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

console.log(
  "Chernobog Phase 11I-B - Outcome & Feedback Evaluation",
);
console.log(
  "======================================================",
);

const experience =
  createLearningExperience(
    {
      id:
        "experience:runtime-repair",
      occurredAt:
        "2026-08-25T20:10:00.000Z",
      source:
        "cognitive-cycle",
      subject:
        "service.ollama.health",
      confidence: 0.9,
      evidence: {
        cognitiveDecisionIds: [
          "decision:runtime-repair",
        ],
      },
    },
    new Date(
      "2026-08-25T20:10:01.000Z",
    ),
  );

const success =
  createLearningOutcomeObservation({
    id:
      "outcome:runtime-repair:success",
    experienceId:
      experience.id,
    observedAt:
      "2026-08-25T20:11:00.000Z",
    status:
      "success",
    score: 1,
    confidence: 0.95,
    evidenceWorldStateKeys: [
      "service.ollama.health",
    ],
  });

assert.equal(
  success.status,
  "success",
);
assert.deepEqual(
  success.evidenceWorldStateKeys,
  ["service.ollama.health"],
);
pass(
  "outcome observations normalize evidence, confidence, and timestamps",
);

assert.throws(() =>
  createLearningOutcomeObservation({
    id: "bad-outcome",
    experienceId:
      experience.id,
    observedAt:
      "not-a-time",
    status: "success",
  }),
);

assert.throws(() =>
  createLearningOutcomeObservation({
    id: "bad-score",
    experienceId:
      experience.id,
    observedAt:
      "2026-08-25T20:11:00.000Z",
    status: "success",
    score: 3,
  }),
);
pass(
  "invalid outcome timestamps and scores are rejected",
);

const positive =
  createLearningFeedbackObservation({
    id:
      "feedback:positive",
    experienceId:
      experience.id,
    observedAt:
      "2026-08-25T20:11:30.000Z",
    kind:
      "explicit-positive",
    confidence: 1,
    detail:
      "That worked.",
  });

const evaluatedSuccess =
  evaluateLearningExperience(
    experience,
    [success],
    [positive],
    new Date(
      "2026-08-25T20:12:00.000Z",
    ),
  );

assert.equal(
  evaluatedSuccess
    .resolvedOutcome.status,
  "success",
);
assert.equal(
  evaluatedSuccess
    .resolvedFeedback.kind,
  "explicit-positive",
);
assert.ok(
  evaluatedSuccess
    .evaluationConfidence >=
    0.95,
);
pass(
  "confirmed success plus positive feedback resolves to a high-confidence evaluation",
);

const failure =
  createLearningOutcomeObservation({
    id:
      "outcome:runtime-repair:failure",
    experienceId:
      experience.id,
    observedAt:
      "2026-08-25T20:12:30.000Z",
    status:
      "failure",
    score: -1,
    confidence: 0.9,
  });

const conflicting =
  evaluateLearningExperience(
    experience,
    [
      success,
      failure,
    ],
    [],
    new Date(
      "2026-08-25T20:13:00.000Z",
    ),
  );

assert.equal(
  conflicting
    .resolvedOutcome.status,
  "mixed",
);
assert.ok(
  conflicting.reasons.some(
    (reason) =>
      reason.code ===
      "conflicting-evidence",
  ),
);
pass(
  "conflicting success and failure observations resolve conservatively to mixed",
);

const correction =
  createLearningFeedbackObservation({
    id:
      "feedback:correction",
    experienceId:
      experience.id,
    observedAt:
      "2026-08-25T20:14:00.000Z",
    kind:
      "correction",
    confidence: 1,
    detail:
      "Diagnose first, then propose a restart.",
  });

const negative =
  createLearningFeedbackObservation({
    id:
      "feedback:negative",
    experienceId:
      experience.id,
    observedAt:
      "2026-08-25T20:13:30.000Z",
    kind:
      "explicit-negative",
    confidence: 1,
  });

const feedbackResolved =
  evaluateLearningExperience(
    experience,
    [],
    [
      positive,
      negative,
      correction,
    ],
    new Date(
      "2026-08-25T20:14:30.000Z",
    ),
  );

assert.equal(
  feedbackResolved
    .resolvedFeedback.kind,
  "correction",
);
assert.equal(
  feedbackResolved
    .resolvedFeedback.detail,
  "Diagnose first, then propose a restart.",
);
pass(
  "explicit correction takes precedence over positive or negative feedback",
);

const unrelatedOutcome =
  createLearningOutcomeObservation({
    id:
      "outcome:other",
    experienceId:
      "experience:other",
    observedAt:
      "2026-08-25T20:15:00.000Z",
    status:
      "failure",
    confidence: 1,
  });

const filtered =
  evaluateLearningExperience(
    experience,
    [
      success,
      unrelatedOutcome,
    ],
    [],
    new Date(
      "2026-08-25T20:15:30.000Z",
    ),
  );

assert.equal(
  filtered.outcomeObservations.length,
  1,
);
assert.equal(
  filtered
    .outcomeObservations[0]
    ?.id,
  success.id,
);
pass(
  "evaluation ignores observations linked to other experiences",
);

const empty =
  evaluateLearningExperience(
    experience,
    [],
    [],
    new Date(
      "2026-08-25T20:16:00.000Z",
    ),
  );

assert.equal(
  empty.resolvedOutcome.status,
  "unknown",
);
assert.equal(
  empty.resolvedFeedback.kind,
  "none",
);
assert.ok(
  empty.reasons.some(
    (reason) =>
      reason.code ===
      "no-evaluation-signal",
  ),
);
pass(
  "experiences remain unevaluated when no later signal exists",
);

const store =
  new ChernobogLearningEvaluationStore();

store.addOutcome(success);
store.addFeedback(correction);

assert.equal(
  store.outcomesFor(
    experience.id,
  ).length,
  1,
);
assert.equal(
  store.feedbackFor(
    experience.id,
  ).length,
  1,
);
pass(
  "evaluation store links outcomes and feedback back to their originating experience",
);

const storedOutcome =
  store.outcomesFor(
    experience.id,
  )[0];

assert.ok(storedOutcome);

if (!storedOutcome) {
  throw new Error(
    "Expected stored outcome.",
  );
}

storedOutcome.status =
  "failure";

assert.equal(
  store.outcomesFor(
    experience.id,
  )[0]?.status,
  "success",
);
pass(
  "evaluation store returns defensive clones",
);

const resultKeys =
  Object.keys(
    evaluatedSuccess,
  );

assert.equal(
  resultKeys.includes(
    "promotedMemory",
  ),
  false,
);
assert.equal(
  resultKeys.includes(
    "policyUpdate",
  ),
  false,
);
assert.equal(
  resultKeys.includes(
    "behaviorChange",
  ),
  false,
);
pass(
  "11I-B evaluates outcomes and feedback without promoting learning or changing behavior",
);

console.log(
  "======================================================",
);
console.log(
  "PASS Phase 11I-B Outcome & Feedback Evaluation acceptance",
);
