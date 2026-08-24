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
  
  function normaliseModelName(
    value: string
  ): string {
    return value
      .trim()
      .toLowerCase();
  }
  
  function findInstalledModelMatch(
    configuredModel: string,
    installedModels: string[]
  ): string | undefined {
    const configured =
      normaliseModelName(
        configuredModel
      );
  
    /*
     * An explicit tag must match exactly.
     *
     * Example:
     * deepseek-coder-v2:16b
     */
    if (configured.includes(":")) {
      return installedModels.find(
        (installedModel) =>
          normaliseModelName(
            installedModel
          ) === configured
      );
    }
  
    /*
     * Ollama treats an untagged model name
     * as :latest.
     *
     * Therefore:
     *
     * gemma3
     *
     * should match either:
     *
     * gemma3
     *
     * or:
     *
     * gemma3:latest
     */
    return installedModels.find(
      (installedModel) => {
        const installed =
          normaliseModelName(
            installedModel
          );
  
        return (
          installed === configured ||
          installed ===
            `${configured}:latest`
        );
      }
    );
  }
  
  export function resolveModelRoleAvailability(
    role: ModelRole,
    installedModels: string[]
  ): ModelRoleAvailability {
    const resolved =
      resolveModel(role);
  
    const matchedInstalledModel =
      findInstalledModelMatch(
        resolved.model,
        installedModels
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
    installedModels: string[]
  ): ModelAvailabilitySnapshot {
    const roles =
      CHERNOBOG_MODEL_ROLES.map(
        (role) =>
          resolveModelRoleAvailability(
            role,
            installedModels
          )
      );
  
    return {
      roles,
  
      availableRoles:
        roles
          .filter(
            (entry) =>
              entry.available
          )
          .map(
            (entry) =>
              entry.role
          ),
  
      unavailableRoles:
        roles
          .filter(
            (entry) =>
              !entry.available
          )
          .map(
            (entry) =>
              entry.role
          ),
    };
  }