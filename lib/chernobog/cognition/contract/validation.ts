import {
  COGNITIVE_CONTRACT_VERSION,
  type CognitiveConfidence,
  type CognitiveResult,
  type CognitiveTask,
} from "./types";

const RESULT_STATUSES = new Set([
  "completed",
  "needs_context",
  "needs_clarification",
  "needs_authorization",
  "uncertain",
  "failed",
]);

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isIsoDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !Number.isNaN(Date.parse(value))
  );
}

function isUnitInterval(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}

function validateConfidence(
  value: unknown,
): value is CognitiveConfidence {
  if (!isRecord(value)) {
    return false;
  }

  for (const key of [
    "modelReported",
    "systemEstimated",
    "validationStrength",
    "evidenceCoverage",
    "disagreement",
    "final",
  ]) {
    const score = value[key];
    if (
      score !== undefined &&
      !isUnitInterval(score)
    ) {
      return false;
    }
  }

  return true;
}

export function isCognitiveTask(
  value: unknown,
): value is CognitiveTask {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.contractVersion ===
      COGNITIVE_CONTRACT_VERSION &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    isIsoDate(value.createdAt) &&
    typeof value.source === "string" &&
    typeof value.rawInput === "string" &&
    Array.isArray(value.constraints)
  );
}

export function isCognitiveResult(
  value: unknown,
): value is CognitiveResult {
  if (!isRecord(value)) {
    return false;
  }

  if (
    value.contractVersion !==
      COGNITIVE_CONTRACT_VERSION ||
    typeof value.taskId !== "string" ||
    typeof value.status !== "string" ||
    !RESULT_STATUSES.has(value.status) ||
    !Array.isArray(value.conclusions) ||
    !Array.isArray(value.assumptions) ||
    !Array.isArray(value.uncertainties) ||
    !Array.isArray(value.proposedActions) ||
    !Array.isArray(value.evidence) ||
    !validateConfidence(value.confidence) ||
    !isRecord(value.provenance)
  ) {
    return false;
  }

  if (
    value.provenance.taskId !==
      value.taskId ||
    !isIsoDate(value.provenance.generatedAt)
  ) {
    return false;
  }

  return value.proposedActions.every(
    (action) =>
      isRecord(action) &&
      action.executable === false,
  );
}

export function assertCognitiveTask(
  value: unknown,
): asserts value is CognitiveTask {
  if (!isCognitiveTask(value)) {
    throw new Error(
      "Invalid OH-4A CognitiveTask contract.",
    );
  }
}

export function assertCognitiveResult(
  value: unknown,
): asserts value is CognitiveResult {
  if (!isCognitiveResult(value)) {
    throw new Error(
      "Invalid OH-4A CognitiveResult contract.",
    );
  }
}