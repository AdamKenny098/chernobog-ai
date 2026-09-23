import {
  appendFile,
  mkdir,
  readFile,
  rename,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import {
  randomUUID,
} from "node:crypto";
import type {
  WorkScheduleChange,
  WorkScheduleImportResult,
  WorkScheduleSignal,
  WorkScheduleSnapshot,
  WorkScheduleState,
  WorkShift,
} from "./types";

const EMPTY_STATE: WorkScheduleState = {
  schemaVersion: 1,
  source: "alkimii",
  latestSnapshot: null,
  latestChanges: [],
  latestSignal: null,
  pendingRefresh: false,
  seenSignalIds: [],
};

function clone<T>(
  value: T,
): T {
  return JSON.parse(
    JSON.stringify(value),
  ) as T;
}

function comparisonKey(
  shift: WorkShift,
): string {
  if (
    shift.sourceShiftId
  ) {
    return `id:${shift.sourceShiftId}`;
  }

  return [
    "heuristic",
    shift.date,
    shift.role ?? "",
    shift.department ?? "",
    shift.location ?? "",
  ].join(":");
}

function reconcile(
  before: WorkShift[],
  after: WorkShift[],
): WorkScheduleChange[] {
  const beforeBuckets =
    new Map<
      string,
      WorkShift[]
    >();

  const afterBuckets =
    new Map<
      string,
      WorkShift[]
    >();

  for (const shift of before) {
    const key =
      comparisonKey(
        shift,
      );

    beforeBuckets.set(
      key,
      [
        ...(
          beforeBuckets.get(
            key,
          ) ?? []
        ),
        shift,
      ],
    );
  }

  for (const shift of after) {
    const key =
      comparisonKey(
        shift,
      );

    afterBuckets.set(
      key,
      [
        ...(
          afterBuckets.get(
            key,
          ) ?? []
        ),
        shift,
      ],
    );
  }

  const keys =
    new Set([
      ...beforeBuckets.keys(),
      ...afterBuckets.keys(),
    ]);

  const changes:
    WorkScheduleChange[] = [];

  for (const key of keys) {
    const oldItems =
      [
        ...(
          beforeBuckets.get(
            key,
          ) ?? []
        ),
      ].sort(
        (a, b) =>
          a.startAt.localeCompare(
            b.startAt,
          ),
      );

    const newItems =
      [
        ...(
          afterBuckets.get(
            key,
          ) ?? []
        ),
      ].sort(
        (a, b) =>
          a.startAt.localeCompare(
            b.startAt,
          ),
      );

    const shared =
      Math.min(
        oldItems.length,
        newItems.length,
      );

    for (
      let index = 0;
      index < shared;
      index += 1
    ) {
      if (
        oldItems[index].fingerprint !==
        newItems[index].fingerprint
      ) {
        changes.push({
          kind:
            "changed",
          key:
            `${key}:${index}`,
          before:
            clone(
              oldItems[index],
            ),
          after:
            clone(
              newItems[index],
            ),
        });
      }
    }

    for (
      let index = shared;
      index <
      oldItems.length;
      index += 1
    ) {
      changes.push({
        kind:
          "removed",
        key:
          `${key}:${index}`,
        before:
          clone(
            oldItems[index],
          ),
      });
    }

    for (
      let index = shared;
      index <
      newItems.length;
      index += 1
    ) {
      changes.push({
        kind:
          "added",
        key:
          `${key}:${index}`,
        after:
          clone(
            newItems[index],
          ),
      });
    }
  }

  return changes.sort(
    (a, b) =>
      a.key.localeCompare(
        b.key,
      ),
  );
}

export class WorkScheduleStore {
  private readonly directory:
    string;

  private readonly statePath:
    string;

  private readonly eventsPath:
    string;

  private serial:
    Promise<void> =
    Promise.resolve();

  constructor(
    directory =
      path.join(
        process.cwd(),
        "data",
        "personal-assistance",
      ),
  ) {
    this.directory =
      directory;

    this.statePath =
      path.join(
        directory,
        "work-schedule.json",
      );

    this.eventsPath =
      path.join(
        directory,
        "work-schedule-events.jsonl",
      );
  }

  async read():
    Promise<WorkScheduleState> {
    await this.ensureDirectory();

    try {
      const text =
        await readFile(
          this.statePath,
          "utf8",
        );

      const parsed =
        JSON.parse(
          text,
        ) as WorkScheduleState;

      if (
        parsed.schemaVersion !== 1 ||
        parsed.source !==
          "alkimii" ||
        !Array.isArray(
          parsed.latestChanges,
        ) ||
        !Array.isArray(
          parsed.seenSignalIds,
        )
      ) {
        throw new Error(
          "Unsupported work schedule state format.",
        );
      }

      return clone(
        parsed,
      );
    } catch (
      error
    ) {
      if (
        (
          error as
            NodeJS.ErrnoException
        ).code ===
        "ENOENT"
      ) {
        return clone(
          EMPTY_STATE,
        );
      }

      throw error;
    }
  }

  async importSnapshot(
    snapshot:
      WorkScheduleSnapshot,
  ): Promise<WorkScheduleImportResult> {
    return this.mutate(
      async (
        state,
        event,
      ) => {
        const previous =
          state.latestSnapshot;

        const confirmed =
          previous?.snapshotId ===
          snapshot.snapshotId;

        const changes =
          previous &&
          !confirmed
            ? reconcile(
                previous.shifts,
                snapshot.shifts,
              )
            : [];

        state.latestSnapshot =
          clone(
            snapshot,
          );

        state.latestChanges =
          clone(
            changes,
          );

        state.pendingRefresh =
          false;

        await event(
          confirmed
            ? "snapshot-confirmed"
            : previous
              ? "snapshot-updated"
              : "snapshot-baseline",
          {
            snapshotId:
              snapshot.snapshotId,
            shiftCount:
              snapshot.shifts.length,
            changeCount:
              changes.length,
          },
        );

        return {
          disposition:
            confirmed
              ? "confirmed"
              : previous
                ? "updated"
                : "baseline",
          snapshot:
            clone(
              snapshot,
            ),
          changes:
            clone(
              changes,
            ),
        };
      },
    );
  }

  async observeSignal(
    signal:
      WorkScheduleSignal,
  ): Promise<boolean> {
    return this.mutate(
      async (
        state,
        event,
      ) => {
        if (
          state.seenSignalIds.includes(
            signal.eventId,
          )
        ) {
          return false;
        }

        state.latestSignal =
          clone(
            signal,
          );

        state.pendingRefresh =
          true;

        state.seenSignalIds =
          [
            signal.eventId,
            ...state.seenSignalIds,
          ].slice(
            0,
            250,
          );

        await event(
          "change-signal",
          {
            eventId:
              signal.eventId,
            confidence:
              signal.confidence,
            reason:
              signal.reason,
          },
        );

        return true;
      },
    );
  }

  private async mutate<T>(
    operation: (
      state: WorkScheduleState,
      event: (
        type: string,
        details:
          Record<string, unknown>,
      ) => Promise<void>,
    ) => Promise<T>,
  ): Promise<T> {
    const previous =
      this.serial;

    let release:
      (() => void) | undefined;

    this.serial =
      new Promise<void>(
        (resolve) => {
          release =
            resolve;
        },
      );

    await previous;

    try {
      const state =
        await this.read();

      const pendingEvents:
        string[] = [];

      const result =
        await operation(
          state,
          async (
            type,
            details,
          ) => {
            pendingEvents.push(
              JSON.stringify({
                id:
                  `work_schedule_event_${randomUUID()}`,
                type,
                occurredAt:
                  new Date().toISOString(),
                details,
              }),
            );
          },
        );

      await this.write(
        state,
      );

      for (
        const line of
        pendingEvents
      ) {
        await appendFile(
          this.eventsPath,
          `${line}\n`,
          "utf8",
        );
      }

      return result;
    } finally {
      release?.();
    }
  }

  private async ensureDirectory():
    Promise<void> {
    await mkdir(
      this.directory,
      {
        recursive: true,
      },
    );
  }

  private async write(
    state: WorkScheduleState,
  ): Promise<void> {
    await this.ensureDirectory();

    const temp =
      `${this.statePath}.tmp`;

    await writeFile(
      temp,
      `${JSON.stringify(
        state,
        null,
        2,
      )}\n`,
      "utf8",
    );

    await rename(
      temp,
      this.statePath,
    );
  }
}

let singleton:
  WorkScheduleStore | null =
  null;

export function getWorkScheduleStore():
  WorkScheduleStore {
  singleton ??=
    new WorkScheduleStore();

  return singleton;
}
