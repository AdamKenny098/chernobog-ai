import {
  buildCognitiveGoal,
  calculateCognitiveGoalPriorityScore,
} from "./goals";
import type {
  CognitiveGoal,
  CognitiveGoalInput,
  CognitiveGoalStatus,
} from "./goalTypes";

function cloneGoal(
  goal: CognitiveGoal,
): CognitiveGoal {
  return structuredClone(goal);
}

export class ChernobogGoalRegistry {
  private readonly goals =
    new Map<
      string,
      CognitiveGoal
    >();

  private readonly clock:
    () => Date;

  constructor(
    clock:
      () => Date =
      () => new Date(),
  ) {
    this.clock = clock;
  }

  get size(): number {
    return this.goals.size;
  }

  upsert(
    input: CognitiveGoalInput,
  ): CognitiveGoal {
    const existing =
      this.goals.get(
        input.id.trim(),
      );

    const now =
      this.clock();

    const goal =
      buildCognitiveGoal(
        {
          ...input,
          createdAt:
            input.createdAt ??
            existing?.createdAt,
          updatedAt:
            input.updatedAt ??
            now.toISOString(),
        },
        now,
      );

    this.goals.set(
      goal.id,
      goal,
    );

    return cloneGoal(goal);
  }

  get(
    id: string,
  ):
    | CognitiveGoal
    | undefined {
    const goal =
      this.goals.get(id);

    return goal
      ? cloneGoal(goal)
      : undefined;
  }

  remove(
    id: string,
  ): boolean {
    return this.goals.delete(
      id,
    );
  }

  clear(): void {
    this.goals.clear();
  }

  list(
    options: {
      statuses?:
        CognitiveGoalStatus[];
      activeOnly?: boolean;
    } = {},
  ): CognitiveGoal[] {
    const statuses =
      options.activeOnly
        ? ["active"] satisfies
            CognitiveGoalStatus[]
        : options.statuses;

    return [
      ...this.goals.values(),
    ]
      .filter((goal) =>
        !statuses?.length ||
        statuses.includes(
          goal.status,
        ),
      )
      .sort((left, right) => {
        const scoreDifference =
          calculateCognitiveGoalPriorityScore(
            right,
          ) -
          calculateCognitiveGoalPriorityScore(
            left,
          );

        if (
          scoreDifference !== 0
        ) {
          return scoreDifference;
        }

        return left.id.localeCompare(
          right.id,
        );
      })
      .map(cloneGoal);
  }
}
