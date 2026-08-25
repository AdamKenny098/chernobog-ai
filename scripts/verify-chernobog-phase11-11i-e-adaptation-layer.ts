import assert from "node:assert/strict";

import {
  createWorldStateRecord,
} from "../lib/chernobog/worldState";
import {
  assessWorldStateSalience,
} from "../lib/chernobog/cognition";
import {
  activeLessonGuidance,
  adaptAttentionWithLessons,
  matchLessonToSignal,
  promoteLearningPattern,
  revokeLearnedLesson,
} from "../lib/chernobog/learning";
import type {
  LearnedLesson,
  LearningPatternCandidate,
} from "../lib/chernobog/learning";

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

function makeSignal(
  key: string,
  value: string,
) {
  const record = createWorldStateRecord(
    {
      key,
      value,
      observedAt:
        "2026-08-25T21:00:00.000Z",
      confidence: 1,
      provenance: {
        eventId: `event:${key}`,
        eventType:
          "verification.observed",
        projectorId:
          "verification-projector",
        source: {
          subsystem:
            "verification",
        },
      },
    },
    new Date(
      "2026-08-25T21:00:01.000Z",
    ),
  );

  return assessWorldStateSalience(
    {
      current: record,
    },
    {
      now: new Date(
        "2026-08-25T21:00:02.000Z",
      ),
    },
  );
}

function pattern(
  kind:
    LearningPatternCandidate["kind"],
  statement: string,
  subjects: string[],
): LearningPatternCandidate {
  return {
    id:
      `pattern:${kind}:${subjects[0] ?? "general"}`,
    key:
      `${kind}:${subjects[0] ?? "general"}`,
    kind,
    statement,
    supportCount: 4,
    contradictionCount: 0,
    confidence: 0.9,
    firstObservedAt:
      "2026-08-25T20:00:00.000Z",
    lastObservedAt:
      "2026-08-25T20:30:00.000Z",
    evidence: {
      experienceIds: [
        "exp:1",
        "exp:2",
        "exp:3",
        "exp:4",
      ],
      subjects,
      feedbackKinds: [],
      outcomeStatuses: [
        "success",
      ],
    },
    sourceEvaluations: [],
  };
}

function promote(
  candidate: LearningPatternCandidate,
): LearnedLesson {
  return promoteLearningPattern(
    candidate,
    {
      authority:
        candidate.kind === "preference" ||
        candidate.kind === "correction-pattern"
          ? "user-approved"
          : "system-policy",
      approved: true,
      approvedBy: "verification",
      approvedAt:
        "2026-08-25T20:31:00.000Z",
    },
    {
      policy: {
        minimumSupport: 3,
        minimumConfidence: 0.75,
        maximumContradictionRatio: 0.25,
        requireExplicitApprovalForPreferences: true,
        requireExplicitApprovalForCorrections: true,
      },
      now: new Date(
        "2026-08-25T20:32:00.000Z",
      ),
    },
  );
}

console.log(
  "Chernobog Phase 11I-E - Adaptation Layer",
);
console.log(
  "=========================================",
);

const signal = makeSignal(
  "service.ollama.health",
  "degraded",
);

const lesson = promote(
  pattern(
    "correction-pattern",
    "Diagnose first, explain second, repair third.",
    ["service.ollama.health"],
  ),
);

const exactMatch = matchLessonToSignal(
  lesson,
  signal,
);

assert.equal(
  exactMatch.matched,
  true,
);
assert.equal(
  exactMatch.matchStrength,
  1,
);
pass(
  "active lesson can match an exact World State key",
);

const adapted = adaptAttentionWithLessons(
  signal,
  [lesson],
);

assert.ok(
  adapted.adaptedScore >
    adapted.originalScore,
);
assert.ok(
  adapted.influences.some(
    (influence) =>
      influence.kind === "guidance" &&
      influence.guidance ===
        lesson.statement,
  ),
);
pass(
  "active governed correction lesson can provide bounded priority influence and learned guidance",
);

assert.ok(
  adapted.adaptedScore -
    adapted.originalScore <=
    12,
);
pass(
  "lesson-driven attention influence is capped by adaptation policy",
);

const unrelated = promote(
  pattern(
    "success-pattern",
    "Desktop focus is repeatedly associated with success.",
    ["desktop"],
  ),
);

const unrelatedAdaptation =
  adaptAttentionWithLessons(
    signal,
    [unrelated],
  );

assert.equal(
  unrelatedAdaptation.adaptedScore,
  unrelatedAdaptation.originalScore,
);
assert.equal(
  unrelatedAdaptation.influences.length,
  0,
);
pass(
  "unrelated learned lessons do not influence the current cognitive signal",
);

const revoked = revokeLearnedLesson(
  lesson,
  "Preference changed.",
  new Date(
    "2026-08-25T21:01:00.000Z",
  ),
);

const revokedAdaptation =
  adaptAttentionWithLessons(
    signal,
    [revoked],
  );

assert.equal(
  revokedAdaptation.adaptedScore,
  revokedAdaptation.originalScore,
);
assert.equal(
  revokedAdaptation.influences.length,
  0,
);
pass(
  "revoked lessons immediately stop influencing cognition",
);

const weakLesson: LearnedLesson = {
  ...structuredClone(lesson),
  confidence: 0.5,
};

const weakAdaptation =
  adaptAttentionWithLessons(
    signal,
    [weakLesson],
  );

assert.equal(
  weakAdaptation.adaptedScore,
  weakAdaptation.originalScore,
);
pass(
  "low-confidence lessons cannot influence cognition even if otherwise relevant",
);

const duplicateInfluence =
  adaptAttentionWithLessons(
    signal,
    [
      lesson,
      promote(
        pattern(
          "preference",
          "Prefer diagnostic context before repair suggestions.",
          ["service.ollama.health"],
        ),
      ),
    ],
  );

assert.ok(
  duplicateInfluence.influences.length >= 2,
);
assert.ok(
  duplicateInfluence.adaptedScore -
    duplicateInfluence.originalScore <=
    12,
);
pass(
  "multiple lessons may contribute evidence while their total priority effect remains bounded",
);

const guidance = activeLessonGuidance([
  lesson,
  revoked,
  unrelated,
]);

assert.deepEqual(
  guidance,
  [lesson.statement],
);
pass(
  "guidance queries include only active preference/correction lessons",
);

const immutable =
  adaptAttentionWithLessons(
    signal,
    [lesson],
  );

immutable.influences[0]!.guidance =
  "mutated outside engine";

assert.equal(
  lesson.statement,
  "Diagnose first, explain second, repair third.",
);
pass(
  "adaptation outputs are defensively cloned from durable lessons",
);

const outputKeys = Object.keys(adapted);

assert.equal(
  outputKeys.includes("permission"),
  false,
);
assert.equal(
  outputKeys.includes("execute"),
  false,
);
assert.equal(
  outputKeys.includes("autonomy"),
  false,
);
assert.equal(
  outputKeys.includes("tool"),
  false,
);
pass(
  "11I-E learning influence cannot grant permissions, autonomy, tool access, or execution",
);

console.log(
  "=========================================",
);
console.log(
  "PASS Phase 11I-E Adaptation Layer acceptance",
);
