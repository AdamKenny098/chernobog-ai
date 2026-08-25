import assert from "node:assert/strict";

import {
  createWorldStateRecord,
} from "../lib/chernobog/worldState";
import {
  ChernobogAttentionQueue,
  ChernobogCognitiveControlLoop,
  ChernobogGoalRegistry,
  assessWorldStateSalience,
  rankCognitiveFocusCandidates,
  salienceBandForScore,
  selectCognitiveFocus,
} from "../lib/chernobog/cognition";
import type {
  CognitiveAttentionSignal,
} from "../lib/chernobog/cognition";

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

function makeSignal(
  key: string,
  score: number,
  generatedAt =
    "2026-08-25T18:00:00.000Z",
): CognitiveAttentionSignal {
  const record =
    createWorldStateRecord(
      {
        key,
        value: "observed",
        observedAt:
          "2026-08-25T17:59:59.000Z",
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
        "2026-08-25T18:00:00.000Z",
      ),
    );

  const base =
    assessWorldStateSalience(
      {
        current:
          record,
      },
      {
        now:
          new Date(
            generatedAt,
          ),
      },
    );

  return {
    ...base,
    generatedAt,
    score,
    band:
      salienceBandForScore(
        score,
      ),
  };
}

console.log(
  "Chernobog Phase 11H-C - Cognitive Control Loop",
);
console.log(
  "===============================================",
);

const empty =
  selectCognitiveFocus(
    [],
    [],
  );

assert.equal(
  empty.reason,
  "no-candidates",
);
assert.equal(
  empty.selected,
  undefined,
);
pass(
  "no attention signals produces no cognitive focus",
);

const below =
  selectCognitiveFocus(
    [
      makeSignal(
        "desktop.vscode.active",
        25,
      ),
    ],
    [],
  );

assert.equal(
  below.reason,
  "below-threshold",
);
assert.equal(
  below.selected,
  undefined,
);
pass(
  "low-salience signals remain below the focus threshold",
);

const initial =
  selectCognitiveFocus(
    [
      makeSignal(
        "project.chernobog.git.dirty",
        55,
      ),
      makeSignal(
        "service.ollama.health",
        70,
      ),
    ],
    [],
  );

assert.equal(
  initial.reason,
  "initial-focus",
);
assert.equal(
  initial.selected?.signal.key,
  "service.ollama.health",
);
pass(
  "highest eligible signal becomes initial focus deterministically",
);

const goals =
  new ChernobogGoalRegistry(
    () =>
      new Date(
        "2026-08-25T18:00:00.000Z",
      ),
  );

goals.upsert({
  id:
    "finish-chernobog",
  title:
    "Finish Chernobog development",
  priority:
    "critical",
  importance: 1,
  urgency: 1,
  scope: {
    keys: [
      "project.chernobog.git.dirty",
    ],
  },
});

const goalRanked =
  rankCognitiveFocusCandidates(
    [
      makeSignal(
        "service.ollama.health",
        70,
      ),
      makeSignal(
        "project.chernobog.git.dirty",
        55,
      ),
    ],
    goals.list({
      activeOnly: true,
    }),
  );

assert.equal(
  goalRanked[0]?.signal.key,
  "project.chernobog.git.dirty",
);
assert.ok(
  goalRanked[0]
    ?.prioritized.goalBoost >
    0,
);
pass(
  "active goals can legitimately move a lower raw-salience fact to the top of focus",
);

const retained =
  selectCognitiveFocus(
    [
      makeSignal(
        "service.ollama.health",
        70,
      ),
      makeSignal(
        "storage.vault.health",
        75,
      ),
    ],
    [],
    "service.ollama.health",
    {
      minimumFocusScore: 40,
      switchMargin: 10,
      maxCandidates: 8,
    },
  );

assert.equal(
  retained.reason,
  "retained-focus",
);
assert.equal(
  retained.selected?.signal.key,
  "service.ollama.health",
);
assert.equal(
  retained.changed,
  false,
);
pass(
  "focus hysteresis prevents small score changes from causing cognitive thrashing",
);

const switched =
  selectCognitiveFocus(
    [
      makeSignal(
        "service.ollama.health",
        70,
      ),
      makeSignal(
        "storage.vault.health",
        90,
      ),
    ],
    [],
    "service.ollama.health",
    {
      minimumFocusScore: 40,
      switchMargin: 10,
      maxCandidates: 8,
    },
  );

assert.equal(
  switched.reason,
  "switched-focus",
);
assert.equal(
  switched.selected?.signal.key,
  "storage.vault.health",
);
assert.equal(
  switched.changed,
  true,
);
pass(
  "a materially stronger challenger can take cognitive focus",
);

const ties =
  rankCognitiveFocusCandidates(
    [
      makeSignal(
        "service.beta.health",
        60,
        "2026-08-25T18:00:00.000Z",
      ),
      makeSignal(
        "service.alpha.health",
        60,
        "2026-08-25T18:00:00.000Z",
      ),
    ],
    [],
  );

assert.deepEqual(
  ties.map(
    (candidate) =>
      candidate.signal.key,
  ),
  [
    "service.alpha.health",
    "service.beta.health",
  ],
);
pass(
  "equal-score focus candidates have stable key-based ordering",
);

const queue =
  new ChernobogAttentionQueue();

queue.upsert(
  makeSignal(
    "service.ollama.health",
    65,
  ),
);

queue.upsert(
  makeSignal(
    "project.chernobog.git.dirty",
    55,
  ),
);

const loopGoals =
  new ChernobogGoalRegistry(
    () =>
      new Date(
        "2026-08-25T18:00:00.000Z",
      ),
  );

const loop =
  new ChernobogCognitiveControlLoop({
    attention:
      queue,
    goals:
      loopGoals,
    clock: () =>
      new Date(
        "2026-08-25T18:00:05.000Z",
      ),
  });

const first =
  loop.evaluate();

assert.equal(
  first.cycle,
  1,
);
assert.equal(
  first.currentKey,
  "service.ollama.health",
);
assert.equal(
  loop.currentKey,
  "service.ollama.health",
);
pass(
  "control loop converts the attention queue into an explicit current cognitive focus",
);

loopGoals.upsert({
  id:
    "project-focus",
  title:
    "Finish current project",
  priority:
    "critical",
  importance: 1,
  urgency: 1,
  scope: {
    keys: [
      "project.chernobog.git.dirty",
    ],
  },
});

const second =
  loop.evaluate();

assert.equal(
  second.cycle,
  2,
);
assert.equal(
  second.currentKey,
  "project.chernobog.git.dirty",
);
assert.equal(
  second.reason,
  "switched-focus",
);
pass(
  "goal changes are incorporated on the next cognitive cycle",
);

const last =
  loop.last;

assert.ok(last);

if (!last) {
  throw new Error(
    "Expected last cognitive snapshot.",
  );
}

last.currentKey =
  "mutated";

assert.notEqual(
  loop.last?.currentKey,
  "mutated",
);
pass(
  "control-loop snapshots are defensively cloned",
);

loop.clearFocus();

assert.equal(
  loop.currentKey,
  undefined,
);

const afterClear =
  loop.evaluate();

assert.equal(
  afterClear.reason,
  "initial-focus",
);
pass(
  "focus can be explicitly cleared without deleting goals or attention signals",
);

const outputKeys =
  Object.keys(
    afterClear,
  );

assert.equal(
  outputKeys.includes(
    "action",
  ),
  false,
);
assert.equal(
  outputKeys.includes(
    "tool",
  ),
  false,
);
assert.equal(
  outputKeys.includes(
    "recommendation",
  ),
  false,
);
pass(
  "11H-C selects focus but still does not select tools, actions, or recommendations",
);

console.log(
  "===============================================",
);
console.log(
  "PASS Phase 11H-C Cognitive Control Loop acceptance",
);
