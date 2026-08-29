import type {
  UnifiedMemorySourceId,
} from "./unifiedTypes";
import type {
  UnifiedMemoryWritePolicyDescriptor,
} from "./writeTypes";

const POLICIES: readonly UnifiedMemoryWritePolicyDescriptor[] = [
  {
    source: "conversation-history",
    policy: "direct",
    authority: "lib/chernobog/memory.ts#saveMessage",
    reason: "Conversation messages already have a canonical append-only persistence function.",
  },
  {
    source: "session-state",
    policy: "direct",
    authority: "lib/chernobog/session/store.ts#saveSessionContext",
    reason: "Session state remains owned by the canonical session store.",
  },
  {
    source: "durable-facts",
    policy: "direct",
    authority: "lib/chernobog/memory.ts#saveMemory",
    reason: "Durable user facts remain owned by the existing deduplicating memory store.",
  },
  {
    source: "vault-structured-memory",
    policy: "staged-raw",
    authority: "lib/modules/vault-brain/memoryStore.ts#createRawEntry",
    reason: "Unified writes may enter the Vault review pipeline only as raw memory and cannot become approved truth automatically.",
  },
  {
    source: "project-memory-profile",
    policy: "direct",
    authority: "lib/modules/vault-brain/projectProfileStore.ts#upsertProfile/upsertVersion",
    reason: "Project and version profiles retain their existing audited domain store.",
  },
  {
    source: "personal-intelligence",
    policy: "domain-owned",
    authority: "lib/modules/vault-brain/personalIntelligenceOperatingLoop.ts",
    reason: "Personal intelligence produces governed operating packets and memory-update proposals rather than accepting generic memory writes.",
  },
  {
    source: "learned-lessons",
    policy: "governed-only",
    authority: "lib/chernobog/learning/lessonPromotion.ts",
    reason: "Learned lessons must be produced by the 11I governed promotion pipeline and cannot be inserted by generic memory writes.",
  },
] as const;

export function listUnifiedMemoryWritePolicies():
  UnifiedMemoryWritePolicyDescriptor[] {
  return POLICIES
    .map((policy) => structuredClone(policy))
    .sort((a, b) =>
      a.source.localeCompare(b.source),
    );
}

export function getUnifiedMemoryWritePolicy(
  source: UnifiedMemorySourceId,
): UnifiedMemoryWritePolicyDescriptor {
  const policy = POLICIES.find(
    (candidate) => candidate.source === source,
  );

  if (!policy) {
    throw new Error(
      `No unified memory write policy exists for source: ${source}`,
    );
  }

  return structuredClone(policy);
}
