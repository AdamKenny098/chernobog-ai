import type {
  CognitiveRuntimeCycle,
} from "../cognition";
import {
  createLearningExperience,
} from "./experience";
import type {
  LearningExperience,
} from "./types";

export function learningExperienceFromCognitiveCycle(
  cycle: CognitiveRuntimeCycle,
  recordedAt = new Date(cycle.generatedAt),
): LearningExperience {
  const focusKey = cycle.focus.currentKey;

  const confidence =
    cycle.focus.selected
      ?.signal.assessment.confidence ??
    0.5;

  return createLearningExperience(
    {
      id:
        `cognitive-cycle:${cycle.cycle}:${cycle.generatedAt}`,
      occurredAt: cycle.generatedAt,
      recordedAt: recordedAt.toISOString(),
      source: "cognitive-cycle",
      subject: focusKey,
      confidence,
      outcome: {
        status: "unknown",
      },
      feedback: {
        kind: "none",
      },
      evidence: {
        worldStateKeys: focusKey
          ? [focusKey]
          : [],
        cognitiveDecisionIds: [
          cycle.action.id,
        ],
      },
      context: {
        cycle: cycle.cycle,
        focusKey,
        responseMode: cycle.action.mode,
        requestedMode:
          cycle.action.requestedMode,
        permittedToExecute:
          cycle.action.permittedToExecute,
        initiativeDisposition:
          cycle.initiative.disposition,
        observedRecords:
          cycle.observedRecords,
      },
    },
    recordedAt,
  );
}
