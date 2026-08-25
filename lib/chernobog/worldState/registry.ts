import { buildWorldStateFreshness } from "./freshness";
import {
  assertWorldStateRecord,
  createWorldStateRecord,
} from "./validation";
import type {
  WorldStateJsonValue,
  WorldStateQuery,
  WorldStateRecord,
  WorldStateRecordInput,
  WorldStateUpsertResult,
} from "./types";

function compareIso(
  left: string | undefined,
  right: string | undefined,
): number {
  const a = left
    ? new Date(left).getTime()
    : Number.NEGATIVE_INFINITY;
  const b = right
    ? new Date(right).getTime()
    : Number.NEGATIVE_INFINITY;

  return a === b ? 0 : a < b ? -1 : 1;
}

function compareText(
  left: string | undefined,
  right: string | undefined,
): number {
  const a = left ?? "";
  const b = right ?? "";
  return a === b ? 0 : a < b ? -1 : 1;
}

export function compareWorldStateRecency(
  left: WorldStateRecord,
  right: WorldStateRecord,
): number {
  const observed = compareIso(
    left.observedAt,
    right.observedAt,
  );
  if (observed !== 0) {
    return observed;
  }

  const received = compareIso(
    left.provenance?.eventReceivedAt,
    right.provenance?.eventReceivedAt,
  );
  if (received !== 0) {
    return received;
  }

  return compareText(
    left.provenance?.eventId,
    right.provenance?.eventId,
  );
}

function cloneRecord<
  TValue extends WorldStateJsonValue,
>(
  record: WorldStateRecord<TValue>,
): WorldStateRecord<TValue> {
  return structuredClone(record);
}

export class ChernobogWorldStateRegistry {
  private readonly records =
    new Map<string, WorldStateRecord>();

  private readonly clock: () => Date;

  constructor(
    clock: () => Date = () => new Date(),
  ) {
    this.clock = clock;
  }

  get size(): number {
    return this.records.size;
  }

  get<
    TValue extends
      WorldStateJsonValue = WorldStateJsonValue,
  >(
    key: string,
  ): WorldStateRecord<TValue> | undefined {
    const record = this.records.get(key);

    return record
      ? (cloneRecord(
          record,
        ) as WorldStateRecord<TValue>)
      : undefined;
  }

  has(key: string): boolean {
    return this.records.has(key);
  }

  upsert<
    TValue extends WorldStateJsonValue,
  >(
    input: WorldStateRecordInput<TValue>,
  ): WorldStateUpsertResult<TValue> {
    const now = this.clock();
    const candidate =
      createWorldStateRecord(input, now);
    const existing =
      this.records.get(candidate.key);

    if (!existing) {
      this.records.set(
        candidate.key,
        candidate,
      );

      return {
        record: cloneRecord(candidate),
        applied: true,
        reason: "created",
      };
    }

    const recency =
      compareWorldStateRecency(
        candidate,
        existing,
      );

    if (recency < 0) {
      return {
        record: cloneRecord(
          existing,
        ) as WorldStateRecord<TValue>,
        applied: false,
        reason: "older-observation",
      };
    }

    if (recency === 0) {
      return {
        record: cloneRecord(
          existing,
        ) as WorldStateRecord<TValue>,
        applied: false,
        reason: "same-observation",
      };
    }

    this.records.set(
      candidate.key,
      candidate,
    );

    return {
      record: cloneRecord(candidate),
      applied: true,
      reason: "updated",
    };
  }

  replace(
    records: readonly WorldStateRecord[],
  ): void {
    const next =
      new Map<string, WorldStateRecord>();

    for (const record of records) {
      assertWorldStateRecord(record);

      if (next.has(record.key)) {
        throw new Error(
          `worldState snapshot contains duplicate key "${record.key}".`,
        );
      }

      next.set(
        record.key,
        cloneRecord(record),
      );
    }

    this.records.clear();

    for (
      const [key, record]
      of next
    ) {
      this.records.set(
        key,
        record,
      );
    }
  }

  delete(key: string): boolean {
    return this.records.delete(key);
  }

  clear(): void {
    this.records.clear();
  }

  list(
    query: WorldStateQuery = {},
  ): WorldStateRecord[] {
    const now = this.clock();

    if (
      query.minConfidence !== undefined &&
      (
        !Number.isFinite(query.minConfidence) ||
        query.minConfidence < 0 ||
        query.minConfidence > 1
      )
    ) {
      throw new Error(
        "worldState query minConfidence must be between 0 and 1.",
      );
    }

    return [...this.records.values()]
      .filter((record) => {
        if (
          query.namespace &&
          record.namespace !== query.namespace
        ) {
          return false;
        }

        if (
          query.keyPrefix &&
          !record.key.startsWith(
            query.keyPrefix,
          )
        ) {
          return false;
        }

        if (
          query.minConfidence !== undefined &&
          record.confidence <
            query.minConfidence
        ) {
          return false;
        }

        if (query.freshness?.length) {
          const freshness =
            buildWorldStateFreshness(
              {
                observedAt:
                  record.observedAt,
                expiresAt:
                  record.freshness
                    .expiresAt,
                basis:
                  record.freshness.basis,
                ttlMs:
                  record.freshness.ttlMs,
              },
              { now },
            );

          if (
            !query.freshness.includes(
              freshness.status,
            )
          ) {
            return false;
          }
        }

        return true;
      })
      .sort((left, right) =>
        left.key.localeCompare(right.key),
      )
      .map((record) => {
        const cloned = cloneRecord(record);

        cloned.freshness =
          buildWorldStateFreshness(
            {
              observedAt:
                cloned.observedAt,
              expiresAt:
                cloned.freshness
                  .expiresAt,
              basis:
                cloned.freshness.basis,
              ttlMs:
                cloned.freshness.ttlMs,
            },
            { now },
          );

        return cloned;
      });
  }

  snapshot(): WorldStateRecord[] {
    return this.list();
  }
}
