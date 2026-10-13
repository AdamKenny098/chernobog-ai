import type {
  WorkScheduleSnapshot,
  WorkShift,
} from "../workSchedule/types";
import type {
  DesiredGoogleCalendarEvent,
  GoogleCalendarConfig,
  GoogleCalendarConflict,
  GoogleCalendarEvent,
  GoogleCalendarMutationPlan,
} from "./types";

const MANAGED_KEY =
  "chernobogManaged";

const MANAGED_VALUE =
  "pa5-work-shift";

const SOURCE_KEY =
  "chernobogSourceKey";

function privateProperties(
  event:
    GoogleCalendarEvent,
): Record<
  string,
  string
> {
  return (
    event
      .extendedProperties
      ?.private ??
    {}
  );
}

export function isChernobogManagedWorkEvent(
  event:
    GoogleCalendarEvent,
): boolean {
  return (
    privateProperties(
      event,
    )[
      MANAGED_KEY
    ] ===
    MANAGED_VALUE
  );
}

function shiftSourceKeys(
  shifts:
    WorkShift[],
): Array<{
  shift: WorkShift;
  sourceKey: string;
}> {
  const counts =
    new Map<
      string,
      number
    >();

  return [
    ...shifts,
  ]
    .sort(
      (
        left,
        right,
      ) =>
        left.startAt.localeCompare(
          right.startAt,
        ),
    )
    .map(
      (
        shift,
      ) => {
        const explicit =
          shift.sourceShiftId
            ?.trim();

        if (explicit) {
          return {
            shift,
            sourceKey:
              `source:${explicit}`,
          };
        }

        const ordinal =
          counts.get(
            shift.date,
          ) ??
          0;

        counts.set(
          shift.date,
          ordinal +
            1,
        );

        return {
          shift,
          sourceKey:
            `date:${shift.date}:slot:${ordinal}`,
        };
      },
    );
}

export function buildDesiredGoogleWorkEvents(
  snapshot:
    WorkScheduleSnapshot,
  config:
    GoogleCalendarConfig,
): DesiredGoogleCalendarEvent[] {
  return shiftSourceKeys(
    snapshot.shifts,
  ).map(
    (
      {
        shift,
        sourceKey,
      },
    ) => ({
      sourceKey,
      shiftId:
        shift.id,
      body: {
        summary:
          config.eventTitle,
        description:
          "Managed automatically by Chernobog PA-5 from the authoritative PA-4 Alkimii work roster.",
        transparency:
          "opaque",
        start: {
          dateTime:
            shift.startAt,
          timeZone:
            snapshot.timeZone,
        },
        end: {
          dateTime:
            shift.endAt,
          timeZone:
            snapshot.timeZone,
        },
        extendedProperties: {
          private: {
            [MANAGED_KEY]:
              MANAGED_VALUE,
            [SOURCE_KEY]:
              sourceKey,
            chernobogShiftId:
              shift.id,
            chernobogShiftDate:
              shift.date,
            chernobogSnapshotId:
              snapshot.snapshotId,
          },
        },
      },
    }),
  );
}

function equivalent(
  existing:
    GoogleCalendarEvent,
  desired:
    DesiredGoogleCalendarEvent,
): boolean {
  const privateData =
    privateProperties(
      existing,
    );

  return (
    existing.summary ===
      desired.body.summary &&
    existing.description ===
      desired.body.description &&
    existing.transparency ===
      desired.body.transparency &&
    existing.start
      ?.dateTime ===
      desired.body.start
        ?.dateTime &&
    existing.end
      ?.dateTime ===
      desired.body.end
        ?.dateTime &&
    existing.start
      ?.timeZone ===
      desired.body.start
        ?.timeZone &&
    existing.end
      ?.timeZone ===
      desired.body.end
        ?.timeZone &&
    privateData[
      SOURCE_KEY
    ] ===
      desired.sourceKey &&
    privateData
      .chernobogSnapshotId ===
      desired.body
        .extendedProperties
        ?.private
        ?.chernobogSnapshotId
  );
}

export function planGoogleCalendarReconciliation(
  snapshot:
    WorkScheduleSnapshot,
  existing:
    GoogleCalendarEvent[],
  config:
    GoogleCalendarConfig,
): GoogleCalendarMutationPlan {
  const desired =
    buildDesiredGoogleWorkEvents(
      snapshot,
      config,
    );

  const managed =
    existing.filter(
      isChernobogManagedWorkEvent,
    );

  const unrelatedIgnored =
    existing.length -
    managed.length;

  const bySource =
    new Map<
      string,
      GoogleCalendarEvent[]
    >();

  for (
    const event of
    managed
  ) {
    const sourceKey =
      privateProperties(
        event,
      )[
        SOURCE_KEY
      ];

    if (
      !sourceKey
    ) {
      continue;
    }

    const entries =
      bySource.get(
        sourceKey,
      ) ??
      [];

    entries.push(
      event,
    );

    bySource.set(
      sourceKey,
      entries,
    );
  }

  const create:
    DesiredGoogleCalendarEvent[] =
    [];

  const update:
    GoogleCalendarMutationPlan["update"] =
    [];

  const deleteIds:
    string[] =
    [];

  let unchanged =
    0;

  const desiredKeys =
    new Set(
      desired.map(
        (
          event,
        ) =>
          event.sourceKey,
      ),
    );

  for (
    const event of
    desired
  ) {
    const matches =
      bySource.get(
        event.sourceKey,
      ) ??
      [];

    const primary =
      matches[0];

    for (
      const duplicate of
      matches.slice(
        1,
      )
    ) {
      if (
        duplicate.id
      ) {
        deleteIds.push(
          duplicate.id,
        );
      }
    }

    if (
      !primary
    ) {
      create.push(
        event,
      );
      continue;
    }

    if (
      !primary.id
    ) {
      create.push(
        event,
      );
      continue;
    }

    if (
      equivalent(
        primary,
        event,
      )
    ) {
      unchanged +=
        1;
    } else {
      update.push({
        eventId:
          primary.id,
        desired:
          event,
      });
    }
  }

  for (
    const event of
    managed
  ) {
    const sourceKey =
      privateProperties(
        event,
      )[
        SOURCE_KEY
      ];

    if (
      sourceKey &&
      desiredKeys.has(
        sourceKey,
      )
    ) {
      continue;
    }

    if (
      event.id
    ) {
      deleteIds.push(
        event.id,
      );
    }
  }

  return {
    create,
    update,
    delete:
      [
        ...new Set(
          deleteIds,
        ),
      ],
    unchanged,
    unrelatedIgnored,
  };
}

function eventRange(
  event:
    GoogleCalendarEvent,
): {
  startAt: number;
  endAt: number;
} | null {
  if (
    event.status ===
      "cancelled" ||
    event.transparency ===
      "transparent" ||
    isChernobogManagedWorkEvent(
      event,
    )
  ) {
    return null;
  }

  const start =
    event.start
      ?.dateTime;

  const end =
    event.end
      ?.dateTime;

  if (
    !start ||
    !end
  ) {
    return null;
  }

  const startAt =
    Date.parse(
      start,
    );

  const endAt =
    Date.parse(
      end,
    );

  if (
    !Number.isFinite(
      startAt,
    ) ||
    !Number.isFinite(
      endAt,
    )
  ) {
    return null;
  }

  return {
    startAt,
    endAt,
  };
}

export function detectGoogleCalendarConflicts(
  snapshot:
    WorkScheduleSnapshot,
  calendarEvents:
    GoogleCalendarEvent[],
): GoogleCalendarConflict[] {
  const conflicts:
    GoogleCalendarConflict[] =
    [];

  for (
    const shift of
    snapshot.shifts
  ) {
    const shiftStart =
      Date.parse(
        shift.startAt,
      );

    const shiftEnd =
      Date.parse(
        shift.endAt,
      );

    for (
      const event of
      calendarEvents
    ) {
      const range =
        eventRange(
          event,
        );

      if (
        !range ||
        !event.id
      ) {
        continue;
      }

      const start =
        Math.max(
          shiftStart,
          range.startAt,
        );

      const end =
        Math.min(
          shiftEnd,
          range.endAt,
        );

      if (
        start <
        end
      ) {
        conflicts.push({
          shiftId:
            shift.id,
          eventId:
            event.id,
          overlapStartAt:
            new Date(
              start,
            ).toISOString(),
          overlapEndAt:
            new Date(
              end,
            ).toISOString(),
        });
      }
    }
  }

  return conflicts;
}