import {
  saveMemory,
  saveMessage,
} from "../memory";
import {
  getSessionContext,
  resolveSessionId,
  saveSessionContext,
} from "../session/store";
import {
  createVaultMemoryStore,
} from "../../modules/vault-brain/memoryStore";
import {
  createProjectMemoryProfileStore,
} from "../../modules/vault-brain/projectProfileStore";
import type {
  UnifiedMemoryWriteRequest,
  UnifiedMemoryWriteResult,
} from "./writeTypes";

function requireContent(
  value: string,
  label: string,
): string {
  const clean = value.trim();

  if (!clean) {
    throw new Error(`${label} is required.`);
  }

  return clean;
}

export async function writeConversationMemory(
  request: Extract<
    UnifiedMemoryWriteRequest,
    { source: "conversation-history" }
  >,
): Promise<UnifiedMemoryWriteResult> {
  const content = requireContent(
    request.content,
    "Conversation memory content",
  );

  saveMessage(
    request.role,
    content,
    request.route,
  );

  return {
    source: request.source,
    status: "written",
    metadata: {
      role: request.role,
      route: request.route,
    },
  };
}

export async function writeSessionMemory(
  request: Extract<
    UnifiedMemoryWriteRequest,
    { source: "session-state" }
  >,
): Promise<UnifiedMemoryWriteResult> {
  const sessionId = resolveSessionId(
    request.sessionId,
  );

  const current = structuredClone(
    getSessionContext(sessionId),
  );

  const next = {
    ...current,
    ...structuredClone(request.patch),
    sessionId,
    lastUpdatedAt: current.lastUpdatedAt,
  };

  saveSessionContext(next);

  return {
    source: request.source,
    status: "written",
    id: `session:${sessionId}`,
    metadata: {
      sessionId,
      patchedKeys: Object.keys(
        request.patch,
      ).sort(),
    },
  };
}

export async function writeDurableFactMemory(
  request: Extract<
    UnifiedMemoryWriteRequest,
    { source: "durable-facts" }
  >,
): Promise<UnifiedMemoryWriteResult> {
  const result = saveMemory(
    requireContent(
      request.content,
      "Durable memory fact",
    ),
  );

  return {
    source: request.source,
    status: "written",
    id: `durable:${result.fact}`,
    metadata: {
      saved: result.saved,
      deduplicated: !result.saved,
    },
  };
}

export async function writeVaultRawMemory(
  request: Extract<
    UnifiedMemoryWriteRequest,
    { source: "vault-structured-memory" }
  >,
): Promise<UnifiedMemoryWriteResult> {
  const content = requireContent(
    request.content,
    "Vault memory content",
  );

  const store = createVaultMemoryStore();
  const entry = await store.createRawEntry({
    title:
      request.title?.trim() ||
      content.slice(0, 96),
    body: content,
    source:
      request.sourceKind ?? "manual",
    projectId:
      request.projectId,
    version:
      request.version,
    tags:
      request.tags,
    confidence:
      request.confidence,
    sourceRef:
      request.sourceRef,
  });

  return {
    source: request.source,
    status: "staged",
    id: entry.id,
    metadata: {
      vaultStatus: entry.status,
      memoryType: entry.memoryType,
      projectId: entry.projectId,
      reviewRequired: true,
    },
  };
}

export async function writeProjectMemory(
  request: Extract<
    UnifiedMemoryWriteRequest,
    { source: "project-memory-profile" }
  >,
): Promise<UnifiedMemoryWriteResult> {
  const store =
    createProjectMemoryProfileStore();

  if (request.kind === "project") {
    const profile = await store.upsertProfile(
      structuredClone(request.input),
    );

    return {
      source: request.source,
      status: "written",
      id: `project:${profile.projectId}`,
      metadata: {
        kind: "project",
        projectId: profile.projectId,
        status: profile.status,
      },
    };
  }

  const version = await store.upsertVersion(
    structuredClone(request.input),
  );

  return {
    source: request.source,
    status: "written",
    id: `project-version:${version.id}`,
    metadata: {
      kind: "version",
      projectId: version.projectId,
      version: version.version,
      status: version.status,
    },
  };
}
