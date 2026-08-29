export type UnifiedMemoryLayer =
  | "short_term"
  | "working"
  | "long_term"
  | "learned";

export type UnifiedMemoryDurability =
  | "ephemeral"
  | "session"
  | "persistent";

export type UnifiedMemoryScope =
  | "conversation"
  | "session"
  | "user"
  | "project"
  | "system";

export type UnifiedMemorySourceId =
  | "conversation-history"
  | "session-state"
  | "durable-facts"
  | "vault-structured-memory"
  | "project-memory-profile"
  | "personal-intelligence"
  | "learned-lessons";

export interface UnifiedMemoryRecord {
  id: string;
  source: UnifiedMemorySourceId;
  layer: UnifiedMemoryLayer;
  scope: UnifiedMemoryScope;
  content: string;
  key?: string;
  sessionId?: string;
  projectId?: string;
  createdAt?: string;
  updatedAt?: string;
  confidence?: number;
  metadata?: Record<string, unknown>;
}

export interface UnifiedMemorySourceDescriptor {
  id: UnifiedMemorySourceId;
  label: string;
  layer: UnifiedMemoryLayer;
  durability: UnifiedMemoryDurability;
  scopes: UnifiedMemoryScope[];
  readable: boolean;
  writable: boolean;
  authorities: string[];
  role:
    | "conversation-history"
    | "working-state"
    | "durable-fact-store"
    | "structured-vault-memory"
    | "project-memory"
    | "personal-intelligence"
    | "governed-learning";
}

export interface UnifiedMemorySourceSnapshot {
  sourceCount: number;
  sources: UnifiedMemorySourceDescriptor[];
  layers: UnifiedMemoryLayer[];
  persistentSourceCount: number;
  writableSourceCount: number;
  authorities: string[];
}
