import {
  gateCognitiveResponse,
} from "./actionGate";
import {
  selectRequestedResponseMode,
} from "./actionSelector";
import type {
  CognitiveActionDecision,
  CognitiveActionDecisionInput,
  CognitiveDecisionReason,
} from "./actionTypes";

function initialReasons(
  input:
    CognitiveActionDecisionInput,
): CognitiveDecisionReason[] {
  const selected =
    input.focus.selected;

  if (!selected) {
    return [
      {
        code:
          "no-focus",
        detail:
          "The cognitive control loop has no selected focus.",
      },
    ];
  }

  const signal =
    selected.signal;

  if (
    signal.band === "none" ||
    signal.band === "low"
  ) {
    return [
      {
        code:
          "low-attention",
        detail:
          "The current focus does not justify a response.",
      },
    ];
  }

  if (
    signal.assessment.confidence < 0.5
  ) {
    return [
      {
        code:
          "insufficient-evidence",
        detail:
          "Evidence confidence is too weak for autonomous action.",
      },
    ];
  }

  if (
    signal.assessment.freshness
      .status === "stale"
  ) {
    return [
      {
        code:
          "stale-evidence",
        detail:
          "The evidence behind the current focus is stale.",
      },
    ];
  }

  if (!input.opportunity) {
    return [
      {
        code:
          "no-action-opportunity",
        detail:
          "No concrete action opportunity is associated with the current focus.",
      },
    ];
  }

  return [];
}

export function decideCognitiveResponse(
  input:
    CognitiveActionDecisionInput,
  now = new Date(),
): CognitiveActionDecision {
  const requestedMode =
    selectRequestedResponseMode(
      input,
    );

  const gate =
    gateCognitiveResponse(
      requestedMode,
      input,
    );

  return {
    id:
      `decision:${input.focus.cycle}:${input.focus.currentKey ?? "none"}:${now.toISOString()}`,
    generatedAt:
      now.toISOString(),
    focusKey:
      input.focus.currentKey,
    requestedMode,
    mode:
      gate.mode,
    permittedToExecute:
      gate.permittedToExecute,
    opportunity:
      input.opportunity
        ? structuredClone(
            input.opportunity,
          )
        : undefined,
    governance:
      structuredClone(
        input.governance,
      ),
    reasons: [
      ...initialReasons(
        input,
      ),
      ...gate.reasons,
    ],
    focus:
      structuredClone(
        input.focus,
      ),
  };
}
