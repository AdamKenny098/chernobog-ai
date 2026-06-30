import { inferVaultProjectScope, normalizeProjectId, normalizeVersion } from "./projectScope";
import { createProjectMemoryProfileStore, type CurrentProjectMemoryState } from "./projectProfileStore";

export type ResolvedProjectMemoryScope = {
  projectId?: string;
  version?: string;
  source: "explicit" | "current-state" | "query-inference" | "none";
  currentState: CurrentProjectMemoryState;
  warnings: string[];
};

export type ResolveProjectMemoryScopeInput = {
  query?: string;
  projectId?: string;
  version?: string;
};

export async function resolveProjectMemoryScope(
  input: ResolveProjectMemoryScopeInput = {}
): Promise<ResolvedProjectMemoryScope> {
  const store = createProjectMemoryProfileStore();
  const currentState = await store.loadCurrentState();
  const warnings: string[] = [];
  const inferred = inferVaultProjectScope(input.query ?? "");

  const explicitProjectId = await store.resolveProjectId(input.projectId);
  const explicitVersion = normalizeVersion(input.version);

  if (explicitProjectId || explicitVersion) {
    return {
      projectId: explicitProjectId ?? normalizeProjectId(currentState.activeProjectId) ?? inferred.projectId,
      version: explicitVersion ?? normalizeVersion(currentState.activeVersion) ?? inferred.version,
      source: "explicit",
      currentState,
      warnings,
    };
  }

  if (currentState.activeProjectId || currentState.activeVersion) {
    return {
      projectId: normalizeProjectId(currentState.activeProjectId) ?? inferred.projectId,
      version: normalizeVersion(currentState.activeVersion) ?? inferred.version,
      source: "current-state",
      currentState,
      warnings,
    };
  }

  if (inferred.projectId || inferred.version) {
    return {
      projectId: inferred.projectId,
      version: inferred.version,
      source: "query-inference",
      currentState,
      warnings,
    };
  }

  warnings.push("No project/version scope was explicit, active, or inferable from the query.");

  return {
    projectId: undefined,
    version: undefined,
    source: "none",
    currentState,
    warnings,
  };
}
