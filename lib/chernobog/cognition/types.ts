import type {
  WorldStateEvidenceAssessment,
  WorldStateRecord,
} from "../worldState";

export type CognitiveSalienceBand =
  | "none"
  | "low"
  | "normal"
  | "high"
  | "critical";

export type CognitiveSalienceReasonCode =
  | "state-changed"
  | "critical-state"
  | "degraded-state"
  | "recovery-state"
  | "stale-evidence"
  | "aging-evidence"
  | "unknown-freshness"
  | "low-confidence"
  | "domain-priority";

export interface CognitiveSalienceReason {
  code: CognitiveSalienceReasonCode;
  weight: number;
  detail: string;
}

export interface WorldStateChange {
  previous?: WorldStateRecord;
  current: WorldStateRecord;
}

export interface CognitiveAttentionSignal {
  id: string;
  key: string;
  generatedAt: string;
  score: number;
  band: CognitiveSalienceBand;
  reasons: CognitiveSalienceReason[];
  changed: boolean;
  record: WorldStateRecord;
  assessment: WorldStateEvidenceAssessment;
}

export interface CognitiveSaliencePolicy {
  baseScore: number;
  namespaceWeights: Record<string, number>;
  stateChangeWeight: number;
  criticalStateWeight: number;
  degradedStateWeight: number;
  recoveryStateWeight: number;
  staleEvidenceWeight: number;
  agingEvidenceWeight: number;
  unknownFreshnessWeight: number;
  confidenceFloorMultiplier: number;
}

export interface AttentionQueueQuery {
  minimumBand?: CognitiveSalienceBand;
  namespace?: string;
  limit?: number;
}
