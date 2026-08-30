import {
  listUnifiedMemorySources,
} from "./sourceRegistry";
import {
  selectRelevantUnifiedMemories,
} from "./readRelevance";
import {
  createDefaultUnifiedMemoryReaders,
} from "./readAdapters";
import type {
  UnifiedMemoryReadQuery,
  UnifiedMemoryReadResult,
  UnifiedMemoryReaderMap,
  UnifiedMemorySourceReadResult,
} from "./readTypes";
import type {
  UnifiedMemoryRecord,
  UnifiedMemorySourceId,
} from "./unifiedTypes";

function normalizeLimit(value?: number): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return 20;
  }

  return Math.max(
    1,
    Math.min(100, Math.trunc(value)),
  );
}

function normalizeSources(
  sources?: UnifiedMemorySourceId[],
): UnifiedMemorySourceId[] {
  const available = listUnifiedMemorySources()
    .filter((source) => source.readable)
    .map((source) => source.id);

  if (!sources?.length) {
    return available;
  }

  const allowed = new Set(available);

  return [
    ...new Set(
      sources.filter((source) => allowed.has(source)),
    ),
  ].sort();
}

function matchesScope(
  record: UnifiedMemoryRecord,
  query: UnifiedMemoryReadQuery,
): boolean {
  if (
    query.sessionId &&
    record.sessionId &&
    record.sessionId !== query.sessionId
  ) {
    return false;
  }

  if (
    query.projectId &&
    record.projectId &&
    record.projectId !== query.projectId
  ) {
    return false;
  }

  return true;
}

export async function readUnifiedMemory(
  query: UnifiedMemoryReadQuery = {},
  readers: UnifiedMemoryReaderMap =
    createDefaultUnifiedMemoryReaders(),
): Promise<UnifiedMemoryReadResult> {
  const normalizedQuery: UnifiedMemoryReadQuery = {
    ...query,
    text: query.text?.trim() || undefined,
    limit: normalizeLimit(query.limit),
  };

  const sourcesQueried =
    normalizeSources(normalizedQuery.sources);

  const sourceResults:
    UnifiedMemorySourceReadResult[] = [];

  for (const source of sourcesQueried) {
    const reader = readers[source];

    if (!reader) {
      sourceResults.push({
        source,
        records: [],
        error:
          "No unified reader is registered for this source.",
      });
      continue;
    }

    try {
      const records = (
        await reader(normalizedQuery)
      )
        .filter((record) => record.source === source)
        .filter((record) =>
          matchesScope(record, normalizedQuery),
        );

      sourceResults.push({
        source,
        records: records.map((record) =>
          structuredClone(record),
        ),
      });
    } catch (error) {
      sourceResults.push({
        source,
        records: [],
        error:
          error instanceof Error
            ? error.message
            : String(error),
      });
    }
  }

  const allRecords = sourceResults.flatMap(
    (result) => result.records,
  );

  const records = selectRelevantUnifiedMemories(
    allRecords,
    normalizedQuery.text ?? "",
    normalizedQuery.limit ?? 20,
  );

  return {
    query: structuredClone(normalizedQuery),
    records,
    sourcesQueried: [...sourcesQueried],
    sourceResults: structuredClone(sourceResults),
    sourceErrors: sourceResults
      .filter((result) => Boolean(result.error))
      .map((result) => ({
        source: result.source,
        error:
          result.error ??
          "Unknown source error.",
      })),
  };
}
