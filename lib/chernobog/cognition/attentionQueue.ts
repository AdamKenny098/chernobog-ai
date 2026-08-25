import { compareSalienceBands } from "./salience";
import type { AttentionQueueQuery, CognitiveAttentionSignal } from "./types";

function cloneSignal(signal: CognitiveAttentionSignal): CognitiveAttentionSignal {
  return structuredClone(signal);
}

export class ChernobogAttentionQueue {
  private readonly byKey = new Map<string, CognitiveAttentionSignal>();
  private readonly maximumSize: number;

  constructor(maximumSize = 256) {
    if (!Number.isInteger(maximumSize) || maximumSize < 1) {
      throw new Error("attention queue maximumSize must be a positive integer.");
    }
    this.maximumSize = maximumSize;
  }

  get size(): number {
    return this.byKey.size;
  }

  upsert(signal: CognitiveAttentionSignal): void {
    this.byKey.set(signal.key, cloneSignal(signal));
    this.trim();
  }

  get(key: string): CognitiveAttentionSignal | undefined {
    const signal = this.byKey.get(key);
    return signal ? cloneSignal(signal) : undefined;
  }

  remove(key: string): boolean {
    return this.byKey.delete(key);
  }

  clear(): void {
    this.byKey.clear();
  }

  list(query: AttentionQueueQuery = {}): CognitiveAttentionSignal[] {
    const limit = query.limit ?? this.maximumSize;
    if (!Number.isInteger(limit) || limit < 1) {
      throw new Error("attention queue limit must be a positive integer.");
    }

    return [...this.byKey.values()]
      .filter((signal) => {
        if (query.namespace && signal.record.namespace !== query.namespace) {
          return false;
        }
        if (
          query.minimumBand &&
          compareSalienceBands(signal.band, query.minimumBand) < 0
        ) {
          return false;
        }
        return true;
      })
      .sort((left, right) => {
        if (left.score !== right.score) return right.score - left.score;
        const generated = right.generatedAt.localeCompare(left.generatedAt);
        if (generated !== 0) return generated;
        return left.key.localeCompare(right.key);
      })
      .slice(0, limit)
      .map(cloneSignal);
  }

  private trim(): void {
    if (this.byKey.size <= this.maximumSize) return;
    const keep = this.list({ limit: this.maximumSize });
    this.byKey.clear();
    for (const signal of keep) this.byKey.set(signal.key, signal);
  }
}
