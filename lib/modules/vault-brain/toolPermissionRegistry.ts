import type { TrustActionType, TrustRiskLevel } from "./trustActionTypes";

export type TrustToolPermission = {
  toolId: string;
  title: string;
  actionType: TrustActionType;
  defaultRisk: TrustRiskLevel;
  description: string;
};

export const DEFAULT_TOOL_PERMISSIONS: TrustToolPermission[] = [
  {
    toolId: "vault.memory.read",
    title: "Vault Memory Read",
    actionType: "memory-read",
    defaultRisk: "safe_auto",
    description: "Read approved structured memory and context packets.",
  },
  {
    toolId: "vault.memory.write",
    title: "Vault Memory Write",
    actionType: "memory-write",
    defaultRisk: "requires_approval",
    description: "Create or edit structured memory entries.",
  },
  {
    toolId: "vault.memory.approve",
    title: "Vault Memory Approval",
    actionType: "memory-approve",
    defaultRisk: "requires_approval",
    description: "Promote reviewed memory into approved memory.",
  },
  {
    toolId: "files.read",
    title: "File Read",
    actionType: "file-read",
    defaultRisk: "safe_with_notice",
    description: "Read local project or vault files.",
  },
  {
    toolId: "files.write",
    title: "File Write",
    actionType: "file-write",
    defaultRisk: "requires_approval",
    description: "Write, patch, move, or rename local files.",
  },
  {
    toolId: "project.command",
    title: "Project Command",
    actionType: "project-command",
    defaultRisk: "dangerous_requires_explicit_approval",
    description: "Run npm, node, git, shell, or project automation commands.",
  },
  {
    toolId: "system.execute",
    title: "System Execute",
    actionType: "system-execute",
    defaultRisk: "dangerous_requires_explicit_approval",
    description: "Execute operating-system-level actions.",
  },
  {
    toolId: "external.send",
    title: "External Send",
    actionType: "external-send",
    defaultRisk: "requires_approval",
    description: "Send messages, files, or data outside the local project boundary.",
  },
  {
    toolId: "destructive.delete",
    title: "Destructive Delete",
    actionType: "delete",
    defaultRisk: "forbidden",
    description: "Delete project, vault, system, or source-control material.",
  },
];

export function getDefaultToolPermission(toolId: string): TrustToolPermission | undefined {
  const normalized = toolId.trim().toLowerCase();
  return DEFAULT_TOOL_PERMISSIONS.find((permission) => permission.toolId === normalized);
}

export function listDefaultToolPermissions(): TrustToolPermission[] {
  return [...DEFAULT_TOOL_PERMISSIONS];
}
