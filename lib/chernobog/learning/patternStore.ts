import type { LearningPatternCandidate } from "./patternTypes";

function cloneCandidate(candidate: LearningPatternCandidate): LearningPatternCandidate {
  return structuredClone(candidate);
}

export class ChernobogLearningPatternStore {
  private readonly patterns = new Map<string, LearningPatternCandidate>();
  get size(): number { return this.patterns.size; }
  upsert(candidate: LearningPatternCandidate): LearningPatternCandidate {
    this.patterns.set(candidate.key, cloneCandidate(candidate));
    return cloneCandidate(candidate);
  }
  get(key: string): LearningPatternCandidate | undefined {
    const candidate = this.patterns.get(key);
    return candidate ? cloneCandidate(candidate) : undefined;
  }
  list(): LearningPatternCandidate[] {
    return [...this.patterns.values()]
      .sort((a,b)=> b.confidence-a.confidence || b.supportCount-a.supportCount || a.key.localeCompare(b.key))
      .map(cloneCandidate);
  }
  remove(key: string): boolean { return this.patterns.delete(key); }
  clear(): void { this.patterns.clear(); }
}
