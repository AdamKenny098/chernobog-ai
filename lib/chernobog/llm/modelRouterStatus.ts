import type {
  ModelSelectionCandidate,
  ModelSelectionReason,
} from "./modelSelection";
import type {
  ModelRole,
} from "./modelRouter";
import {
  resolveReliableOllamaSelection,
} from "./reliableOllama";
import type {
  OllamaRuntimeReadiness,
} from "./runtimeReadiness";
import {
  checkOllamaRuntimeReadiness,
} from "./runtimeReadiness";

export type ModelRouterRoleState =
  | "primary"
  | "fallback"
  | "unavailable";

export type ModelRouterOverallStatus =
  | "ready"
  | "degraded"
  | "unavailable";

export interface ModelRouterRoleStatus {
  role: ModelRole;
  state: ModelRouterRoleState;
  providerStatus: string;
  primaryModel: string;
  selectedModel?: string;
  selectedInstalledModel?: string;
  fallbackUsed: boolean;
  reason:
    | ModelSelectionReason
    | "provider-unavailable";
  candidates: ModelSelectionCandidate[];
}

export interface ModelRouterStatus {
  provider: "ollama";
  status: ModelRouterOverallStatus;
  checkedAt: string;
  primaryRoles: ModelRole[];
  fallbackRoles: ModelRole[];
  unavailableRoles: ModelRole[];
  roles: ModelRouterRoleStatus[];
}

export const MODEL_ROUTER_ROLES:
  readonly ModelRole[] = [
    "default",
    "code",
    "planner",
    "repair",
  ] as const;

export type ModelRouterReadinessChecker =
  (
    role: ModelRole,
  ) => Promise<OllamaRuntimeReadiness>;

export async function getModelRouterStatus(
  options: {
    checkReadiness?:
      ModelRouterReadinessChecker;
    clock?: () => Date;
  } = {},
): Promise<ModelRouterStatus> {
  const checkReadiness =
    options.checkReadiness ??
    (
      (role) =>
        checkOllamaRuntimeReadiness(
          role,
        )
    );

  const roles:
    ModelRouterRoleStatus[] = [];

  for (
    const role
    of MODEL_ROUTER_ROLES
  ) {
    const readiness =
      await checkReadiness(role);

    const selection =
      resolveReliableOllamaSelection(
        role,
        readiness,
      );

    if (
      readiness.providerStatus !==
      "healthy"
    ) {
      roles.push({
        role,
        state:
          "unavailable",
        providerStatus:
          readiness.providerStatus,
        primaryModel:
          readiness.configuredModel,
        fallbackUsed:
          false,
        reason:
          "provider-unavailable",
        candidates: [],
      });

      continue;
    }

    if (
      !selection ||
      !selection.selectedModel
    ) {
      roles.push({
        role,
        state:
          "unavailable",
        providerStatus:
          readiness.providerStatus,
        primaryModel:
          selection?.primaryModel ??
          readiness.configuredModel,
        fallbackUsed:
          false,
        reason:
          "no-available-candidate",
        candidates:
          selection
            ? structuredClone(
                selection.candidates,
              )
            : [],
      });

      continue;
    }

    roles.push({
      role,
      state:
        selection.fallbackUsed
          ? "fallback"
          : "primary",
      providerStatus:
        readiness.providerStatus,
      primaryModel:
        selection.primaryModel,
      selectedModel:
        selection.selectedModel,
      selectedInstalledModel:
        selection.selectedInstalledModel,
      fallbackUsed:
        selection.fallbackUsed,
      reason:
        selection.reason,
      candidates:
        structuredClone(
          selection.candidates,
        ),
    });
  }

  const primaryRoles =
    roles
      .filter(
        (entry) =>
          entry.state ===
          "primary",
      )
      .map(
        (entry) =>
          entry.role,
      );

  const fallbackRoles =
    roles
      .filter(
        (entry) =>
          entry.state ===
          "fallback",
      )
      .map(
        (entry) =>
          entry.role,
      );

  const unavailableRoles =
    roles
      .filter(
        (entry) =>
          entry.state ===
          "unavailable",
      )
      .map(
        (entry) =>
          entry.role,
      );

  const routableCount =
    primaryRoles.length +
    fallbackRoles.length;

  const status:
    ModelRouterOverallStatus =
      routableCount === 0
        ? "unavailable"
        : fallbackRoles.length === 0 &&
          unavailableRoles.length === 0
          ? "ready"
          : "degraded";

  return {
    provider:
      "ollama",
    status,
    checkedAt:
      (
        options.clock ??
        (() => new Date())
      )().toISOString(),
    primaryRoles,
    fallbackRoles,
    unavailableRoles,
    roles:
      structuredClone(
        roles,
      ),
  };
}
