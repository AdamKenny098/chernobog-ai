import {
  publishChernobogEventSafely,
} from "@/lib/chernobog/events";
import {
  getPersonalAssistanceProfile,
} from "../profileStore";
import type {
  PersonalAssistanceStoredNotification,
} from "../mobile/notificationTypes";
import {
  getResponsibilityLedger,
} from "../responsibilities";
import {
  buildAlkimiiSnapshot,
} from "./alkimii";
import {
  buildAlkimiiMobileSnapshot,
} from "./mobileRoster";
import {
  getWorkScheduleStore,
} from "./store";
import type {
  WorkScheduleChange,
  WorkScheduleImportResult,
  WorkScheduleSignal,
  WorkScheduleStatus,
  WorkShift,
} from "./types";

function nextShift(
  shifts: WorkShift[],
  now:
    Date,
): WorkShift | null {
  const nowMs =
    now.getTime();

  return shifts
    .filter(
      (shift) =>
        Date.parse(
          shift.endAt,
        ) >= nowMs,
    )
    .sort(
      (a, b) =>
        a.startAt.localeCompare(
          b.startAt,
        ),
    )[0] ?? null;
}

function earliestChangedShift(
  changes:
    WorkScheduleChange[],
): WorkShift | null {
  return changes
    .map(
      (change) =>
        change.after ??
        change.before,
    )
    .filter(
      (
        shift,
      ): shift is WorkShift =>
        Boolean(
          shift,
        ),
    )
    .sort(
      (a, b) =>
        a.startAt.localeCompare(
          b.startAt,
        ),
    )[0] ?? null;
}

function changeSummary(
  changes:
    WorkScheduleChange[],
): string {
  const added =
    changes.filter(
      (change) =>
        change.kind ===
        "added",
    ).length;

  const removed =
    changes.filter(
      (change) =>
        change.kind ===
        "removed",
    ).length;

  const changed =
    changes.filter(
      (change) =>
        change.kind ===
        "changed",
    ).length;

  return [
    `${added} added`,
    `${changed} changed`,
    `${removed} removed`,
  ].join(", ");
}

async function projectChanges(
  result:
    WorkScheduleImportResult,
): Promise<
  string | undefined
> {
  if (
    result.disposition !==
      "updated" ||
    result.changes.length ===
      0
  ) {
    return undefined;
  }

  const earliest =
    earliestChangedShift(
      result.changes,
    );

  const dueAt =
    earliest &&
    Date.parse(
      earliest.startAt,
    ) >
      Date.now()
      ? earliest.startAt
      : undefined;

  const created =
    await getResponsibilityLedger()
      .create({
        title:
          "Work schedule changed",
        summary:
          `Alkimii schedule reconciliation detected ${changeSummary(
            result.changes,
          )}.`,
        source: {
          type:
            "work-schedule",
          sourceId:
            `alkimii-snapshot:${result.snapshot.snapshotId}`,
          application:
            "Alkimii",
        },
        state:
          "waiting-user",
        priority:
          result.changes.some(
            (change) =>
              change.kind ===
                "removed" ||
              change.kind ===
                "changed",
          )
            ? "important"
            : "normal",
        requiresHuman:
          true,
        suggestedAction:
          "Review the updated Alkimii work schedule.",
        dueAt,
        confidence:
          1,
        actor:
          "steward.work-schedule.alkimii",
        reason:
          "Authoritative Alkimii schedule import differs from the previous snapshot.",
      });

  return created
    .responsibility
    .id;
}

export async function importAlkimiiWorkSchedule(
  input: {
    csvText: string;
    fileName?: string;
    observedAt?: string;
  },
): Promise<{
  result:
    WorkScheduleImportResult;
  responsibilityId?: string;
  status:
    WorkScheduleStatus;
}> {
  const profile =
    getPersonalAssistanceProfile();

  const timeZone =
    profile.timeZone ??
    "UTC";

  const snapshot =
    buildAlkimiiSnapshot(
      input.csvText,
      {
        timeZone,
        fileName:
          input.fileName,
        observedAt:
          input.observedAt,
      },
    );

  const result =
    await getWorkScheduleStore()
      .importSnapshot(
        snapshot,
      );

  const responsibilityId =
    await projectChanges(
      result,
    );

  await publishChernobogEventSafely({
    type:
      result.disposition ===
        "updated" &&
      result.changes.length >
        0
        ? "personal-assistance.work-schedule.changed"
        : "personal-assistance.work-schedule.snapshot-imported",
    source: {
      subsystem:
        "personal-assistance.work-schedule",
    },
    severity:
      result.changes.length >
        0
        ? "notice"
        : "info",
    dedupeKey:
      `work-schedule:${result.snapshot.snapshotId}:${result.disposition}`,
    payload: {
      source:
        "alkimii",
      snapshotId:
        result.snapshot.snapshotId,
      disposition:
        result.disposition,
      shiftCount:
        result.snapshot.shifts.length,
      changeCount:
        result.changes.length,
      responsibilityId,
    },
    metadata: {
      confidence:
        1,
      sensitive:
        true,
      tags: [
        "personal-assistance",
        "work-schedule",
        "alkimii",
      ],
    },
  });

  return {
    result,
    responsibilityId,
    status:
      await getWorkScheduleStatus(),
  };
}

export async function importAlkimiiMobileRoster(
  input: {
    captureId: string;
    nodes: unknown[];
    observedAt?: string;
    deviceId: string;
  },
): Promise<{
  result:
    WorkScheduleImportResult;
  responsibilityId?: string;
  status:
    WorkScheduleStatus;
}> {
  const profile =
    getPersonalAssistanceProfile();

  const timeZone =
    profile.timeZone ??
    "UTC";

  const captureId =
    input.captureId
      .trim();

  if (
    captureId.length <
      12 ||
    captureId.length >
      160
  ) {
    throw new Error(
      "captureId must be between 12 and 160 characters.",
    );
  }

  const nodes =
    input.nodes.map(
      (
        value,
      ) => {
        if (
          typeof value !==
          "string"
        ) {
          throw new Error(
            "Alkimii mobile roster nodes must be strings.",
          );
        }

        if (
          value.length >
          500
        ) {
          throw new Error(
            "An Alkimii mobile roster text node exceeds 500 characters.",
          );
        }

        return value;
      },
    );

  const snapshot =
    buildAlkimiiMobileSnapshot(
      nodes,
      {
        timeZone,
        observedAt:
          input.observedAt,
        captureId,
      },
    );

  const result =
    await getWorkScheduleStore()
      .importSnapshot(
        snapshot,
      );

  const responsibilityId =
    await projectChanges(
      result,
    );

  await publishChernobogEventSafely({
    type:
      result.disposition ===
        "updated" &&
      result.changes.length >
        0
        ? "personal-assistance.work-schedule.changed"
        : "personal-assistance.work-schedule.snapshot-imported",
    source: {
      subsystem:
        "personal-assistance.work-schedule",
    },
    severity:
      result.changes.length >
        0
        ? "notice"
        : "info",
    dedupeKey:
      `work-schedule-mobile:${result.snapshot.snapshotId}:${result.disposition}`,
    payload: {
      source:
        "alkimii",
      capture:
        "android-accessibility",
      snapshotId:
        result.snapshot.snapshotId,
      disposition:
        result.disposition,
      shiftCount:
        result.snapshot.shifts.length,
      changeCount:
        result.changes.length,
      deviceId:
        input.deviceId,
      responsibilityId,
    },
    metadata: {
      confidence:
        0.96,
      sensitive:
        true,
      tags: [
        "personal-assistance",
        "work-schedule",
        "alkimii",
        "android",
        "accessibility",
      ],
    },
  });

  return {
    result,
    responsibilityId,
    status:
      await getWorkScheduleStatus(),
  };
}
function notificationIdentity(
  notification:
    PersonalAssistanceStoredNotification,
): boolean {
  return /alkimii/iu.test(
    [
      notification.appPackage,
      notification.appLabel ??
        "",
    ].join(" "),
  );
}

function notificationScheduleEvidence(
  notification:
    PersonalAssistanceStoredNotification,
): {
  matched: boolean;
  confidence: number;
  reason: string;
} {
  if (
    !notificationIdentity(
      notification,
    )
  ) {
    return {
      matched:
        false,
      confidence:
        0,
      reason:
        "not-alkimii",
    };
  }

  const content =
    [
      notification.title ??
        "",
      notification.body ??
        "",
      notification.category ??
        "",
      notification.channelId ??
        "",
    ]
      .join(" ")
      .toLowerCase();

  if (
    /\b(?:roster|rota|shift|schedule|scheduled|rostering)\b/iu.test(
      content,
    )
  ) {
    return {
      matched:
        true,
      confidence:
        0.92,
      reason:
        "Alkimii notification contains explicit roster/shift/schedule evidence.",
    };
  }

  return {
    matched:
      false,
    confidence:
      notification.captureMode ===
        "metadata-only"
        ? 0.35
        : 0.45,
    reason:
      "Alkimii notification observed without schedule-specific evidence.",
  };
}

export async function observeAlkimiiScheduleNotificationSafely(
  notification:
    PersonalAssistanceStoredNotification,
): Promise<{
  observed: boolean;
  responsibilityId?: string;
}> {
  try {
    const evidence =
      notificationScheduleEvidence(
        notification,
      );

    if (
      !evidence.matched
    ) {
      return {
        observed:
          false,
      };
    }

    const signal:
      WorkScheduleSignal = {
      eventId:
        notification.eventId,
      source:
        "alkimii",
      observedAt:
        notification.postedAt,
      confidence:
        evidence.confidence,
      reason:
        evidence.reason,
      appPackage:
        notification.appPackage,
      appLabel:
        notification.appLabel ??
        undefined,
    };

    const fresh =
      await getWorkScheduleStore()
        .observeSignal(
          signal,
        );

    if (!fresh) {
      return {
        observed:
          true,
      };
    }

    const status =
      await getWorkScheduleStatus();

    let responsibilityId:
      string | undefined;

    if (
      status.isStale ||
      status.snapshot ===
        null
    ) {
      const created =
        await getResponsibilityLedger()
          .create({
            title:
              "Refresh Alkimii work schedule",
            summary:
              "Alkimii reported a roster or shift update, but Chernobog does not have a sufficiently fresh authoritative schedule snapshot.",
            source: {
              type:
                "work-schedule",
              sourceId:
                `alkimii-notification:${notification.eventId}`,
              application:
                "Alkimii",
            },
            state:
              "waiting-user",
            priority:
              "important",
            requiresHuman:
              true,
            suggestedAction:
              "Open Alkimii My Schedule → Roster so the Chernobog mobile companion can refresh the work schedule.",
            confidence:
              evidence.confidence,
            actor:
              "steward.work-schedule.alkimii-notification",
            reason:
              evidence.reason,
          });

      responsibilityId =
        created
          .responsibility
          .id;
    }

    await publishChernobogEventSafely({
      type:
        "personal-assistance.work-schedule.change-signal",
      source: {
        subsystem:
          "personal-assistance.work-schedule",
      },
      severity:
        "notice",
      dedupeKey:
        `work-schedule-signal:${notification.eventId}`,
      payload: {
        source:
          "alkimii",
        eventId:
          notification.eventId,
        confidence:
          evidence.confidence,
        pendingRefresh:
          true,
        responsibilityId,
      },
      metadata: {
        confidence:
          evidence.confidence,
        sensitive:
          true,
        tags: [
          "personal-assistance",
          "work-schedule",
          "alkimii",
          "notification",
        ],
      },
    });

    return {
      observed:
        true,
      responsibilityId,
    };
  } catch {
    return {
      observed:
        false,
    };
  }
}

export async function getWorkScheduleStatus(
  now =
    new Date(),
): Promise<WorkScheduleStatus> {
  const profile =
    getPersonalAssistanceProfile();

  const state =
    await getWorkScheduleStore()
      .read();

  const lastImportedAt =
    state.latestSnapshot
      ?.importedAt ??
    null;

  const staleAfterMinutes =
    profile.schedule
      .staleAfterMinutes;

  const isStale =
    lastImportedAt ===
      null ||
    (
      now.getTime() -
      Date.parse(
        lastImportedAt,
      )
    ) >
      staleAfterMinutes *
      60_000;

  return {
    source:
      "alkimii",
    preferredSource:
      profile.schedule
        .preferredWorkScheduleSource,
    staleAfterMinutes,
    isStale,
    pendingRefresh:
      state.pendingRefresh,
    lastImportedAt,
    latestSignal:
      state.latestSignal,
    latestChanges:
      state.latestChanges,
    snapshot:
      state.latestSnapshot,
    nextShift:
      state.latestSnapshot
        ? nextShift(
            state.latestSnapshot
              .shifts,
            now,
          )
        : null,
    boundaries: {
      executesTools:
        false,
      grantsPermissions:
        false,
      createsCalendarEvents:
        false,
      sendsMessages:
        false,
    },
  };
}
