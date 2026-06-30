export const VAULT_MEMORY_TYPES = [
  "raw",
  "summary",
  "task",
  "decision",
  "bug",
  "idea",
  "roadmap",
  "code-summary",
  "project-state",
  "identity",
  "rule",
] as const;

export type VaultMemoryType = (typeof VAULT_MEMORY_TYPES)[number];

export const VAULT_MEMORY_SOURCES = [
  "discord",
  "chatgpt",
  "manual",
  "git",
  "code",
  "file",
  "system",
  "api",
  "import",
] as const;

export type VaultMemorySource = (typeof VAULT_MEMORY_SOURCES)[number];

export type VaultSourceRef = {
  type: string;
  path?: string;
  messageId?: string;
  commitHash?: string;
  url?: string;
  noteId?: string;
  threadId?: string;
  lineStart?: number;
  lineEnd?: number;
};

export type VaultMemoryEntry = {
  id: string;
  title: string;
  body: string;

  source: VaultMemorySource;
  memoryType: VaultMemoryType;
  status: import("./memoryStatus").VaultMemoryStatus;

  projectId?: string;
  version?: string;

  tags: string[];
  confidence: number;

  createdAt: string;
  updatedAt: string;

  sourceRef?: VaultSourceRef;

  reviewedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  staleAt?: string;
  supersededAt?: string;
  supersededBy?: string;
  reviewNotes?: string;
};

export type VaultMemoryEntryInput = {
  id?: string;
  title: string;
  body: string;
  source: VaultMemorySource;
  memoryType: VaultMemoryType;
  status: import("./memoryStatus").VaultMemoryStatus;
  projectId?: string;
  version?: string;
  tags?: string[];
  confidence?: number;
  createdAt?: string;
  updatedAt?: string;
  sourceRef?: VaultSourceRef;
  reviewNotes?: string;
};

export function isVaultMemoryType(value: string): value is VaultMemoryType {
  return VAULT_MEMORY_TYPES.includes(value as VaultMemoryType);
}

export function isVaultMemorySource(value: string): value is VaultMemorySource {
  return VAULT_MEMORY_SOURCES.includes(value as VaultMemorySource);
}

export function normalizeVaultMemoryType(value: string): VaultMemoryType {
  const normalized = value.trim().toLowerCase();
  if (isVaultMemoryType(normalized)) {
    return normalized;
  }
  return "summary";
}

export function normalizeVaultMemorySource(value: string): VaultMemorySource {
  const normalized = value.trim().toLowerCase();
  if (isVaultMemorySource(normalized)) {
    return normalized;
  }
  return "manual";
}
