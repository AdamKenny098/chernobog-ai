import type {
  UnifiedMemoryRecord,
  UnifiedMemorySourceId,
} from "./unifiedTypes";

export interface UnifiedMemoryReadQuery {
  text?: string;
  sources?: UnifiedMemorySourceId[];
  sessionId?: string;
  projectId?: string;
  limit?: number;
}

export interface UnifiedMemorySourceReadResult {
  source: UnifiedMemorySourceId;
  records: UnifiedMemoryRecord[];
  error?: string;
}

export interface UnifiedMemoryReadResult {
  query: UnifiedMemoryReadQuery;
  records: UnifiedMemoryRecord[];
  sourcesQueried: UnifiedMemorySourceId[];
  sourceResults: UnifiedMemorySourceReadResult[];
  sourceErrors: Array<{
    source: UnifiedMemorySourceId;
    error: string;
  }>;
}

export type UnifiedMemorySourceReader = (
  query: UnifiedMemoryReadQuery,
) =>
  | UnifiedMemoryRecord[]
  | Promise<UnifiedMemoryRecord[]>;

export type UnifiedMemoryReaderMap =
  Partial<
    Record<
      UnifiedMemorySourceId,
      UnifiedMemorySourceReader
    >
  >;
