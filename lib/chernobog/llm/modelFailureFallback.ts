import type {
  GenerateWithOllamaResult,
} from "./ollamaClient";
import {
  isRetryableOllamaFailure,
} from "./ollamaClient";
import type {
  ModelSelectionDecision,
} from "./modelSelection";

export interface ReliableModelExecutionCandidate {
  model: string;
  source:
    ModelSelectionDecision["candidates"][number]["source"];
  candidateIndex: number;
}

export interface ReliableModelAttemptRecord {
  model: string;
  candidateIndex: number;
  attempts: number;
  ok: boolean;
  failureKind?:
    GenerateWithOllamaResult["failureKind"];
  httpStatus?: number;
}

export interface ReliableModelFallbackPolicy {
  maxCandidates?: number;
}

export function getAvailableExecutionCandidates(
  selection:
    ModelSelectionDecision,
): ReliableModelExecutionCandidate[] {
  return selection.candidates
    .map(
      (
        candidate,
        candidateIndex,
      ):
        | ReliableModelExecutionCandidate
        | undefined => {
        if (
          !candidate.available ||
          !candidate.matchedInstalledModel
        ) {
          return undefined;
        }

        return {
          model:
            candidate.matchedInstalledModel,
          source:
            candidate.source,
          candidateIndex,
        };
      },
    )
    .filter(
      (
        candidate,
      ): candidate is
        ReliableModelExecutionCandidate =>
        candidate !== undefined,
    );
}

export function shouldAdvanceToNextModel(
  result:
    GenerateWithOllamaResult,
): boolean {
  return (
    !result.ok &&
    isRetryableOllamaFailure(
      result,
    )
  );
}

export function normalizeMaxModelCandidates(
  value:
    number | undefined,
): number {
  const resolved =
    value ?? 2;

  if (
    !Number.isInteger(resolved) ||
    resolved < 1 ||
    resolved > 4
  ) {
    throw new Error(
      "Reliable Ollama maxCandidates must be an integer between 1 and 4.",
    );
  }

  return resolved;
}
