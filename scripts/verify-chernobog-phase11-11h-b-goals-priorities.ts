import assert from "node:assert/strict";

import {
  createWorldStateRecord,
} from "../lib/chernobog/worldState";
import {
  ChernobogGoalAwareAttention,
  ChernobogGoalRegistry,
  assessGoalRelevance,
  assessWorldStateSalience,
  buildCognitiveGoal,
  calculateCognitiveGoalPriorityScore,
  prioritizeAttentionForGoals,
} from "../lib/chernobog/cognition";

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

function stateRecord(
  key: string,
  value:
    string | boolean,
) {
  return createWorldStateRecord(
    {
      key,
      value,
      observedAt:
        "2026-08-25T17:30:00.000Z",
      confidence: 1,
      provenance: {
        eventId:
          `event:${key}`,
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
      "2026-08-25T17:30:01.000Z",
    ),
  );
}

console.log(
  "Chernobog Phase 11H-B - Goals & Priorities",
);
console.log(
  "===========================================",
);

const goal =
  buildCognitiveGoal(
    {
      id:
        "keep-runtime-healthy",
      title:
        "Keep local AI runtime healthy",
      priority:
        "high",
      importance:
        0.9,
      urgency:
        0.8,
      scope: {
        keys: [
          "service.ollama.health",
        ],
        namespaces: [
          "runtime",
          "model",
        ],
      },
      tags: [
        "runtime",
        "ollama",
      ],
    },
    new Date(
      "2026-08-25T17:30:00.000Z",
    ),
  );

assert.equal(
  goal.status,
  "active",
);
assert.deepEqual(
  goal.tags,
  [
    "ollama",
    "runtime",
  ],
);
assert.ok(
  calculateCognitiveGoalPriorityScore(
    goal,
  ) >= 70,
);
pass(
  "goals normalize scope, urgency, importance, and priority deterministically",
);

assert.throws(() =>
  buildCognitiveGoal({
    id: "bad",
    title: "Bad goal",
    importance: 1.5,
  }),
);
assert.throws(() =>
  buildCognitiveGoal({
    id: "bad",
    title: "Bad goal",
    urgency: -1,
  }),
);
pass(
  "invalid importance and urgency are rejected",
);

let now =
  new Date(
    "2026-08-25T17:30:00.000Z",
  );

const registry =
  new ChernobogGoalRegistry(
    () => now,
  );

registry.upsert({
  id:
    "secondary-project-goal",
  title:
    "Keep project validation healthy",
  priority:
    "normal",
  importance:
    0.6,
  urgency:
    0.4,
  scope: {
    namespaces: [
      "project",
    ],
  },
});

registry.upsert({
  id:
    "keep-runtime-healthy",
  title:
    "Keep local AI runtime healthy",
  priority:
    "high",
  importance:
    0.9,
  urgency:
    0.8,
  scope: {
    keys: [
      "service.ollama.health",
    ],
  },
});

assert.equal(
  registry.size,
  2,
);
assert.equal(
  registry.list({
    activeOnly: true,
  })[0]?.id,
  "keep-runtime-healthy",
);
pass(
  "goal registry ranks active goals by deterministic priority score",
);

now =
  new Date(
    "2026-08-25T17:31:00.000Z",
  );

registry.upsert({
  id:
    "secondary-project-goal",
  title:
    "Keep project validation healthy",
  status:
    "paused",
});

assert.equal(
  registry.list({
    activeOnly: true,
  }).length,
  1,
);
pass(
  "paused goals remain represented but leave active prioritization",
);

const baseSignal =
  assessWorldStateSalience(
    {
      previous:
        stateRecord(
          "service.ollama.health",
          "healthy",
        ),
      current:
        stateRecord(
          "service.ollama.health",
          "degraded",
        ),
    },
    {
      now:
        new Date(
          "2026-08-25T17:31:01.000Z",
        ),
    },
  );

const exactRelevance =
  assessGoalRelevance(
    baseSignal,
    goal,
  );

assert.equal(
  exactRelevance.relevanceScore,
  100,
);
assert.ok(
  exactRelevance.reasons.some(
    (reason) =>
      reason.code ===
      "exact-key",
  ),
);
pass(
  "exact World State key targeting creates maximum deterministic goal relevance",
);

const namespaceSignal =
  assessWorldStateSalience(
    {
      current:
        stateRecord(
          "runtime.node.desktop.online",
          false,
        ),
    },
    {
      now:
        new Date(
          "2026-08-25T17:31:01.000Z",
        ),
    },
  );

const namespaceRelevance =
  assessGoalRelevance(
    namespaceSignal,
    goal,
  );

assert.equal(
  namespaceRelevance.relevanceScore,
  50,
);
assert.ok(
  namespaceRelevance.reasons.some(
    (reason) =>
      reason.code ===
      "namespace",
  ),
);
pass(
  "goal namespace scope raises relevance without pretending to be an exact match",
);

const prefixGoal =
  buildCognitiveGoal({
    id:
      "watch-services",
    title:
      "Watch service health",
    priority:
      "normal",
    scope: {
      keyPrefixes: [
        "service.",
      ],
    },
  });

const prefixRelevance =
  assessGoalRelevance(
    baseSignal,
    prefixGoal,
  );

assert.equal(
  prefixRelevance.relevanceScore,
  75,
);
pass(
  "key-prefix goals sit between exact-key and namespace relevance",
);

const unrelatedGoal =
  buildCognitiveGoal({
    id:
      "watch-desktop",
    title:
      "Watch desktop state",
    priority:
      "critical",
    importance:
      1,
    urgency:
      1,
    scope: {
      namespaces: [
        "desktop",
      ],
    },
  });

const prioritized =
  prioritizeAttentionForGoals(
    baseSignal,
    [
      goal,
      unrelatedGoal,
    ],
  );

assert.equal(
  prioritized.matchedGoals.length,
  1,
);
assert.equal(
  prioritized.matchedGoals[0]
    ?.goalId,
  "keep-runtime-healthy",
);
assert.ok(
  prioritized.goalBoost > 0,
);
assert.ok(
  prioritized.score >
    prioritized.baseScore,
);
pass(
  "only relevant active goals boost attention priority",
);

const pausedGoal =
  buildCognitiveGoal({
    ...goal,
    status:
      "paused",
  });

const pausedResult =
  prioritizeAttentionForGoals(
    baseSignal,
    [
      pausedGoal,
    ],
  );

assert.equal(
  pausedResult.goalBoost,
  0,
);
assert.equal(
  pausedResult.score,
  baseSignal.score,
);
pass(
  "paused goals cannot influence attention priority",
);

const goalAware =
  new ChernobogGoalAwareAttention(
    registry,
  );

const goalAwareResult =
  goalAware.prioritize(
    baseSignal,
  );

assert.ok(
  goalAwareResult.score >=
    baseSignal.score,
);
assert.equal(
  goalAwareResult.matchedGoals[0]
    ?.goalId,
  "keep-runtime-healthy",
);
pass(
  "goal-aware attention facade combines the active goal registry with salience signals",
);

const resultKeys =
  Object.keys(
    goalAwareResult,
  );

assert.equal(
  resultKeys.includes(
    "action",
  ),
  false,
);
assert.equal(
  resultKeys.includes(
    "decision",
  ),
  false,
);
assert.equal(
  resultKeys.includes(
    "recommendation",
  ),
  false,
);
pass(
  "11H-B changes priority without selecting actions, decisions, or recommendations",
);

const returned =
  registry.get(
    "keep-runtime-healthy",
  );

assert.ok(returned);

if (!returned) {
  throw new Error(
    "Expected goal.",
  );
}

returned.title =
  "mutated outside registry";

assert.notEqual(
  registry.get(
    "keep-runtime-healthy",
  )?.title,
  "mutated outside registry",
);
pass(
  "goal registry returns defensive clones",
);

console.log(
  "===========================================",
);
console.log(
  "PASS Phase 11H-B Goals & Priorities acceptance",
);
