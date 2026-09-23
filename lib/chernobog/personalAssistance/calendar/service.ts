import {
  randomBytes,
} from "node:crypto";
import {
  publishChernobogEventSafely,
} from "@/lib/chernobog/events";
import {
  patchPersonalAssistanceProfile,
} from "../profileStore";
import type {
  WorkScheduleSnapshot,
} from "../workSchedule/types";
import {
  applyGoogleCalendarMutationPlan,
  exchangeGoogleCalendarAuthorizationCode,
  googleCalendarAuthorizationUrl,
  googleCalendarClientConfigured,
  googleCalendarRedirectUri,
  listChernobogManagedGoogleEvents,
  listGoogleEventsInWindow,
} from "./google";
import {
  buildDesiredGoogleWorkEvents,
  detectGoogleCalendarConflicts,
  planGoogleCalendarReconciliation,
} from "./reconciliation";
import {
  clearGoogleCalendarAuthorization,
  readGoogleCalendarState,
  updateGoogleCalendarState,
} from "./store";
import type {
  GoogleCalendarStatus,
  GoogleCalendarSyncSummary,
} from "./types";

function connected(
  state:
    Awaited<
      ReturnType<
        typeof readGoogleCalendarState
      >
    >,
): boolean {
  return Boolean(
    state.auth
      .refreshToken ||
    (
      state.auth
        .accessToken &&
      state.auth
        .accessTokenExpiresAt &&
      Date.parse(
        state.auth
          .accessTokenExpiresAt,
      ) >
        Date.now()
    ),
  );
}

export async function getGoogleCalendarStatus(
  origin =
    "http://localhost:3000",
): Promise<GoogleCalendarStatus> {
  const state =
    await readGoogleCalendarState();

  return {
    provider:
      "google-calendar",
    clientConfigured:
      googleCalendarClientConfigured(),
    connected:
      connected(
        state,
      ),
    redirectUri:
      googleCalendarRedirectUri(
        origin,
      ),
    calendarId:
      state.config
        .calendarId,
    autoSyncWorkSchedule:
      state.config
        .autoSyncWorkSchedule,
    eventTitle:
      state.config
        .eventTitle,
    lastSync:
      state.lastSync,
    boundaries: {
      sourceOfTruth:
        "pa4-work-schedule",
      mayCreateManagedWorkEvents:
        true,
      mayUpdateManagedWorkEvents:
        true,
      mayDeleteManagedWorkEvents:
        true,
      mayModifyUnrelatedEvents:
        false,
      mayDeleteUnrelatedEvents:
        false,
      mayInferExtraShifts:
        false,
    },
  };
}

export async function configureGoogleCalendar(
  input: {
    calendarId?: string;
    autoSyncWorkSchedule?: boolean;
    eventTitle?: string;
  },
): Promise<GoogleCalendarStatus> {
  await updateGoogleCalendarState(
    (
      current,
    ) => {
      const calendarId =
        input.calendarId ===
          undefined
          ? current.config
              .calendarId
          : input.calendarId
              .trim();

      const eventTitle =
        input.eventTitle ===
          undefined
          ? current.config
              .eventTitle
          : input.eventTitle
              .trim();

      if (
        !calendarId ||
        calendarId.length >
          320
      ) {
        throw new Error(
          "calendarId must be a non-empty Google Calendar identifier.",
        );
      }

      if (
        !eventTitle ||
        eventTitle.length >
          120
      ) {
        throw new Error(
          "eventTitle must be between 1 and 120 characters.",
        );
      }

      return {
        ...current,
        config: {
          calendarId,
          autoSyncWorkSchedule:
            input
              .autoSyncWorkSchedule ??
            current.config
              .autoSyncWorkSchedule,
          eventTitle,
        },
      };
    },
  );

  return getGoogleCalendarStatus();
}

export async function beginGoogleCalendarConnection(
  origin:
    string,
): Promise<string> {
  if (
    !googleCalendarClientConfigured()
  ) {
    throw new Error(
      "Google Calendar OAuth client is not configured.",
    );
  }

  const redirectUri =
    googleCalendarRedirectUri(
      origin,
    );

  const state =
    randomBytes(
      24,
    ).toString(
      "hex",
    );

  await updateGoogleCalendarState(
    (
      current,
    ) => ({
      ...current,
      oauthPending: {
        state,
        redirectUri,
        createdAt:
          new Date()
            .toISOString(),
      },
    }),
  );

  return googleCalendarAuthorizationUrl({
    state,
    redirectUri,
  });
}

export async function completeGoogleCalendarConnection(
  input: {
    code: string;
    state: string;
  },
): Promise<void> {
  const current =
    await readGoogleCalendarState();

  const pending =
    current
      .oauthPending;

  if (
    !pending ||
    pending.state !==
      input.state
  ) {
    throw new Error(
      "Google Calendar OAuth state validation failed.",
    );
  }

  if (
    Date.now() -
    Date.parse(
      pending.createdAt,
    ) >
      15 *
      60_000
  ) {
    throw new Error(
      "Google Calendar OAuth state expired. Start the connection again.",
    );
  }

  await exchangeGoogleCalendarAuthorizationCode({
    code:
      input.code,
    redirectUri:
      pending.redirectUri,
  });

  await updateGoogleCalendarState(
    (
      latest,
    ) => ({
      ...latest,
      config: {
        ...latest.config,
        autoSyncWorkSchedule:
          true,
      },
      oauthPending:
        null,
    }),
  );

  patchPersonalAssistanceProfile({
    schedule: {
      preferredCalendarSource:
        "google",
    },
    reason:
      "PA-5 Google Calendar connection established.",
  });
}

export async function disconnectGoogleCalendar():
  Promise<GoogleCalendarStatus> {
  await clearGoogleCalendarAuthorization();

  return getGoogleCalendarStatus();
}

function snapshotWindow(
  snapshot:
    WorkScheduleSnapshot,
): {
  timeMin: string;
  timeMax: string;
} | null {
  if (
    snapshot.shifts
      .length ===
      0
  ) {
    return null;
  }

  const starts =
    snapshot.shifts
      .map(
        (
          shift,
        ) =>
          Date.parse(
            shift.startAt,
          ),
      )
      .filter(
        Number.isFinite,
      );

  const ends =
    snapshot.shifts
      .map(
        (
          shift,
        ) =>
          Date.parse(
            shift.endAt,
          ),
      )
      .filter(
        Number.isFinite,
      );

  if (
    starts.length ===
      0 ||
    ends.length ===
      0
  ) {
    return null;
  }

  return {
    timeMin:
      new Date(
        Math.min(
          ...starts,
        ) -
        24 *
          60 *
          60_000,
      ).toISOString(),
    timeMax:
      new Date(
        Math.max(
          ...ends,
        ) +
        24 *
          60 *
          60_000,
      ).toISOString(),
  };
}

async function persistSync(
  summary:
    GoogleCalendarSyncSummary,
): Promise<void> {
  await updateGoogleCalendarState(
    (
      current,
    ) => ({
      ...current,
      lastSync:
        summary,
    }),
  );
}

export async function syncWorkScheduleToGoogleCalendar(
  snapshot:
    WorkScheduleSnapshot,
  mode:
    "automatic" |
    "manual" =
    "automatic",
): Promise<GoogleCalendarSyncSummary> {
  const attemptedAt =
    new Date()
      .toISOString();

  const state =
    await readGoogleCalendarState();

  if (
    !connected(
      state,
    )
  ) {
    const summary:
      GoogleCalendarSyncSummary = {
      disposition:
        "skipped-not-connected",
      snapshotId:
        snapshot.snapshotId,
      created:
        0,
      updated:
        0,
      deleted:
        0,
      unchanged:
        0,
      conflictCount:
        0,
      attemptedAt,
      completedAt:
        attemptedAt,
      error:
        null,
    };

    await persistSync(
      summary,
    );

    return summary;
  }

  if (
    mode ===
      "automatic" &&
    !state.config
      .autoSyncWorkSchedule
  ) {
    const summary:
      GoogleCalendarSyncSummary = {
      disposition:
        "skipped-auto-sync-disabled",
      snapshotId:
        snapshot.snapshotId,
      created:
        0,
      updated:
        0,
      deleted:
        0,
      unchanged:
        0,
      conflictCount:
        0,
      attemptedAt,
      completedAt:
        attemptedAt,
      error:
        null,
    };

    await persistSync(
      summary,
    );

    return summary;
  }

  if (
    snapshot.shifts
      .length ===
      0
  ) {
    const summary:
      GoogleCalendarSyncSummary = {
      disposition:
        "skipped-no-shifts",
      snapshotId:
        snapshot.snapshotId,
      created:
        0,
      updated:
        0,
      deleted:
        0,
      unchanged:
        0,
      conflictCount:
        0,
      attemptedAt,
      completedAt:
        attemptedAt,
      error:
        null,
    };

    await persistSync(
      summary,
    );

    return summary;
  }

  try {
    const managed =
      await listChernobogManagedGoogleEvents(
        state.config
          .calendarId,
      );

    const plan =
      planGoogleCalendarReconciliation(
        snapshot,
        managed,
        state.config,
      );

    const mutations =
      await applyGoogleCalendarMutationPlan(
        state.config
          .calendarId,
        plan,
      );

    const window =
      snapshotWindow(
        snapshot,
      );

    let conflictCount =
      0;

    if (
      window
    ) {
      const events =
        await listGoogleEventsInWindow(
          state.config
            .calendarId,
          window.timeMin,
          window.timeMax,
        );

      conflictCount =
        detectGoogleCalendarConflicts(
          snapshot,
          events,
        ).length;
    }

    const completedAt =
      new Date()
        .toISOString();

    const summary:
      GoogleCalendarSyncSummary = {
      disposition:
        "synced",
      snapshotId:
        snapshot.snapshotId,
      created:
        mutations.created,
      updated:
        mutations.updated,
      deleted:
        mutations.deleted,
      unchanged:
        plan.unchanged,
      conflictCount,
      attemptedAt,
      completedAt,
      error:
        null,
    };

    await persistSync(
      summary,
    );

    await publishChernobogEventSafely({
      type:
        "personal-assistance.calendar.work-schedule-synced",
      source: {
        subsystem:
          "personal-assistance.calendar",
      },
      severity:
        conflictCount >
          0
          ? "notice"
          : "info",
      dedupeKey:
        `pa5-google-calendar:${snapshot.snapshotId}:${completedAt}`,
      payload: {
        provider:
          "google-calendar",
        snapshotId:
          snapshot.snapshotId,
        created:
          summary.created,
        updated:
          summary.updated,
        deleted:
          summary.deleted,
        unchanged:
          summary.unchanged,
        conflictCount:
          summary.conflictCount,
      },
      metadata: {
        confidence:
          1,
        sensitive:
          true,
        tags: [
          "personal-assistance",
          "calendar",
          "google-calendar",
          "work-schedule",
          "pa5",
        ],
      },
    });

    return summary;
  } catch (
    error
  ) {
    const message =
      error instanceof Error
        ? error.message
        : String(
            error,
          );

    const summary:
      GoogleCalendarSyncSummary = {
      disposition:
        "failed",
      snapshotId:
        snapshot.snapshotId,
      created:
        0,
      updated:
        0,
      deleted:
        0,
      unchanged:
        0,
      conflictCount:
        0,
      attemptedAt,
      completedAt:
        new Date()
          .toISOString(),
      error:
        message,
    };

    await persistSync(
      summary,
    );

    throw error;
  }
}

export async function syncWorkScheduleToGoogleCalendarSafely(
  snapshot:
    WorkScheduleSnapshot,
  mode:
    "automatic" |
    "manual" =
    "automatic",
): Promise<GoogleCalendarSyncSummary> {
  try {
    return await syncWorkScheduleToGoogleCalendar(
      snapshot,
      mode,
    );
  } catch (
    error
  ) {
    const now =
      new Date()
        .toISOString();

    return {
      disposition:
        "failed",
      snapshotId:
        snapshot.snapshotId,
      created:
        0,
      updated:
        0,
      deleted:
        0,
      unchanged:
        0,
      conflictCount:
        0,
      attemptedAt:
        now,
      completedAt:
        now,
      error:
        error instanceof Error
          ? error.message
          : String(
              error,
            ),
    };
  }
}

export {
  buildDesiredGoogleWorkEvents,
  detectGoogleCalendarConflicts,
  planGoogleCalendarReconciliation,
};