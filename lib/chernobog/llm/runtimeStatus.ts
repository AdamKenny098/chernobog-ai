import type {
  ModelRole,
} from "./modelRouter";
import type {
  OllamaRuntimeReadiness,
} from "./runtimeReadiness";
import {
  checkOllamaRuntimeReadiness,
} from "./runtimeReadiness";

export type AiRuntimeOverallStatus =
  | "ready"
  | "degraded"
  | "unavailable";

export interface AiRuntimeRoleStatus {
  role: ModelRole;
  ready: boolean;
  configuredModel: string;
  matchedInstalledModel?: string;
  failureKind?: OllamaRuntimeReadiness["failureKind"];
  reason?: string;
}

export interface AiRuntimeStatus {
  provider: "ollama";
  status: AiRuntimeOverallStatus;
  checkedAt: string;
  readyRoles: ModelRole[];
  unavailableRoles: ModelRole[];
  roles: AiRuntimeRoleStatus[];
}

export const AI_RUNTIME_ROLES:
  readonly ModelRole[] = [
    "default",
    "code",
    "planner",
    "repair",
  ] as const;

export type AiRuntimeReadinessChecker =
  (
    role: ModelRole,
  ) => Promise<OllamaRuntimeReadiness>;

export async function getAiRuntimeStatus(
  options: {
    checkReadiness?:
      AiRuntimeReadinessChecker;
    clock?: () => Date;
  } = {},
): Promise<AiRuntimeStatus> {
  const checkReadiness =
    options.checkReadiness ??
    (
      (role) =>
        checkOllamaRuntimeReadiness(
          role,
        )
    );

  const roles:
    AiRuntimeRoleStatus[] = [];

  for (
    const role
    of AI_RUNTIME_ROLES
  ) {
    const readiness =
      await checkReadiness(role);

    roles.push({
      role,
      ready:
        readiness.ready,
      configuredModel:
        readiness.configuredModel,
      matchedInstalledModel:
        readiness.matchedInstalledModel,
      failureKind:
        readiness.failureKind,
      reason:
        readiness.reason,
    });
  }

  const readyRoles =
    roles
      .filter(
        (role) =>
          role.ready,
      )
      .map(
        (role) =>
          role.role,
      );

  const unavailableRoles =
    roles
      .filter(
        (role) =>
          !role.ready,
      )
      .map(
        (role) =>
          role.role,
      );

  const status:
    AiRuntimeOverallStatus =
      readyRoles.length ===
        roles.length
        ? "ready"
        : readyRoles.length === 0
          ? "unavailable"
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
    readyRoles,
    unavailableRoles,
    roles:
      structuredClone(
        roles,
      ),
  };
}
