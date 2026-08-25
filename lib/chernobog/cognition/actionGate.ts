import {
  isBoundedActionRisk,
} from "./actionPolicy";
import type {
  CognitiveActionDecisionInput,
  CognitiveDecisionReason,
  CognitiveResponseMode,
} from "./actionTypes";

export interface CognitiveActionGateResult {
  mode: CognitiveResponseMode;
  permittedToExecute: boolean;
  reasons: CognitiveDecisionReason[];
}

function askOrWait(
  userInteractionAvailable: boolean,
): CognitiveResponseMode {
  return userInteractionAvailable
    ? "ask"
    : "wait";
}

export function gateCognitiveResponse(
  requestedMode:
    CognitiveResponseMode,
  input:
    CognitiveActionDecisionInput,
): CognitiveActionGateResult {
  const reasons:
    CognitiveDecisionReason[] = [];

  if (
    requestedMode !== "act"
  ) {
    return {
      mode:
        requestedMode,
      permittedToExecute:
        false,
      reasons,
    };
  }

  const opportunity =
    input.opportunity;

  if (!opportunity) {
    reasons.push({
      code:
        "no-action-opportunity",
      detail:
        "No executable opportunity was provided for the current focus.",
    });

    return {
      mode: "suggest",
      permittedToExecute:
        false,
      reasons,
    };
  }

  if (
    opportunity.requiresUserInput
  ) {
    reasons.push({
      code:
        "requires-user-input",
      detail:
        "The candidate action requires user-supplied information.",
    });

    return {
      mode:
        askOrWait(
          input.governance
            .userInteractionAvailable,
        ),
      permittedToExecute:
        false,
      reasons,
    };
  }

  if (
    input.governance.permission ===
    "deny"
  ) {
    reasons.push({
      code:
        "permission-denied",
      detail:
        "Governance denies this action capability.",
    });

    return {
      mode:
        input.governance
          .userInteractionAvailable
          ? "suggest"
          : "ignore",
      permittedToExecute:
        false,
      reasons,
    };
  }

  if (
    input.governance.permission ===
    "confirm"
  ) {
    reasons.push({
      code:
        "confirmation-required",
      detail:
        "Governance requires confirmation before execution.",
    });

    return {
      mode:
        askOrWait(
          input.governance
            .userInteractionAvailable,
        ),
      permittedToExecute:
        false,
      reasons,
    };
  }

  if (
    input.governance.autonomy ===
    "disabled"
  ) {
    reasons.push({
      code:
        "autonomy-disabled",
      detail:
        "Autonomous execution is disabled.",
    });

    return {
      mode:
        input.governance
          .userInteractionAvailable
          ? "suggest"
          : "wait",
      permittedToExecute:
        false,
      reasons,
    };
  }

  if (
    input.governance.autonomy ===
    "advisory"
  ) {
    reasons.push({
      code:
        "advisory-only",
      detail:
        "The current autonomy mode permits recommendations but not autonomous execution.",
    });

    return {
      mode: "suggest",
      permittedToExecute:
        false,
      reasons,
    };
  }

  if (
    !isBoundedActionRisk(
      opportunity.risk,
    )
  ) {
    reasons.push({
      code:
        "risk-too-high",
      detail:
        "The action risk exceeds the bounded-autonomy execution ceiling.",
    });

    return {
      mode:
        askOrWait(
          input.governance
            .userInteractionAvailable,
        ),
      permittedToExecute:
        false,
      reasons,
    };
  }

  if (
    !opportunity.reversible &&
    (
      opportunity.effect ===
        "write" ||
      opportunity.effect ===
        "external"
    )
  ) {
    reasons.push({
      code:
        "irreversible-change",
      detail:
        "Irreversible write or external side effects require user involvement.",
    });

    return {
      mode:
        askOrWait(
          input.governance
            .userInteractionAvailable,
        ),
      permittedToExecute:
        false,
      reasons,
    };
  }

  reasons.push({
    code:
      "bounded-action-allowed",
    detail:
      "Governance allows a reversible low/medium-risk action within bounded autonomy.",
  });

  return {
    mode: "act",
    permittedToExecute: true,
    reasons,
  };
}
