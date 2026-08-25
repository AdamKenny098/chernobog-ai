import type {
  CognitiveInitiativeDecision,
} from "./initiativeTypes";

function cloneDecision(
  decision:
    CognitiveInitiativeDecision,
): CognitiveInitiativeDecision {
  return structuredClone(
    decision,
  );
}

export class ChernobogInitiativeQueue {
  private readonly byKey =
    new Map<
      string,
      CognitiveInitiativeDecision
    >();

  enqueue(
    decision:
      CognitiveInitiativeDecision,
  ): void {
    if (
      decision.disposition !==
      "defer"
    ) {
      return;
    }

    const key =
      decision.focusKey ??
      decision.id;

    this.byKey.set(
      key,
      cloneDecision(
        decision,
      ),
    );
  }

  remove(
    key: string,
  ): boolean {
    return this.byKey.delete(key);
  }

  clear(): void {
    this.byKey.clear();
  }

  list():
    CognitiveInitiativeDecision[] {
    return [
      ...this.byKey.values(),
    ]
      .sort((left, right) => {
        if (
          left.score !==
          right.score
        ) {
          return (
            right.score -
            left.score
          );
        }

        return left.generatedAt
          .localeCompare(
            right.generatedAt,
          );
      })
      .map(cloneDecision);
  }
}
