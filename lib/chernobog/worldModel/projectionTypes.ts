import type {
  WorldStateRecord,
} from "../worldState";
import type {
  WorldModelEntityInput,
  WorldModelRelationshipInput,
} from "./types";

export interface WorldModelProjection {
  sourceKey: string;
  entities: WorldModelEntityInput[];
  relationships: WorldModelRelationshipInput[];
}

export interface WorldModelProjectionResult {
  projectedRecords: number;
  entityWrites: number;
  relationshipWrites: number;
  skippedRelationships: number;
}

export type WorldModelRelationshipGrounder =
  (
    record: WorldStateRecord,
  ) => WorldModelProjection;
