import type {
  WorldStateEvidenceAssessment,
  WorldStateFreshnessStatus,
  WorldStateRecord,
} from "./types";

export interface WorldStateReadQuery {
  key?: string;
  namespace?: string;
  keyPrefix?: string;
  freshness?: WorldStateFreshnessStatus[];
  minConfidence?: number;
}

export interface WorldStateReadItem {
  record: WorldStateRecord;
  assessment: WorldStateEvidenceAssessment;
}

export interface WorldStateReadResult {
  generatedAt: string;
  source: "registry" | "snapshot";
  count: number;
  items: WorldStateReadItem[];
}

export interface WorldStateNamespaceDiagnostic {
  namespace: string;
  records: number;
}

export interface WorldStateFreshnessDiagnostic {
  status: WorldStateFreshnessStatus;
  records: number;
}

export interface WorldStateConfidenceDiagnostic {
  band: "high" | "medium" | "low";
  records: number;
}

export interface WorldStateProvenanceDiagnostic {
  status: "complete" | "partial" | "absent";
  records: number;
}

export interface WorldStateDiagnostics {
  generatedAt: string;
  totalRecords: number;
  namespaces: WorldStateNamespaceDiagnostic[];
  freshness: WorldStateFreshnessDiagnostic[];
  confidence: WorldStateConfidenceDiagnostic[];
  provenance: WorldStateProvenanceDiagnostic[];
}

export interface WorldStateExplanation {
  generatedAt: string;
  key: string;
  found: boolean;
  record?: WorldStateRecord;
  assessment?: WorldStateEvidenceAssessment;
  evidence: string[];
}

export type PersistedWorldStateReadResult =
  | {
      status: "missing";
      generatedAt: string;
      snapshotPath: string;
    }
  | {
      status: "loaded";
      generatedAt: string;
      snapshotPath: string;
      snapshotCreatedAt: string;
      result: WorldStateReadResult;
      diagnostics: WorldStateDiagnostics;
    };
