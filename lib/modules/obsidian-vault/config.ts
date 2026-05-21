import path from "node:path";

const DEFAULT_SCAN_LIMIT = 2500;

export type VaultConfig = {
  root: string;
  scanLimit: number;
};

export function getVaultRoot(): string {
  const value = process.env.CHERNOBOG_VAULT_ROOT?.trim();

  if (!value) {
    throw new Error(
      "CHERNOBOG_VAULT_ROOT is not configured. Add it to .env.local."
    );
  }

  return path.resolve(value);
}

export function getVaultScanLimit(): number {
  const raw = process.env.CHERNOBOG_VAULT_SCAN_LIMIT?.trim();

  if (!raw) return DEFAULT_SCAN_LIMIT;

  const parsed = Number.parseInt(raw, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_SCAN_LIMIT;
  }

  return Math.min(parsed, 10000);
}

export function getVaultConfig(): VaultConfig {
  return {
    root: getVaultRoot(),
    scanLimit: getVaultScanLimit(),
  };
}
