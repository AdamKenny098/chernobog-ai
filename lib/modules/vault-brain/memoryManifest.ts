import type { VaultMemoryEntry, VaultMemoryType } from "./memoryTypes";
import { VAULT_MEMORY_TYPES } from "./memoryTypes";
import type { VaultMemoryStatus } from "./memoryStatus";
import { VAULT_MEMORY_STATUSES } from "./memoryStatus";

export type VaultMemoryManifest = {
  generatedAt: string;
  totalEntries: number;
  byStatus: Record<VaultMemoryStatus, number>;
  byType: Record<VaultMemoryType, number>;
  byProject: Record<string, number>;
  byVersion: Record<string, number>;
  approvedEntries: number;
  reviewQueueEntries: number;
  rawEntries: number;
};

function emptyStatusCounts(): Record<VaultMemoryStatus, number> {
  return VAULT_MEMORY_STATUSES.reduce((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {} as Record<VaultMemoryStatus, number>);
}

function emptyTypeCounts(): Record<VaultMemoryType, number> {
  return VAULT_MEMORY_TYPES.reduce((acc, type) => {
    acc[type] = 0;
    return acc;
  }, {} as Record<VaultMemoryType, number>);
}

export function buildVaultMemoryManifest(
  entries: VaultMemoryEntry[],
  generatedAt = new Date().toISOString()
): VaultMemoryManifest {
  const byStatus = emptyStatusCounts();
  const byType = emptyTypeCounts();
  const byProject: Record<string, number> = {};
  const byVersion: Record<string, number> = {};

  for (const entry of entries) {
    byStatus[entry.status] += 1;
    byType[entry.memoryType] += 1;

    if (entry.projectId) {
      byProject[entry.projectId] = (byProject[entry.projectId] ?? 0) + 1;
    }

    if (entry.version) {
      byVersion[entry.version] = (byVersion[entry.version] ?? 0) + 1;
    }
  }

  return {
    generatedAt,
    totalEntries: entries.length,
    byStatus,
    byType,
    byProject,
    byVersion,
    approvedEntries: byStatus.approved,
    reviewQueueEntries: byStatus.raw + byStatus.candidate + byStatus.reviewed,
    rawEntries: byStatus.raw,
  };
}
