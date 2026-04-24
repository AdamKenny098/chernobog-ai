import type { TrustTrace } from "./types";

const MAX_TRACES = 50;

const traceHistory: TrustTrace[] = [];

export function saveTrustTrace(trace: TrustTrace): void {
  traceHistory.unshift(trace);

  if (traceHistory.length > MAX_TRACES) {
    traceHistory.splice(MAX_TRACES);
  }
}

export function getTrustTraces(limit = 20): TrustTrace[] {
  return traceHistory.slice(0, limit);
}

export function getTrustTraceById(id: string): TrustTrace | null {
  return traceHistory.find((trace) => trace.id === id) ?? null;
}

export function clearTrustTraces(): number {
  const count = traceHistory.length;
  traceHistory.length = 0;
  return count;
}