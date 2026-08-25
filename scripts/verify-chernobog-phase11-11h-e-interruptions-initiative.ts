import assert from "node:assert/strict";

import {
  createWorldStateRecord,
} from "../lib/chernobog/worldState";
import {
  ChernobogInitiativeMemory,
  ChernobogInitiativeQueue,
  assessWorldStateSalience,
  decideCognitiveInitiative,
  decideCognitiveResponse,
  salienceBandForScore,
} from "../lib/chernobog/cognition";
import type {
  CognitiveActionDecision,
  CognitiveAttentionSignal,
  CognitiveControlSnapshot,
} from "../lib/chernobog/cognition";

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

function makeSignal(
  key: string,
  score: number,
): CognitiveAttentionSignal {
  const record =
    createWorldStateRecord(
      {
        key,
        value: "failed",
        observedAt:
          "2026-08-25T18:29:59.000Z",
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
        "2026-08-25T18:30:00.000Z",
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
            "2026-08-25T18:30:00.000Z",
          ),
      },
    );

  return {
    ...base,
    score,
    band:
      salienceBandForScore(
        score,
      ),
  };
}

function focus(
  signal?:
    CognitiveAttentionSignal,
): CognitiveControlSnapshot {
  return {
    cycle: 8,
    generatedAt:
      "2026-08-25T18:30:00.000Z",
    reason:
      signal
        ? "initial-focus"
        : "no-candidates",
    changed:
      Boolean(signal),
    currentKey:
      signal?.key,
    selected:
      signal
        ? {
            rank: 1,
            eligible: true,
            signal,
            prioritized: {
              signal,
              baseScore:
                signal.score,
              goalBoost: 0,
              score:
                signal.score,
              band:
                signal.band,
              matchedGoals: [],
            },
          }
        : undefined,
    candidates:
      signal
        ? [
            {
              rank: 1,
              eligible: true,
              signal,
              prioritized: {
                signal,
                baseScore:
                  signal.score,
                goalBoost: 0,
                score:
                  signal.score,
                band:
                  signal.band,
                matchedGoals: [],
              },
            },
          ]
        : [],
  };
}

function actionDecision(
  score: number,
): CognitiveActionDecision {
  return decideCognitiveResponse(
    {
      focus:
        focus(
          makeSignal(
            "service.ollama.health",
            score,
          ),
        ),
      opportunity: {
        id:
          "inspect-ollama",
        description:
          "Inspect Ollama health",
        capability:
          "runtime.inspect",
        effect: "read",
        risk: "low",
        reversible: true,
      },
      governance: {
        permission: "allow",
        autonomy: "bounded",
        userInteractionAvailable:
          true,
      },
    },
    new Date(
      "2026-08-25T18:30:01.000Z",
    ),
  );
}

console.log(
  "Chernobog Phase 11H-E - Interruptions & Initiative",
);
console.log(
  "===================================================",
);

const noFocusDecision =
  decideCognitiveResponse(
    {
      focus:
        focus(),
      governance: {
        permission: "allow",
        autonomy: "bounded",
        userInteractionAvailable:
          true,
      },
    },
    new Date(
      "2026-08-25T18:30:01.000Z",
    ),
  );

const noFocus =
  decideCognitiveInitiative(
    {
      decision:
        noFocusDecision,
      userAttention:
        "available",
    },
    {
      now:
        new Date(
          "2026-08-25T18:30:02.000Z",
        ),
    },
  );

assert.equal(
  noFocus.disposition,
  "suppress",
);
assert.ok(
  noFocus.reasons.some(
    (reason) =>
      reason.code ===
      "no-focus",
  ),
);
pass(
  "no cognitive focus produces no proactive initiative",
);

const low =
  decideCognitiveInitiative(
    {
      decision:
        actionDecision(45),
      userAttention:
        "available",
    },
    {
      now:
        new Date(
          "2026-08-25T18:30:02.000Z",
        ),
    },
  );

assert.equal(
  low.disposition,
  "suppress",
);
pass(
  "below-threshold cognition is suppressed as noise",
);

const high =
  decideCognitiveInitiative(
    {
      decision:
        actionDecision(75),
      userAttention:
        "available",
    },
    {
      now:
        new Date(
          "2026-08-25T18:30:02.000Z",
        ),
    },
  );

assert.equal(
  high.disposition,
  "surface",
);
pass(
  "high-value cognition surfaces proactively without forcing an interruption",
);

const criticalSourceDecision =
  actionDecision(95);

const critical =
  decideCognitiveInitiative(
    {
      decision:
        criticalSourceDecision,
      userAttention:
        "available",
    },
    {
      now:
        new Date(
          "2026-08-25T18:30:02.000Z",
        ),
    },
  );

assert.equal(
  critical.disposition,
  "interrupt",
);
pass(
  "critical cognition can request immediate interruption when the user is available",
);

const busyHigh =
  decideCognitiveInitiative(
    {
      decision:
        actionDecision(75),
      userAttention:
        "busy",
    },
    {
      now:
        new Date(
          "2026-08-25T18:30:02.000Z",
        ),
    },
  );

assert.equal(
  busyHigh.disposition,
  "defer",
);
pass(
  "busy user state defers important but non-critical initiative",
);

const busyCritical =
  decideCognitiveInitiative(
    {
      decision:
        actionDecision(95),
      userAttention:
        "busy",
    },
    {
      now:
        new Date(
          "2026-08-25T18:30:02.000Z",
        ),
    },
  );

assert.equal(
  busyCritical.disposition,
  "interrupt",
);
pass(
  "critical attention may cross the busy-user interruption threshold",
);

const dndCritical =
  decideCognitiveInitiative(
    {
      decision:
        actionDecision(95),
      userAttention:
        "do-not-disturb",
    },
    {
      now:
        new Date(
          "2026-08-25T18:30:02.000Z",
        ),
    },
  );

assert.equal(
  dndCritical.disposition,
  "defer",
);
pass(
  "do-not-disturb remains a hard immediate-interruption boundary",
);

const away =
  decideCognitiveInitiative(
    {
      decision:
        actionDecision(95),
      userAttention:
        "away",
    },
    {
      now:
        new Date(
          "2026-08-25T18:30:02.000Z",
        ),
    },
  );

assert.equal(
  away.disposition,
  "defer",
);
pass(
  "away state defers initiative rather than pretending the user can receive it",
);

const memory =
  new ChernobogInitiativeMemory();

const first =
  decideCognitiveInitiative(
    {
      decision:
        actionDecision(75),
      userAttention:
        "available",
    },
    {
      memory,
      now:
        new Date(
          "2026-08-25T18:30:02.000Z",
        ),
    },
  );

assert.equal(
  first.disposition,
  "surface",
);

const repeated =
  decideCognitiveInitiative(
    {
      decision:
        actionDecision(78),
      userAttention:
        "available",
    },
    {
      memory,
      now:
        new Date(
          "2026-08-25T18:31:02.000Z",
        ),
    },
  );

assert.equal(
  repeated.disposition,
  "suppress",
);
assert.ok(
  repeated.reasons.some(
    (reason) =>
      reason.code ===
      "cooldown-active",
  ),
);
pass(
  "cooldown suppresses repetitive proactive surfacing",
);

const escalated =
  decideCognitiveInitiative(
    {
      decision:
        actionDecision(95),
      userAttention:
        "available",
    },
    {
      memory,
      now:
        new Date(
          "2026-08-25T18:32:02.000Z",
        ),
    },
  );

assert.equal(
  escalated.disposition,
  "interrupt",
);
assert.ok(
  escalated.reasons.some(
    (reason) =>
      reason.code ===
      "material-escalation",
  ),
);
pass(
  "material escalation can bypass same-focus cooldown",
);

const queue =
  new ChernobogInitiativeQueue();

queue.enqueue(
  busyHigh,
);
queue.enqueue(
  dndCritical,
);
queue.enqueue(
  high,
);

assert.equal(
  queue.list().length,
  1,
);
assert.equal(
  queue.list()[0]
    ?.disposition,
  "defer",
);
assert.equal(
  queue.list()[0]
    ?.score,
  95,
);
pass(
  "deferred initiative queue keeps the strongest deferred item per focus key",
);

const decisionCopy =
  critical.decision;

decisionCopy.mode =
  "ignore";

assert.notEqual(
  criticalSourceDecision.mode,
  "ignore",
);
pass(
  "initiative decisions defensively clone underlying cognitive decisions",
);

const initiativeKeys =
  Object.keys(
    critical,
  );

assert.equal(
  initiativeKeys.includes(
    "send",
  ),
  false,
);
assert.equal(
  initiativeKeys.includes(
    "notify",
  ),
  false,
);
assert.equal(
  initiativeKeys.includes(
    "execute",
  ),
  false,
);
pass(
  "11H-E decides initiative disposition but does not send notifications, messages, or actions",
);

console.log(
  "===================================================",
);
console.log(
  "PASS Phase 11H-E Interruptions & Initiative acceptance",
);

