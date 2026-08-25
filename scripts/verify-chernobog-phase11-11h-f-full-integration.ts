import assert from "node:assert/strict";

import {
  createWorldStateRecord,
} from "../lib/chernobog/worldState";
import {
  ChernobogCognitiveRuntime,
} from "../lib/chernobog/cognition";
import type {
  CognitiveActionOpportunity,
  CognitiveGovernanceSnapshot,
} from "../lib/chernobog/cognition";
import type {
  WorldStateRecord,
} from "../lib/chernobog/worldState";

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

function record(
  key: string,
  value:
    string | boolean,
  observedAt: string,
): WorldStateRecord {
  return createWorldStateRecord(
    {
      key,
      value,
      observedAt,
      confidence: 1,
      expiresAt:
        "2026-08-25T19:00:00.000Z",
      freshnessBasis:
        "explicit-expiry",
      provenance: {
        eventId:
          `event:${key}:${observedAt}`,
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
      observedAt,
    ),
  );
}

async function main(): Promise<void> {
console.log(
  "Chernobog Phase 11H-F - Integration & Full Acceptance",
);
console.log(
  "=======================================================",
);

let now =
  new Date(
    "2026-08-25T18:40:00.000Z",
  );

let worldState:
  WorldStateRecord[] = [
    record(
      "service.ollama.health",
      "healthy",
      "2026-08-25T18:39:59.000Z",
    ),
    record(
      "project.chernobog.git.dirty",
      false,
      "2026-08-25T18:39:59.000Z",
    ),
  ];

const runtime =
  new ChernobogCognitiveRuntime({
    readWorldState:
      () =>
        structuredClone(
          worldState,
        ),
    clock:
      () => now,
  });

runtime.goals.upsert({
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

const baseline =
  await runtime.evaluate();

assert.equal(
  baseline.observedRecords,
  2,
);
assert.ok(
  baseline.focus.currentKey,
);
assert.equal(
  baseline.action.permittedToExecute,
  false,
);
assert.notEqual(
  baseline.action.mode,
  "act",
);
pass(
  "live World State enters cognition with safe advisory-only default governance",
);

now =
  new Date(
    "2026-08-25T18:41:00.000Z",
  );

worldState = [
  record(
    "service.ollama.health",
    "failed",
    "2026-08-25T18:40:59.000Z",
  ),
  record(
    "project.chernobog.git.dirty",
    false,
    "2026-08-25T18:39:59.000Z",
  ),
];

const failure =
  await runtime.evaluate();

assert.equal(
  failure.focus.currentKey,
  "service.ollama.health",
);
assert.equal(
  failure.focus.selected
    ?.signal.band,
  "critical",
);
assert.equal(
  failure.action.mode,
  "suggest",
);
assert.equal(
  failure.action.permittedToExecute,
  false,
);
assert.equal(
  failure.initiative.disposition,
  "interrupt",
);
pass(
  "critical World State failure flows through salience, goals, focus, response selection, and initiative",
);

const boundedGovernance:
  CognitiveGovernanceSnapshot = {
    permission: "allow",
    autonomy: "bounded",
    userInteractionAvailable: true,
  };

const readOpportunity:
  CognitiveActionOpportunity = {
    id:
      "inspect-ollama-health",
    description:
      "Inspect Ollama health",
    capability:
      "runtime.inspect",
    effect: "read",
    risk: "low",
    reversible: true,
  };

const actionRuntime =
  new ChernobogCognitiveRuntime({
    readWorldState:
      () =>
        [
          record(
            "service.ollama.health",
            "failed",
            "2026-08-25T18:42:00.000Z",
          ),
        ],
    resolveOpportunity:
      () =>
        readOpportunity,
    resolveGovernance:
      () =>
        boundedGovernance,
    clock:
      () =>
        new Date(
          "2026-08-25T18:42:01.000Z",
        ),
  });

actionRuntime.goals.upsert({
  id:
    "repair-runtime",
  title:
    "Restore local AI runtime",
  priority:
    "critical",
  importance: 1,
  urgency: 1,
  scope: {
    keys: [
      "service.ollama.health",
    ],
  },
});

const actionable =
  await actionRuntime.evaluate();

assert.equal(
  actionable.action.mode,
  "act",
);
assert.equal(
  actionable.action.permittedToExecute,
  true,
);
assert.equal(
  actionable.action.opportunity
    ?.id,
  "inspect-ollama-health",
);
pass(
  "explicit bounded governance can authorize a low-risk reversible action intent",
);

assert.equal(
  Object.keys(
    actionable.action,
  ).includes(
    "execute",
  ),
  false,
);

assert.equal(
  Object.keys(
    actionable,
  ).includes(
    "toolResult",
  ),
  false,
);
pass(
  "authorized action intent remains separate from actual tool execution",
);

const deniedRuntime =
  new ChernobogCognitiveRuntime({
    readWorldState:
      () =>
        [
          record(
            "storage.vault.health",
            "failed",
            "2026-08-25T18:43:00.000Z",
          ),
        ],
    resolveOpportunity:
      () => ({
        id:
          "repair-storage",
        description:
          "Repair storage",
        capability:
          "storage.repair",
        effect: "write",
        risk: "medium",
        reversible: true,
      }),
    resolveGovernance:
      () => ({
        permission: "deny",
        autonomy: "bounded",
        userInteractionAvailable: true,
      }),
    clock:
      () =>
        new Date(
          "2026-08-25T18:43:01.000Z",
        ),
  });

const denied =
  await deniedRuntime.evaluate();

assert.equal(
  denied.action.permittedToExecute,
  false,
);
assert.notEqual(
  denied.action.mode,
  "act",
);
pass(
  "governance denial overrides salience and goal pressure",
);

const dndRuntime =
  new ChernobogCognitiveRuntime({
    readWorldState:
      () =>
        [
          record(
            "backup.primary.health",
            "failed",
            "2026-08-25T18:44:00.000Z",
          ),
        ],
    resolveUserAttention:
      () =>
        "do-not-disturb",
    clock:
      () =>
        new Date(
          "2026-08-25T18:44:01.000Z",
        ),
  });

const dnd =
  await dndRuntime.evaluate();

assert.equal(
  dnd.initiative.disposition,
  "defer",
);
assert.equal(
  dndRuntime
    .deferredInitiative
    .list()
    .length,
  1,
);
pass(
  "do-not-disturb defers proactive cognition into the initiative queue",
);

const snapshot =
  actionRuntime.snapshot();

assert.equal(
  snapshot.activeGoals.length,
  1,
);
assert.ok(
  snapshot.attention.length >= 1,
);
assert.equal(
  snapshot.lastCycle?.cycle,
  1,
);
pass(
  "integrated cognitive runtime exposes inspectable working-state snapshots",
);

const snapshotCopy =
  actionRuntime.snapshot();

snapshotCopy.activeGoals[0]!.title =
  "mutated";

assert.notEqual(
  actionRuntime.snapshot()
    .activeGoals[0]?.title,
  "mutated",
);
pass(
  "integrated cognitive working state is defensively cloned",
);

actionRuntime.resetWorkingState();

assert.equal(
  actionRuntime.snapshot()
    .cycle,
  0,
);
assert.equal(
  actionRuntime.snapshot()
    .attention.length,
  0,
);
assert.equal(
  actionRuntime.goals.size,
  1,
);
pass(
  "working-state reset clears transient cognition without deleting active goals",
);

console.log(
  "=======================================================",
);
console.log(
  "PASS Phase 11H-F Integration & Full Acceptance",
);
console.log(
  "PASS Phase 11H Cognitive Control COMPLETE",
);
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
