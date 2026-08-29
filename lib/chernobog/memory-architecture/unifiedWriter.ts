import {
  getUnifiedMemoryWritePolicy,
} from "./writePolicy";
import {
  writeConversationMemory,
  writeDurableFactMemory,
  writeProjectMemory,
  writeSessionMemory,
  writeVaultRawMemory,
} from "./writeAdapters";
import type {
  UnifiedMemoryWriteRequest,
  UnifiedMemoryWriteResult,
} from "./writeTypes";

export async function writeUnifiedMemory(
  request: UnifiedMemoryWriteRequest,
): Promise<UnifiedMemoryWriteResult> {
  const policy = getUnifiedMemoryWritePolicy(
    request.source,
  );

  if (
    policy.policy === "governed-only" ||
    policy.policy === "domain-owned"
  ) {
    return {
      source: request.source,
      status: "rejected",
      reason: policy.reason,
      metadata: {
        policy: policy.policy,
        authority: policy.authority,
      },
    };
  }

  switch (request.source) {
    case "conversation-history":
      return writeConversationMemory(request);

    case "session-state":
      return writeSessionMemory(request);

    case "durable-facts":
      return writeDurableFactMemory(request);

    case "vault-structured-memory":
      return writeVaultRawMemory(request);

    case "project-memory-profile":
      return writeProjectMemory(request);

    case "personal-intelligence":
    case "learned-lessons":
      return {
        source: request.source,
        status: "rejected",
        reason: policy.reason,
        metadata: {
          policy: policy.policy,
          authority: policy.authority,
        },
      };
  }
}
