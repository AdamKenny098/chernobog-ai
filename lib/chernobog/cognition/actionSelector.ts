import type {
  CognitiveResponseMode,
  CognitiveActionDecisionInput,
} from "./actionTypes";

export function selectRequestedResponseMode(
  input: CognitiveActionDecisionInput,
): CognitiveResponseMode {
  const selected =
    input.focus.selected;

  if (!selected) {
    return "ignore";
  }

  const signal =
    selected.signal;

  if (
    signal.band === "none" ||
    signal.band === "low"
  ) {
    return "ignore";
  }

  if (
    signal.assessment.confidence < 0.5
  ) {
    return input.governance
      .userInteractionAvailable
      ? "ask"
      : "wait";
  }

  if (
    signal.assessment.freshness
      .status === "stale"
  ) {
    return "wait";
  }

  if (
    !input.opportunity
  ) {
    return (
      signal.band === "high" ||
      signal.band === "critical"
    )
      ? "suggest"
      : "wait";
  }

  if (
    input.opportunity
      .requiresUserInput
  ) {
    return input.governance
      .userInteractionAvailable
      ? "ask"
      : "wait";
  }

  if (
    signal.band === "critical" ||
    signal.band === "high"
  ) {
    return "act";
  }

  return "suggest";
}
