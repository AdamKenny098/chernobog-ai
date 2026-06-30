import { buildMemoryContextPacket, type MemoryContextPacket, type VaultAnswerMode } from "./memoryContextPacket";
import { createVaultMemoryStore } from "./memoryStore";
import { inferVaultProjectScope, normalizeProjectId, normalizeVersion } from "./projectScope";
import type { VaultMemoryEntry } from "./memoryTypes";
import type { VaultMemoryStatus } from "./memoryStatus";

export type StructuredVaultRecallRequest = {
  query: string;
  projectId?: string;
  version?: string;
  answerMode?: VaultAnswerMode;
  limit?: number;
  includeStatuses?: VaultMemoryStatus[];
};

export type StructuredVaultRecallResult = {
  request: Required<Pick<StructuredVaultRecallRequest, "query" | "answerMode" | "limit">> & {
    projectId?: string;
    version?: string;
  };
  entries: VaultMemoryEntry[];
  packet: MemoryContextPacket;
  warnings: string[];
};

const DEFAULT_RECALL_LIMIT = 8;

function scoreEntry(query: string, entry: VaultMemoryEntry): number {
  const tokens = query
    .toLowerCase()
    .split(/\s+/g)
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return 0;
  }

  const title = entry.title.toLowerCase();
  const body = entry.body.toLowerCase();
  const tags = entry.tags.join(" ").toLowerCase();
  const project = entry.projectId?.toLowerCase() ?? "";
  const version = entry.version?.toLowerCase() ?? "";

  let score = 0;
  for (const token of tokens) {
    if (title.includes(token)) score += 5;
    if (tags.includes(token)) score += 4;
    if (project.includes(token)) score += 3;
    if (version.includes(token)) score += 3;
    if (body.includes(token)) score += 1;
  }

  if (entry.status === "approved") score += 10;
  if (entry.memoryType === "project-state") score += 2;
  if (entry.memoryType === "roadmap") score += 2;
  if (entry.memoryType === "decision") score += 1;

  return score;
}

export async function recallStructuredVaultMemory(
  request: StructuredVaultRecallRequest
): Promise<StructuredVaultRecallResult> {
  const query = request.query.trim();
  const inferredScope = inferVaultProjectScope(query);
  const projectId = normalizeProjectId(request.projectId) ?? inferredScope.projectId;
  const version = normalizeVersion(request.version) ?? inferredScope.version;
  const answerMode = request.answerMode ?? "vault-only";
  const limit = request.limit ?? DEFAULT_RECALL_LIMIT;
  const warnings: string[] = [];

  if (!query) {
    warnings.push("Recall query was empty.");
  }

  const store = createVaultMemoryStore();
  const statuses = answerMode === "vault-only"
    ? ["approved" as const]
    : request.includeStatuses ?? ["approved", "reviewed", "candidate"];

  const entries = await store.listEntries({
    text: query,
    projectId,
    version,
    statuses: [...statuses],
    limit: Math.max(limit * 3, limit),
  });

  const scored = entries
    .map((entry) => ({ entry, score: scoreEntry(query, entry) }))
    .sort((a, b) => b.score - a.score || b.entry.updatedAt.localeCompare(a.entry.updatedAt))
    .slice(0, limit)
    .map((item) => item.entry);

  if (answerMode === "vault-only" && scored.length === 0) {
    warnings.push("No approved memory matched the query. Vault-only answer should not invent missing project history.");
  }

  const packet = buildMemoryContextPacket({
    query,
    entries: scored,
    answerMode,
    projectScope: projectId,
    versionScope: version,
    missingInfoWarnings: warnings,
  });

  return {
    request: {
      query,
      answerMode,
      limit,
      projectId,
      version,
    },
    entries: scored,
    packet,
    warnings,
  };
}
