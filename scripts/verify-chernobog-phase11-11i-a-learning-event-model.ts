import assert from "node:assert/strict";

import type {
  CognitiveRuntimeCycle,
} from "../lib/chernobog/cognition";
import {
  ChernobogLearningExperienceStore,
  assessLearningEligibility,
  createLearningExperience,
  learningExperienceFromCognitiveCycle,
} from "../lib/chernobog/learning";

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

console.log(
  "Chernobog Phase 11I-A - Learning Event Model",
);
console.log(
  "=============================================",
);

const correction =
  createLearningExperience(
    {
      id: "feedback:runtime-repair:1",
      occurredAt:
        "2026-08-25T20:00:00.000Z",
      source: "user-feedback",
      subject: "runtime.repair",
      confidence: 1,
      feedback: {
        kind: "correction",
        detail:
          "Diagnose the failure before proposing restart.",
      },
      evidence: {
        cognitiveDecisionIds: [
          "decision:42",
          "decision:42",
        ],
        worldStateKeys: [
          "service.ollama.health",
        ],
      },
      context: {
        preferredSequence: [
          "diagnose",
          "explain",
          "repair",
        ],
      },
    },
    new Date(
      "2026-08-25T20:00:01.000Z",
    ),
  );

assert.equal(
  correction.feedback.kind,
  "correction",
);
assert.deepEqual(
  correction.evidence.cognitiveDecisionIds,
  ["decision:42"],
);
assert.equal(
  correction.recordedAt,
  "2026-08-25T20:00:01.000Z",
);
pass(
  "learning experiences normalize timestamps, evidence, feedback, and context deterministically",
);

assert.throws(() =>
  createLearningExperience({
    id: "bad-confidence",
    occurredAt:
      "2026-08-25T20:00:00.000Z",
    source: "system-observation",
    confidence: 2,
  }),
);

assert.throws(() =>
  createLearningExperience({
    id: "bad-time",
    occurredAt:
      "2026-08-25T20:00:02.000Z",
    recordedAt:
      "2026-08-25T20:00:01.000Z",
    source: "system-observation",
  }),
);

assert.throws(() =>
  createLearningExperience({
    id: "bad-context",
    occurredAt:
      "2026-08-25T20:00:00.000Z",
    source: "system-observation",
    context: {
      invalid: BigInt(1),
    },
  }),
);
pass(
  "invalid confidence, chronology, and non-JSON-safe context are rejected",
);

const correctionEligibility =
  assessLearningEligibility(correction);

assert.equal(
  correctionEligibility.eligible,
  true,
);
assert.ok(
  correctionEligibility.score >= 60,
);
assert.ok(
  correctionEligibility.reasons.some(
    (reason) =>
      reason.code ===
      "explicit-feedback",
  ),
);
pass(
  "explicit user corrections are immediately eligible as learning candidates",
);

const bareObservation =
  createLearningExperience(
    {
      id: "observation:desktop:1",
      occurredAt:
        "2026-08-25T20:01:00.000Z",
      source: "system-observation",
      confidence: 0.9,
      evidence: {
        eventIds: [
          "event:desktop:1",
        ],
      },
      context: {
        application:
          "Visual Studio Code",
      },
    },
    new Date(
      "2026-08-25T20:01:01.000Z",
    ),
  );

assert.equal(
  assessLearningEligibility(
    bareObservation,
  ).eligible,
  false,
);
pass(
  "a single ordinary observation does not automatically become learning",
);

const outcome =
  createLearningExperience(
    {
      id: "action-outcome:repair:1",
      occurredAt:
        "2026-08-25T20:02:00.000Z",
      source: "action-outcome",
      confidence: 0.95,
      outcome: {
        status: "success",
        score: 1,
      },
      evidence: {
        cognitiveDecisionIds: [
          "decision:repair:1",
        ],
        worldStateKeys: [
          "service.ollama.health",
        ],
      },
    },
    new Date(
      "2026-08-25T20:02:01.000Z",
    ),
  );

assert.equal(
  assessLearningEligibility(
    outcome,
  ).eligible,
  true,
);
pass(
  "grounded known outcomes are eligible for later learning analysis",
);

const weakFailure =
  createLearningExperience(
    {
      id: "weak:failure:1",
      occurredAt:
        "2026-08-25T20:03:00.000Z",
      source: "action-outcome",
      confidence: 0.2,
      outcome: {
        status: "failure",
      },
    },
    new Date(
      "2026-08-25T20:03:01.000Z",
    ),
  );

assert.equal(
  assessLearningEligibility(
    weakFailure,
  ).eligible,
  false,
);
pass(
  "low-confidence outcomes are dampened instead of promoted as reliable learning",
);

const cognitiveCycle =
  {
    cycle: 11,
    generatedAt:
      "2026-08-25T20:04:00.000Z",
    observedRecords: 3,
    focus: {
      cycle: 11,
      generatedAt:
        "2026-08-25T20:04:00.000Z",
      reason: "initial-focus",
      changed: true,
      currentKey:
        "service.ollama.health",
      selected: {
        signal: {
          assessment: {
            confidence: 0.9,
          },
        },
      },
    },
    action: {
      id: "decision:11:ollama",
      requestedMode: "act",
      mode: "suggest",
      permittedToExecute: false,
    },
    initiative: {
      disposition: "surface",
    },
  } as unknown as CognitiveRuntimeCycle;

const cycleExperience =
  learningExperienceFromCognitiveCycle(
    cognitiveCycle,
    new Date(
      "2026-08-25T20:04:01.000Z",
    ),
  );

assert.equal(
  cycleExperience.source,
  "cognitive-cycle",
);
assert.equal(
  cycleExperience.subject,
  "service.ollama.health",
);
assert.deepEqual(
  cycleExperience.evidence
    .cognitiveDecisionIds,
  ["decision:11:ollama"],
);
assert.equal(
  cycleExperience.outcome.status,
  "unknown",
);
assert.equal(
  assessLearningEligibility(
    cycleExperience,
  ).eligible,
  false,
);
pass(
  "11H cognitive cycles become grounded experiences but are not treated as learned lessons without outcome or feedback",
);

const store =
  new ChernobogLearningExperienceStore(2);

store.upsert(bareObservation);
store.upsert(correction);
store.upsert(outcome);

assert.equal(store.size, 2);
assert.deepEqual(
  store.list().map(
    (experience) => experience.id,
  ),
  [
    "action-outcome:repair:1",
    "observation:desktop:1",
  ],
);
pass(
  "bounded experience store deduplicates by id and retains the newest experiences",
);

const returned =
  store.get(
    "action-outcome:repair:1",
  );

assert.ok(returned);

if (!returned) {
  throw new Error(
    "Expected stored learning experience.",
  );
}

returned.outcome.status = "failure";

assert.equal(
  store.get(
    "action-outcome:repair:1",
  )?.outcome.status,
  "success",
);
pass(
  "experience store returns defensive clones",
);

const learningKeys =
  Object.keys(
    correctionEligibility,
  );

assert.equal(
  learningKeys.includes("promote"),
  false,
);
assert.equal(
  learningKeys.includes("memoryWrite"),
  false,
);
assert.equal(
  learningKeys.includes("behaviorChange"),
  false,
);
pass(
  "11I-A identifies learning candidates without promoting memory or changing behavior",
);

console.log(
  "=============================================",
);
console.log(
  "PASS Phase 11I-A Learning Event Model acceptance",
);
