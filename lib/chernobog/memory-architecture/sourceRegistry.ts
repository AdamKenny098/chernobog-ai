import type {
  UnifiedMemoryLayer,
  UnifiedMemorySourceDescriptor,
  UnifiedMemorySourceId,
  UnifiedMemorySourceSnapshot,
} from "./unifiedTypes";

const SOURCES: readonly UnifiedMemorySourceDescriptor[] = [
  {
    id: "conversation-history",
    label: "Conversation history",
    layer: "short_term",
    durability: "persistent",
    scopes: ["conversation"],
    readable: true,
    writable: true,
    authorities: [
      "lib/chernobog/memory.ts",
      "messages table",
    ],
    role: "conversation-history",
  },
  {
    id: "session-state",
    label: "Session and working state",
    layer: "working",
    durability: "session",
    scopes: ["session"],
    readable: true,
    writable: true,
    authorities: [
      "lib/chernobog/session/store.ts",
      "lib/chernobog/memory-architecture/workingMemory.ts",
      "session_state table",
    ],
    role: "working-state",
  },
  {
    id: "durable-facts",
    label: "Durable facts",
    layer: "long_term",
    durability: "persistent",
    scopes: ["user"],
    readable: true,
    writable: true,
    authorities: [
      "lib/chernobog/memory.ts",
      "memories table",
    ],
    role: "durable-fact-store",
  },
  {
    id: "vault-structured-memory",
    label: "Vault Brain structured memory",
    layer: "long_term",
    durability: "persistent",
    scopes: [
      "user",
      "project",
      "system",
    ],
    readable: true,
    writable: true,
    authorities: [
      "lib/modules/vault-brain/memoryStore.ts",
      "lib/modules/vault-brain/memoryTypes.ts",
      "lib/modules/vault-brain/structuredRecall.ts",
    ],
    role: "structured-vault-memory",
  },
  {
    id: "project-memory-profile",
    label: "Project memory profile",
    layer: "long_term",
    durability: "persistent",
    scopes: ["project"],
    readable: true,
    writable: true,
    authorities: [
      "lib/modules/vault-brain/projectMemoryScope.ts",
      "lib/modules/vault-brain/projectProfileStore.ts",
    ],
    role: "project-memory",
  },
  {
    id: "personal-intelligence",
    label: "Personal intelligence memory",
    layer: "long_term",
    durability: "persistent",
    scopes: ["user"],
    readable: true,
    writable: true,
    authorities: [
      "lib/modules/vault-brain/personalIntelligenceOperatingLoop.ts",
      "lib/modules/vault-brain/personalIntelligenceTypes.ts",
    ],
    role: "personal-intelligence",
  },
  {
    id: "learned-lessons",
    label: "Governed learned lessons",
    layer: "learned",
    durability: "persistent",
    scopes: [
      "project",
      "system",
    ],
    readable: true,
    writable: true,
    authorities: [
      "lib/chernobog/learning/lessonStore.ts",
      "lib/chernobog/learning/lessonPromotion.ts",
    ],
    role: "governed-learning",
  },
] as const;

function cloneSource(
  source: UnifiedMemorySourceDescriptor,
): UnifiedMemorySourceDescriptor {
  return structuredClone(source);
}

export function getUnifiedMemorySource(
  id: UnifiedMemorySourceId,
): UnifiedMemorySourceDescriptor | undefined {
  const source =
    SOURCES.find(
      (candidate) =>
        candidate.id === id,
    );

  return source
    ? cloneSource(source)
    : undefined;
}

export function listUnifiedMemorySources():
  UnifiedMemorySourceDescriptor[] {
  return SOURCES
    .map(cloneSource)
    .sort(
      (a, b) =>
        a.id.localeCompare(b.id),
    );
}

export function getUnifiedMemorySourceSnapshot():
  UnifiedMemorySourceSnapshot {
  const sources =
    listUnifiedMemorySources();

  const layers =
    [...new Set(
      sources.map(
        (source) =>
          source.layer,
      ),
    )].sort() as UnifiedMemoryLayer[];

  const authorities =
    [...new Set(
      sources.flatMap(
        (source) =>
          source.authorities,
      ),
    )].sort();

  return {
    sourceCount:
      sources.length,
    sources,
    layers,
    persistentSourceCount:
      sources.filter(
        (source) =>
          source.durability ===
          "persistent",
      ).length,
    writableSourceCount:
      sources.filter(
        (source) =>
          source.writable,
      ).length,
    authorities,
  };
}
