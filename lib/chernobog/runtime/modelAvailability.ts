import {
  findInstalledOllamaModelMatch,
} from "../llm/modelMatching";
import {
  resolveModel,
  type ModelRole,
  type ResolvedModel,
} from "../llm/modelRouter";

export const CHERNOBOG_MODEL_ROLES = [
  "default",
  "code",
  "planner",
  "repair",
] as const satisfies readonly ModelRole[];

export interface ModelRoleAvailability {
  role: ModelRole;

  configuredModel: string;

  source: ResolvedModel["source"];

  available: boolean;

  matchedInstalledModel?: string;
}

export interface ModelAvailabilitySnapshot {
  roles: ModelRoleAvailability[];

  availableRoles: ModelRole[];

  unavailableRoles: ModelRole[];
}

export function resolveModelRoleAvailability(
  role: ModelRole,
  installedModels: string[],
): ModelRoleAvailability {
  const resolved =
    resolveModel(role);

  const matchedInstalledModel =
    findInstalledOllamaModelMatch(
      resolved.model,
      installedModels,
    );

  return {
    role,

    configuredModel:
      resolved.model,

    source:
      resolved.source,

    available:
      matchedInstalledModel !==
      undefined,

    matchedInstalledModel,
  };
}

export function buildModelAvailabilitySnapshot(
  installedModels: string[],
): ModelAvailabilitySnapshot {
  const roles =
    CHERNOBOG_MODEL_ROLES.map(
      (role) =>
        resolveModelRoleAvailability(
          role,
          installedModels,
        ),
    );

  return {
    roles,

    availableRoles:
      roles
        .filter(
          (entry) =>
            entry.available,
        )
        .map(
          (entry) =>
            entry.role,
        ),

    unavailableRoles:
      roles
        .filter(
          (entry) =>
            !entry.available,
        )
        .map(
          (entry) =>
            entry.role,
        ),
  };
}
