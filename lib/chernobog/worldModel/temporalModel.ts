import type {
  WorldModelStateTransition,
  WorldModelTemporalObservation,
  WorldModelTemporalSnapshot,
  WorldModelTransitionSummary,
} from "./temporalTypes";
import {
  normalizeWorldModelEntityId,
} from "./validation";

function clone<T>(value: T): T {
  return structuredClone(value);
}

function sameValue(
  left: unknown,
  right: unknown,
): boolean {
  return (
    JSON.stringify(left) ===
    JSON.stringify(right)
  );
}

function transitionId(
  from: WorldModelTemporalObservation,
  to: WorldModelTemporalObservation,
): string {
  return [
    "transition",
    from.entityId,
    from.stateKey,
    from.observedAt,
    to.observedAt,
  ].join(":");
}

export class ChernobogWorldModelTemporalModel {
  private readonly observations =
    new Map<
      string,
      WorldModelTemporalObservation
    >();

  add(
    observation:
      WorldModelTemporalObservation,
  ): WorldModelTemporalObservation {
    this.observations.set(
      observation.id,
      clone(observation),
    );

    return clone(observation);
  }

  list(
    options: {
      entityId?: string;
      stateKey?: string;
    } = {},
  ): WorldModelTemporalObservation[] {
    const entityId =
      options.entityId
        ? normalizeWorldModelEntityId(
            options.entityId,
          )
        : undefined;

    const stateKey =
      options.stateKey
        ?.trim()
        .toLowerCase();

    return [
      ...this.observations.values(),
    ]
      .filter(
        (observation) =>
          (!entityId ||
            observation.entityId ===
              entityId) &&
          (!stateKey ||
            observation.stateKey ===
              stateKey),
      )
      .sort(
        (left, right) =>
          left.observedAt.localeCompare(
            right.observedAt,
          ) ||
          left.id.localeCompare(
            right.id,
          ),
      )
      .map(clone);
  }

  transitions(
    options: {
      entityId?: string;
      stateKey?: string;
    } = {},
  ): WorldModelStateTransition[] {
    const observations =
      this.list(options);

    const grouped =
      new Map<
        string,
        WorldModelTemporalObservation[]
      >();

    for (
      const observation
      of observations
    ) {
      const key =
        `${observation.entityId}|${observation.stateKey}`;

      const current =
        grouped.get(key) ?? [];

      current.push(observation);
      grouped.set(key, current);
    }

    const transitions:
      WorldModelStateTransition[] = [];

    for (
      const group
      of grouped.values()
    ) {
      for (
        let index = 1;
        index < group.length;
        index += 1
      ) {
        const from =
          group[index - 1]!;
        const to =
          group[index]!;

        if (
          sameValue(
            from.value,
            to.value,
          )
        ) {
          continue;
        }

        const fromTime =
          new Date(
            from.observedAt,
          ).getTime();

        const toTime =
          new Date(
            to.observedAt,
          ).getTime();

        transitions.push({
          id:
            transitionId(
              from,
              to,
            ),
          entityId:
            from.entityId,
          stateKey:
            from.stateKey,
          fromValue:
            clone(from.value),
          toValue:
            clone(to.value),
          fromObservedAt:
            from.observedAt,
          toObservedAt:
            to.observedAt,
          durationMs:
            Math.max(
              0,
              toTime - fromTime,
            ),
          confidence:
            Math.min(
              from.confidence,
              to.confidence,
            ),
          evidenceObservationIds: [
            from.id,
            to.id,
          ],
        });
      }
    }

    return transitions.sort(
      (left, right) =>
        left.toObservedAt.localeCompare(
          right.toObservedAt,
        ) ||
        left.id.localeCompare(
          right.id,
        ),
    );
  }

  summary(
    entityId: string,
    stateKey: string,
  ): WorldModelTransitionSummary {
    const normalizedEntityId =
      normalizeWorldModelEntityId(
        entityId,
      );

    const normalizedStateKey =
      stateKey.trim().toLowerCase();

    const observations =
      this.list({
        entityId:
          normalizedEntityId,
        stateKey:
          normalizedStateKey,
      });

    const transitions =
      this.transitions({
        entityId:
          normalizedEntityId,
        stateKey:
          normalizedStateKey,
      });

    const distinctStates =
      new Set(
        observations.map(
          (observation) =>
            JSON.stringify(
              observation.value,
            ),
        ),
      );

    const averageDwellMs =
      transitions.length === 0
        ? undefined
        : transitions.reduce(
            (sum, transition) =>
              sum +
              transition.durationMs,
            0,
          ) /
          transitions.length;

    return {
      entityId:
        normalizedEntityId,
      stateKey:
        normalizedStateKey,
      transitionCount:
        transitions.length,
      distinctStateCount:
        distinctStates.size,
      firstObservedAt:
        observations[0]
          ?.observedAt,
      lastObservedAt:
        observations[
          observations.length - 1
        ]?.observedAt,
      latestValue:
        observations[
          observations.length - 1
        ]?.value,
      averageDwellMs,
    };
  }

  snapshot():
    WorldModelTemporalSnapshot {
    return {
      observations:
        this.list(),
      transitions:
        this.transitions(),
    };
  }

  clear(): void {
    this.observations.clear();
  }
}
