import type {
  RouteName,
  SessionContext,
} from "../session/types";
import type {
  ProjectMemoryProfileInput,
  VersionMemoryProfileInput,
} from "../../modules/vault-brain/projectProfileStore";
import type {
  VaultMemorySource,
  VaultSourceRef,
} from "../../modules/vault-brain/memoryTypes";
import type {
  UnifiedMemorySourceId,
} from "./unifiedTypes";

export type UnifiedMemoryWritePolicy =
  | "direct"
  | "staged-raw"
  | "governed-only"
  | "domain-owned";

export interface UnifiedMemoryWritePolicyDescriptor {
  source: UnifiedMemorySourceId;
  policy: UnifiedMemoryWritePolicy;
  authority: string;
  reason: string;
}

export type UnifiedSessionPatch = Partial<
  Omit<
    SessionContext,
    "sessionId" | "lastUpdatedAt"
  >
>;

export type UnifiedMemoryWriteRequest =
  | {
      source: "conversation-history";
      role: "user" | "assistant";
      content: string;
      route?: RouteName;
    }
  | {
      source: "session-state";
      sessionId: string;
      patch: UnifiedSessionPatch;
    }
  | {
      source: "durable-facts";
      content: string;
    }
  | {
      source: "vault-structured-memory";
      title?: string;
      content: string;
      projectId?: string;
      version?: string;
      sourceKind?: VaultMemorySource;
      tags?: string[];
      confidence?: number;
      sourceRef?: VaultSourceRef;
    }
  | {
      source: "project-memory-profile";
      kind: "project";
      input: ProjectMemoryProfileInput;
    }
  | {
      source: "project-memory-profile";
      kind: "version";
      input: VersionMemoryProfileInput;
    }
  | {
      source: "personal-intelligence";
      content?: string;
    }
  | {
      source: "learned-lessons";
      content?: string;
    };

export interface UnifiedMemoryWriteResult {
  source: UnifiedMemorySourceId;
  status:
    | "written"
    | "staged"
    | "rejected";
  id?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}
