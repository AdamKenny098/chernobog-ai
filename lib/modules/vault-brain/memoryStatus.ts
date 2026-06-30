export const VAULT_MEMORY_STATUSES = [
  "raw",
  "candidate",
  "reviewed",
  "approved",
  "rejected",
  "stale",
  "superseded",
] as const;

export type VaultMemoryStatus = (typeof VAULT_MEMORY_STATUSES)[number];

export type VaultMemoryStatusTransition = {
  from: VaultMemoryStatus;
  to: VaultMemoryStatus;
};

const ALLOWED_STATUS_TRANSITIONS: Record<VaultMemoryStatus, VaultMemoryStatus[]> = {
  raw: ["candidate", "rejected", "stale"],
  candidate: ["reviewed", "rejected", "stale", "superseded"],
  reviewed: ["approved", "candidate", "rejected", "stale", "superseded"],
  approved: ["stale", "superseded"],
  rejected: [],
  stale: ["superseded"],
  superseded: [],
};

export function isVaultMemoryStatus(value: string): value is VaultMemoryStatus {
  return VAULT_MEMORY_STATUSES.includes(value as VaultMemoryStatus);
}

export function getAllowedVaultMemoryStatusTransitions(
  status: VaultMemoryStatus
): VaultMemoryStatus[] {
  return [...ALLOWED_STATUS_TRANSITIONS[status]];
}

export function canTransitionVaultMemoryStatus(
  from: VaultMemoryStatus,
  to: VaultMemoryStatus
): boolean {
  if (from === to) {
    return true;
  }

  return ALLOWED_STATUS_TRANSITIONS[from].includes(to);
}

export function assertVaultMemoryStatusTransition(
  from: VaultMemoryStatus,
  to: VaultMemoryStatus
): void {
  if (!canTransitionVaultMemoryStatus(from, to)) {
    throw new Error(
      `Invalid vault memory status transition: ${from} -> ${to}. Raw memory must not skip review into approved memory.`
    );
  }
}

export function isApprovedVaultMemoryStatus(status: VaultMemoryStatus): boolean {
  return status === "approved";
}

export function isReviewableVaultMemoryStatus(status: VaultMemoryStatus): boolean {
  return status === "candidate" || status === "reviewed";
}

export function isTerminalVaultMemoryStatus(status: VaultMemoryStatus): boolean {
  return status === "rejected" || status === "superseded";
}
