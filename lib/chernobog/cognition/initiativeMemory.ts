import type {
  CognitiveInitiativeHistoryEntry,
  CognitiveInitiativeDisposition,
} from "./initiativeTypes";

function cloneEntry(
  entry:
    CognitiveInitiativeHistoryEntry,
): CognitiveInitiativeHistoryEntry {
  return structuredClone(entry);
}

export class ChernobogInitiativeMemory {
  private readonly byKey =
    new Map<
      string,
      CognitiveInitiativeHistoryEntry
    >();

  get(
    key: string,
  ):
    | CognitiveInitiativeHistoryEntry
    | undefined {
    const entry =
      this.byKey.get(key);

    return entry
      ? cloneEntry(entry)
      : undefined;
  }

  record(
    input: {
      key: string;
      surfacedAt: string;
      score: number;
      disposition:
        CognitiveInitiativeDisposition;
    },
  ): CognitiveInitiativeHistoryEntry {
    const entry:
      CognitiveInitiativeHistoryEntry = {
        key:
          input.key,
        surfacedAt:
          input.surfacedAt,
        score:
          input.score,
        disposition:
          input.disposition,
      };

    this.byKey.set(
      input.key,
      entry,
    );

    return cloneEntry(entry);
  }

  remove(
    key: string,
  ): boolean {
    return this.byKey.delete(key);
  }

  clear(): void {
    this.byKey.clear();
  }
}
