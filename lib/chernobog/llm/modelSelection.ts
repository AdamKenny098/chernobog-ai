import {
  findInstalledOllamaModelMatch,
} from "./modelMatching";
import {
  getModelCandidates,
  resolveModel,
  type ModelCandidateSource,
  type ModelRole,
} from "./modelRouter";

export interface ModelSelectionCandidate {
  model: string;
  source:
    ModelCandidateSource;
  available: boolean;
  matchedInstalledModel?: string;
}

export type ModelSelectionReason =
  | "primary-available"
  | "fallback-selected"
  | "no-available-candidate";

export interface ModelSelectionDecision {
  requestedRole: ModelRole;
  primaryModel: string;
  selectedModel?: string;
  selectedInstalledModel?: string;
  fallbackUsed: boolean;
  reason:
    ModelSelectionReason;
  candidates:
    ModelSelectionCandidate[];
}

export function selectAvailableModel(
  role: ModelRole,
  installedModels:
    readonly string[],
): ModelSelectionDecision {
  const primary =
    resolveModel(role);

  const candidates =
    getModelCandidates(role)
      .map(
        (candidate):
          ModelSelectionCandidate => {
          const matchedInstalledModel =
            findInstalledOllamaModelMatch(
              candidate.model,
              installedModels,
            );

          return {
            model:
              candidate.model,
            source:
              candidate.source,
            available:
              matchedInstalledModel !==
              undefined,
            matchedInstalledModel,
          };
        },
      );

  const selectedIndex =
    candidates.findIndex(
      (candidate) =>
        candidate.available,
    );

  if (selectedIndex < 0) {
    return {
      requestedRole:
        role,
      primaryModel:
        primary.model,
      fallbackUsed:
        false,
      reason:
        "no-available-candidate",
      candidates,
    };
  }

  const selected =
    candidates[
      selectedIndex
    ]!;

  return {
    requestedRole:
      role,
    primaryModel:
      primary.model,
    selectedModel:
      selected.model,
    selectedInstalledModel:
      selected.matchedInstalledModel,
    fallbackUsed:
      selectedIndex > 0,
    reason:
      selectedIndex === 0
        ? "primary-available"
        : "fallback-selected",
    candidates,
  };
}
