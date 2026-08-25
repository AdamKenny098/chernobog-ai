export type WorldModelEntityKind =
  | "user"
  | "system"
  | "service"
  | "project"
  | "repository"
  | "model"
  | "storage"
  | "backup"
  | "application"
  | "fact"
  | "unknown";

export interface WorldModelEvidence {
  eventIds: string[];
  worldStateKeys: string[];
  lessonKeys: string[];
}

export interface WorldModelEntity {
  id: string;
  kind: WorldModelEntityKind;
  label: string;
  aliases: string[];
  attributes: Record<string, unknown>;
  confidence: number;
  observedAt: string;
  evidence: WorldModelEvidence;
}

export interface WorldModelEntityInput {
  id: string;
  kind: WorldModelEntityKind;
  label: string;
  aliases?: string[];
  attributes?: Record<string, unknown>;
  confidence?: number;
  observedAt: string;
  evidence?: Partial<WorldModelEvidence>;
}

export interface WorldModelRelationship {
  id: string;
  type: string;
  fromEntityId: string;
  toEntityId: string;
  directed: boolean;
  confidence: number;
  observedAt: string;
  attributes: Record<string, unknown>;
  evidence: WorldModelEvidence;
}

export interface WorldModelRelationshipInput {
  type: string;
  fromEntityId: string;
  toEntityId: string;
  directed?: boolean;
  confidence?: number;
  observedAt: string;
  attributes?: Record<string, unknown>;
  evidence?: Partial<WorldModelEvidence>;
}

export interface WorldModelNeighbor {
  entity: WorldModelEntity;
  relationship: WorldModelRelationship;
  direction: "outgoing" | "incoming" | "undirected";
}

export interface WorldModelSnapshot {
  entities: WorldModelEntity[];
  relationships: WorldModelRelationship[];
}
