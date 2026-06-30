export type VaultProjectScope = {
  projectId?: string;
  version?: string;
};

const PROJECT_ALIASES: Record<string, string> = {
  chernobog: "chernobog",
  "chernobog-ai": "chernobog",
  "chernobog ai": "chernobog",
  "vault brain": "chernobog",
  "polar night": "polar-night",
  polarnight: "polar-night",
  sirio: "sirio-craft",
  siriocraft: "sirio-craft",
  "sirio craft": "sirio-craft",
  questledger: "questledger",
  "quest ledger": "questledger",
  "098 forge": "098-forge",
  "098forge": "098-forge",
};

export function normalizeProjectId(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  return PROJECT_ALIASES[normalized] ?? normalized.replace(/\s+/g, "-");
}

export function normalizeVersion(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const match = value.trim().toLowerCase().match(/v?\d+(?:\.\d+)*(?:[a-z])?/i);
  if (!match) {
    return undefined;
  }

  const version = match[0].startsWith("v") ? match[0] : `v${match[0]}`;
  return version;
}

export function inferVaultProjectScope(input: string): VaultProjectScope {
  const lower = input.toLowerCase();
  let projectId: string | undefined;

  for (const [alias, canonical] of Object.entries(PROJECT_ALIASES)) {
    if (lower.includes(alias)) {
      projectId = canonical;
      break;
    }
  }

  return {
    projectId,
    version: normalizeVersion(input),
  };
}
