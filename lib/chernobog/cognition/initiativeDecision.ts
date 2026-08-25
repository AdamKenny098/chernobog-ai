import {
  DEFAULT_COGNITIVE_INITIATIVE_POLICY,
  validateCognitiveInitiativePolicy,
} from "./initiativePolicy";
import {
  ChernobogInitiativeMemory,
} from "./initiativeMemory";
import type {
  CognitiveInitiativeDecision,
  CognitiveInitiativeDisposition,
  CognitiveInitiativeInput,
  CognitiveInitiativePolicy,
  CognitiveInitiativeReason,
} from "./initiativeTypes";

function addReason(
  reasons:
    CognitiveInitiativeReason[],
  code:
    CognitiveInitiativeReason["code"],
  detail: string,
): void {
  reasons.push({
    code,
    detail,
  });
}

function focusScore(
  input:
    CognitiveInitiativeInput,
): number {
  return (
    input.decision.focus.selected
      ?.prioritized.score ??
    input.decision.focus.selected
      ?.signal.score ??
    0
  );
}

function determineBaseDisposition(
  input:
    CognitiveInitiativeInput,
  score: number,
  policy:
    CognitiveInitiativePolicy,
  reasons:
    CognitiveInitiativeReason[],
): CognitiveInitiativeDisposition {
  const focus =
    input.decision.focus.selected;

  if (!focus) {
    addReason(
      reasons,
      "no-focus",
      "There is no selected cognitive focus to surface.",
    );
    return "suppress";
  }

  if (
    input.decision.mode ===
    "ignore"
  ) {
    addReason(
      reasons,
      "response-ignored",
      "The cognitive response mode is ignore.",
    );
    return "suppress";
  }

  if (
    score <
    policy.surfaceThreshold
  ) {
    addReason(
      reasons,
      "below-surface-threshold",
      "The focus does not meet the proactive surfacing threshold.",
    );
    return "suppress";
  }

  if (
    input.userAttention ===
    "do-not-disturb"
  ) {
    addReason(
      reasons,
      "do-not-disturb",
      "Do-not-disturb suppresses immediate interruption.",
    );
    return "defer";
  }

  if (
    input.userAttention ===
    "away"
  ) {
    addReason(
      reasons,
      "user-away",
      "The user is away, so the result should wait for a better presentation moment.",
    );
    return "defer";
  }

  if (
    input.userAttention ===
    "busy"
  ) {
    if (
      score >=
        policy.interruptThreshold &&
      focus.signal.band ===
        "critical" &&
      policy
        .criticalMayInterruptBusy
    ) {
      addReason(
        reasons,
        "critical-attention",
        "Critical attention exceeds the interrupt threshold while the user is busy.",
      );
      return "interrupt";
    }

    addReason(
      reasons,
      "user-busy",
      "The user is busy and the focus does not justify interruption.",
    );
    return "defer";
  }

  if (
    score >=
      policy.interruptThreshold &&
    focus.signal.band ===
      "critical"
  ) {
    addReason(
      reasons,
      "critical-attention",
      "Critical attention exceeds the immediate interrupt threshold.",
    );
    return "interrupt";
  }

  addReason(
    reasons,
    "high-attention",
    "The focus is important enough to surface proactively without interrupting.",
  );

  if (
    input.decision.mode ===
    "ask"
  ) {
    addReason(
      reasons,
      "confirmation-needed",
      "The underlying cognitive response requires user input or confirmation.",
    );
  } else if (
    input.decision.mode ===
    "act" &&
    input.decision
      .permittedToExecute
  ) {
    addReason(
      reasons,
      "action-ready",
      "A bounded action is available and permitted.",
    );
  } else {
    addReason(
      reasons,
      "advisory-result",
      "The cognitive result is advisory rather than immediately executable.",
    );
  }

  return "surface";
}

export function decideCognitiveInitiative(
  input:
    CognitiveInitiativeInput,
  options: {
    memory?:
      ChernobogInitiativeMemory;
    policy?:
      CognitiveInitiativePolicy;
    now?: Date;
  } = {},
): CognitiveInitiativeDecision {
  const now =
    options.now ??
    new Date();

  const policy =
    options.policy ??
    DEFAULT_COGNITIVE_INITIATIVE_POLICY;

  validateCognitiveInitiativePolicy(
    policy,
  );

  const reasons:
    CognitiveInitiativeReason[] = [];

  const score =
    focusScore(input);

  let disposition =
    determineBaseDisposition(
      input,
      score,
      policy,
      reasons,
    );

  const focusKey =
    input.decision.focusKey;

  if (
    focusKey &&
    disposition !==
      "suppress"
  ) {
    const previous =
      options.memory?.get(
        focusKey,
      );

    if (previous) {
      const previousMs =
        new Date(
          previous.surfacedAt,
        ).getTime();

      const elapsedMs =
        now.getTime() -
        previousMs;

      const escalation =
        score -
        previous.score;

      if (
        elapsedMs >= 0 &&
        elapsedMs <
          policy.cooldownMs
      ) {
        if (
          escalation >=
          policy.escalationDelta
        ) {
          addReason(
            reasons,
            "material-escalation",
            "The same focus materially escalated during cooldown, so it may surface again.",
          );
        } else {
          disposition =
            "suppress";

          addReason(
            reasons,
            "cooldown-active",
            "The same focus was surfaced recently without material escalation.",
          );
        }
      }
    }
  }

  const result:
    CognitiveInitiativeDecision = {
      id:
        `initiative:${input.decision.id}:${now.toISOString()}`,
      generatedAt:
        now.toISOString(),
      focusKey,
      score,
      disposition,
      reasons,
      decision:
        structuredClone(
          input.decision,
        ),
    };

  if (
    focusKey &&
    options.memory &&
    (
      disposition ===
        "interrupt" ||
      disposition ===
        "surface"
    )
  ) {
    options.memory.record({
      key:
        focusKey,
      surfacedAt:
        result.generatedAt,
      score,
      disposition,
    });
  }

  return result;
}
