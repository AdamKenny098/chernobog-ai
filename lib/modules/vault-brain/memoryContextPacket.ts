import type { VaultMemoryEntry, VaultMemoryType } from "./memoryTypes";
import type { VaultMemoryStatus } from "./memoryStatus";

export type VaultAnswerMode = "vault-only" | "vault-first" | "general";

export type MemoryContextPacketEntry = {
  id: string;
  title: string;
  memoryType: VaultMemoryType;
  status: VaultMemoryStatus;
  trust: "approved" | "candidate" | "raw";
  relevanceScore: number;
  excerpt: string;
  projectId?: string;
  version?: string;
};

export type MemoryContextPacket = {
  query: string;
  projectScope?: string;
  versionScope?: string;
  answerMode: VaultAnswerMode;
  retrievedEntries: MemoryContextPacketEntry[];
  missingInfoWarnings: string[];
};

function getTrust(entry: VaultMemoryEntry): "approved" | "candidate" | "raw" {
  if (entry.status === "approved") {
    return "approved";
  }

  if (entry.status === "raw") {
    return "raw";
  }

  return "candidate";
}

function excerpt(body: string, maxLength: number): string {
  const clean = body.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) {
    return clean;
  }

  return `${clean.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

export function buildMemoryContextPacket(args: {
  query: string;
  entries: VaultMemoryEntry[];
  answerMode: VaultAnswerMode;
  projectScope?: string;
  versionScope?: string;
  missingInfoWarnings?: string[];
  maxExcerptLength?: number;
}): MemoryContextPacket {
  const maxExcerptLength = args.maxExcerptLength ?? 700;
  const entries = args.answerMode === "vault-only"
    ? args.entries.filter((entry) => entry.status === "approved")
    : args.entries;

  const missingInfoWarnings = [...(args.missingInfoWarnings ?? [])];

  if (args.answerMode === "vault-only" && entries.length === 0) {
    missingInfoWarnings.push(
      "No approved structured memory entries were available for this vault-only answer."
    );
  }

  return {
    query: args.query,
    projectScope: args.projectScope,
    versionScope: args.versionScope,
    answerMode: args.answerMode,
    retrievedEntries: entries.map((entry, index) => ({
      id: entry.id,
      title: entry.title,
      memoryType: entry.memoryType,
      status: entry.status,
      trust: getTrust(entry),
      relevanceScore: Math.max(0.01, 1 - index * 0.05),
      excerpt: excerpt(entry.body, maxExcerptLength),
      projectId: entry.projectId,
      version: entry.version,
    })),
    missingInfoWarnings,
  };
}
