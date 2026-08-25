import assert from "node:assert/strict";

import {
  createWorldStateRecord,
} from "../lib/chernobog/worldState";
import {
  assessWorldStateSalience,
  decideCognitiveResponse,
  salienceBandForScore,
} from "../lib/chernobog/cognition";
import type {
  CognitiveActionDecisionInput,
  CognitiveActionOpportunity,
  CognitiveAttentionSignal,
  CognitiveControlSnapshot,
  CognitiveGovernanceSnapshot,
} from "../lib/chernobog/cognition";

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

function signal(
  key: string,
  score: number,
  options: {
    confidence?: number;
    expiresAt?: string;
    now?: string;
  } = {},
): CognitiveAttentionSignal {
  const now =
    options.now ??
    "2026-08-25T18:20:00.000Z";

  const record =
    createWorldStateRecord(
      {
        key,
        value: "failed",
        observedAt:
          "2026-08-25T18:19:59.000Z",
        confidence:
          options.confidence ?? 1,
        expiresAt:
          options.expiresAt,
        freshnessBasis:
          options.expiresAt
            ? "explicit-expiry"
            : "none",
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
      new Date(now),
    );

  const base =
    assessWorldStateSalience(
      {
        current:
          record,
      },
      {
        now:
          new Date(now),
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
  selectedSignal?:
    CognitiveAttentionSignal,
): CognitiveControlSnapshot {
  return {
    cycle: 7,
    generatedAt:
      "2026-08-25T18:20:00.000Z",
    reason:
      selectedSignal
        ? "initial-focus"
        : "no-candidates",
    changed:
      Boolean(
        selectedSignal,
      ),
    currentKey:
      selectedSignal?.key,
    selected:
      selectedSignal
        ? {
            rank: 1,
            eligible: true,
            signal:
              selectedSignal,
            prioritized: {
              signal:
                selectedSignal,
              baseScore:
                selectedSignal.score,
              goalBoost: 0,
              score:
                selectedSignal.score,
              band:
                selectedSignal.band,
              matchedGoals: [],
            },
          }
        : undefined,
    candidates:
      selectedSignal
        ? [
            {
              rank: 1,
              eligible: true,
              signal:
                selectedSignal,
              prioritized: {
                signal:
                  selectedSignal,
                baseScore:
                  selectedSignal.score,
                goalBoost: 0,
                score:
                  selectedSignal.score,
                band:
                  selectedSignal.band,
                matchedGoals: [],
              },
            },
          ]
        : [],
  };
}

const ALLOW_BOUNDED:
  CognitiveGovernanceSnapshot = {
    permission: "allow",
    autonomy: "bounded",
    userInteractionAvailable: true,
  };

const READ_OPPORTUNITY:
  CognitiveActionOpportunity = {
    id: "inspect-runtime",
    description:
      "Inspect runtime health",
    capability:
      "runtime.inspect",
    effect: "read",
    risk: "low",
    reversible: true,
  };

function decide(
  overrides:
    Partial<CognitiveActionDecisionInput>,
) {
  return decideCognitiveResponse(
    {
      focus:
        focus(
          signal(
            "service.ollama.health",
            90,
          ),
        ),
      opportunity:
        READ_OPPORTUNITY,
      governance:
        ALLOW_BOUNDED,
      ...overrides,
    },
    new Date(
      "2026-08-25T18:20:01.000Z",
    ),
  );
}

console.log(
  "Chernobog Phase 11H-D - Action Selection & Gating",
);
console.log(
  "==================================================",
);

const noFocus =
  decide({
    focus:
      focus(),
  });

assert.equal(
  noFocus.mode,
  "ignore",
);
assert.equal(
  noFocus.permittedToExecute,
  false,
);
assert.ok(
  noFocus.reasons.some(
    (reason) =>
      reason.code ===
      "no-focus",
  ),
);
pass(
  "no cognitive focus results in ignore rather than invented action",
);

const lowAttention =
  decide({
    focus:
      focus(
        signal(
          "desktop.vscode.active",
          20,
        ),
      ),
  });

assert.equal(
  lowAttention.mode,
  "ignore",
);
assert.equal(
  lowAttention.permittedToExecute,
  false,
);
pass(
  "low attention does not create unnecessary action",
);

const noOpportunity =
  decide({
    opportunity:
      undefined,
  });

assert.equal(
  noOpportunity.mode,
  "suggest",
);
assert.equal(
  noOpportunity.permittedToExecute,
  false,
);
pass(
  "important focus without an executable opportunity becomes a suggestion",
);

const needsInput =
  decide({
    opportunity: {
      ...READ_OPPORTUNITY,
      id:
        "repair-with-user-input",
      requiresUserInput: true,
    },
  });

assert.equal(
  needsInput.mode,
  "ask",
);
assert.equal(
  needsInput.permittedToExecute,
  false,
);
pass(
  "actions requiring user information become ask decisions",
);

const allowed =
  decide({});

assert.equal(
  allowed.requestedMode,
  "act",
);
assert.equal(
  allowed.mode,
  "act",
);
assert.equal(
  allowed.permittedToExecute,
  true,
);
assert.ok(
  allowed.reasons.some(
    (reason) =>
      reason.code ===
      "bounded-action-allowed",
  ),
);
pass(
  "reversible low-risk action is permitted inside explicit bounded autonomy",
);

const confirm =
  decide({
    governance: {
      permission:
        "confirm",
      autonomy:
        "bounded",
      userInteractionAvailable:
        true,
    },
  });

assert.equal(
  confirm.mode,
  "ask",
);
assert.equal(
  confirm.permittedToExecute,
  false,
);
pass(
  "confirmation-required permission gates execution into an ask",
);

const denied =
  decide({
    governance: {
      permission: "deny",
      autonomy:
        "bounded",
      userInteractionAvailable:
        true,
    },
  });

assert.equal(
  denied.mode,
  "suggest",
);
assert.equal(
  denied.permittedToExecute,
  false,
);
pass(
  "denied capability cannot execute even when highly salient",
);

const advisory =
  decide({
    governance: {
      permission: "allow",
      autonomy:
        "advisory",
      userInteractionAvailable:
        true,
    },
  });

assert.equal(
  advisory.mode,
  "suggest",
);
assert.equal(
  advisory.permittedToExecute,
  false,
);
pass(
  "advisory autonomy can recommend but cannot execute",
);

const disabled =
  decide({
    governance: {
      permission: "allow",
      autonomy:
        "disabled",
      userInteractionAvailable:
        true,
    },
  });

assert.equal(
  disabled.mode,
  "suggest",
);
assert.equal(
  disabled.permittedToExecute,
  false,
);
pass(
  "disabled autonomy never permits execution",
);

const highRisk =
  decide({
    opportunity: {
      ...READ_OPPORTUNITY,
      id:
        "dangerous-action",
      effect: "write",
      risk: "high",
    },
  });

assert.equal(
  highRisk.mode,
  "ask",
);
assert.equal(
  highRisk.permittedToExecute,
  false,
);
pass(
  "high-risk actions exceed bounded-autonomy execution ceiling",
);

const irreversible =
  decide({
    opportunity: {
      ...READ_OPPORTUNITY,
      id:
        "irreversible-write",
      effect: "write",
      risk: "medium",
      reversible: false,
    },
  });

assert.equal(
  irreversible.mode,
  "ask",
);
assert.equal(
  irreversible.permittedToExecute,
  false,
);
pass(
  "irreversible writes require user involvement even at otherwise permitted risk",
);

const unavailableUser =
  decide({
    opportunity: {
      ...READ_OPPORTUNITY,
      id:
        "high-risk-no-user",
      effect: "external",
      risk: "high",
    },
    governance: {
      permission: "allow",
      autonomy:
        "bounded",
      userInteractionAvailable:
        false,
    },
  });

assert.equal(
  unavailableUser.mode,
  "wait",
);
assert.equal(
  unavailableUser.permittedToExecute,
  false,
);
pass(
  "when required user involvement is unavailable, cognition waits instead of bypassing the gate",
);

const weakEvidence =
  decide({
    focus:
      focus(
        signal(
          "service.ollama.health",
          90,
          {
            confidence:
              0.2,
          },
        ),
      ),
  });

assert.equal(
  weakEvidence.mode,
  "ask",
);
assert.equal(
  weakEvidence.permittedToExecute,
  false,
);
pass(
  "low-confidence evidence blocks autonomous execution",
);

const staleEvidence =
  decide({
    focus:
      focus(
        signal(
          "backup.primary.health",
          90,
          {
            expiresAt:
              "2026-08-25T18:19:59.500Z",
            now:
              "2026-08-25T18:20:00.000Z",
          },
        ),
      ),
  });

assert.equal(
  staleEvidence.mode,
  "wait",
);
assert.equal(
  staleEvidence.permittedToExecute,
  false,
);
pass(
  "stale evidence causes wait rather than acting on obsolete state",
);

const actionKeys =
  Object.keys(
    allowed,
  );

assert.equal(
  actionKeys.includes(
    "execute",
  ),
  false,
);
assert.equal(
  actionKeys.includes(
    "toolResult",
  ),
  false,
);
assert.equal(
  actionKeys.includes(
    "output",
  ),
  false,
);
pass(
  "11H-D produces gated action intent but contains no execution mechanism",
);

const opportunityCopy =
  allowed.opportunity;

assert.ok(
  opportunityCopy,
);

if (!opportunityCopy) {
  throw new Error(
    "Expected action opportunity.",
  );
}

opportunityCopy.description =
  "mutated outside decision";

assert.notEqual(
  READ_OPPORTUNITY.description,
  "mutated outside decision",
);
pass(
  "action decisions defensively clone opportunity and governance inputs",
);

console.log(
  "==================================================",
);
console.log(
  "PASS Phase 11H-D Action Selection & Gating acceptance",
);

