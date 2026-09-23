import {
  readFileSync,
} from "node:fs";
import {
  buildDesiredGoogleWorkEvents,
  detectGoogleCalendarConflicts,
  planGoogleCalendarReconciliation,
} from "../lib/chernobog/personalAssistance/calendar/reconciliation";
import {
  decryptGoogleCalendarSecret,
  encryptGoogleCalendarSecret,
} from "../lib/chernobog/personalAssistance/calendar/store";
import type {
  GoogleCalendarConfig,
  GoogleCalendarEvent,
} from "../lib/chernobog/personalAssistance/calendar/types";
import type {
  WorkScheduleSnapshot,
} from "../lib/chernobog/personalAssistance/workSchedule/types";

function pass(
  message: string,
) {
  console.log(
    `PASS ${message}`,
  );
}

function assert(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(
      `FAIL ${message}`,
    );
  }

  pass(
    message,
  );
}

function snapshot():
  WorkScheduleSnapshot {
  return {
    schemaVersion:
      1,
    snapshotId:
      "schedule_pa5_fixture",
    source:
      "alkimii",
    importedAt:
      "2026-09-21T10:00:00.000Z",
    observedAt:
      "2026-09-21T09:59:00.000Z",
    timeZone:
      "Europe/Dublin",
    shifts: [
      {
        id:
          "shift_monday",
        source:
          "alkimii",
        date:
          "2026-09-21",
        startAt:
          "2026-09-21T13:00:00.000Z",
        endAt:
          "2026-09-21T17:00:00.000Z",
        status:
          "scheduled",
        fingerprint:
          "monday",
      },
      {
        id:
          "shift_tuesday",
        source:
          "alkimii",
        date:
          "2026-09-22",
        startAt:
          "2026-09-22T06:00:00.000Z",
        endAt:
          "2026-09-22T15:00:00.000Z",
        status:
          "scheduled",
        fingerprint:
          "tuesday",
      },
    ],
  };
}

async function main() {
  process.env
    .CHERNOBOG_PA5_TOKEN_KEY =
    Buffer.alloc(
      32,
      7,
    ).toString(
      "base64",
    );

  const secret =
    "fixture-refresh-token";

  const encrypted =
    encryptGoogleCalendarSecret(
      secret,
    );

  assert(
    encrypted !==
      secret &&
    decryptGoogleCalendarSecret(
      encrypted,
    ) ===
      secret,
    "OAuth credentials are encrypted at rest and decrypt deterministically with the local PA-5 key",
  );

  const config:
    GoogleCalendarConfig = {
    calendarId:
      "primary",
    autoSyncWorkSchedule:
      true,
    eventTitle:
      "Work",
  };

  const desired =
    buildDesiredGoogleWorkEvents(
      snapshot(),
      config,
    );

  assert(
    desired.length ===
      2 &&
    desired.every(
      (
        item,
      ) =>
        item.body
          .summary ===
          "Work" &&
        item.body
          .start
          ?.timeZone ===
          "Europe/Dublin" &&
        item.body
          .extendedProperties
          ?.private
          ?.chernobogManaged ===
          "pa5-work-shift",
    ),
    "PA-4 shifts become timezone-aware Google Calendar events with private PA-5 ownership markers",
  );

  const firstDesired =
    desired[0];

  const existing:
    GoogleCalendarEvent[] = [
      {
        id:
          "managed-monday",
        summary:
          "Work",
        description:
          firstDesired
            .body
            .description,
        transparency:
          "opaque",
        start: {
          dateTime:
            "2026-09-21T12:00:00.000Z",
          timeZone:
            "Europe/Dublin",
        },
        end: {
          dateTime:
            "2026-09-21T16:00:00.000Z",
          timeZone:
            "Europe/Dublin",
        },
        extendedProperties: {
          private: {
            chernobogManaged:
              "pa5-work-shift",
            chernobogSourceKey:
              firstDesired.sourceKey,
            chernobogSnapshotId:
              "old",
          },
        },
      },
      {
        id:
          "managed-old",
        summary:
          "Work",
        start: {
          dateTime:
            "2026-09-20T06:00:00.000Z",
        },
        end: {
          dateTime:
            "2026-09-20T12:00:00.000Z",
        },
        extendedProperties: {
          private: {
            chernobogManaged:
              "pa5-work-shift",
            chernobogSourceKey:
              "date:2026-09-20:slot:0",
          },
        },
      },
      {
        id:
          "personal-event",
        summary:
          "Dentist",
        start: {
          dateTime:
            "2026-09-21T14:00:00.000Z",
        },
        end: {
          dateTime:
            "2026-09-21T15:00:00.000Z",
        },
      },
    ];

  const plan =
    planGoogleCalendarReconciliation(
      snapshot(),
      existing,
      config,
    );

  assert(
    plan.create.length ===
      1 &&
    plan.update.length ===
      1 &&
    plan.delete.length ===
      1 &&
    plan.unrelatedIgnored ===
      1,
    "reconciliation creates missing shifts, updates changed shifts, removes stale managed shifts and ignores unrelated events",
  );

  assert(
    !plan.delete.includes(
      "personal-event",
    ) &&
    !plan.update.some(
      (
        item,
      ) =>
        item.eventId ===
        "personal-event",
    ),
    "PA-5 cannot update or delete unrelated calendar events",
  );

  const exactExisting =
    desired.map(
      (
        item,
        index,
      ) => ({
        id:
          `managed-${index}`,
        ...item.body,
      }),
    );

  const replayPlan =
    planGoogleCalendarReconciliation(
      snapshot(),
      exactExisting,
      config,
    );

  assert(
    replayPlan.create.length ===
      0 &&
    replayPlan.update.length ===
      0 &&
    replayPlan.delete.length ===
      0 &&
    replayPlan.unchanged ===
      2,
    "unchanged PA-4 roster replay is calendar-idempotent",
  );

  const conflicts =
    detectGoogleCalendarConflicts(
      snapshot(),
      [
        ...exactExisting,
        {
          id:
            "personal-conflict",
          summary:
            "Appointment",
          start: {
            dateTime:
              "2026-09-21T14:30:00.000Z",
          },
          end: {
            dateTime:
              "2026-09-21T15:30:00.000Z",
          },
        },
      ],
    );

  assert(
    conflicts.length ===
      1 &&
    conflicts[0]
      .eventId ===
      "personal-conflict",
    "PA-5 detects overlapping personal commitments while excluding its own managed work events",
  );

  const mobileRoute =
    readFileSync(
      "app/api/personal-assistance/mobile/work-schedule/alkimii-roster/route.ts",
      "utf8",
    );

  const csvRoute =
    readFileSync(
      "app/api/personal-assistance/work-schedule/import/route.ts",
      "utf8",
    );

  assert(
    mobileRoute.includes(
      "syncWorkScheduleToGoogleCalendarSafely",
    ) &&
    csvRoute.includes(
      "syncWorkScheduleToGoogleCalendarSafely",
    ),
    "accepted PA-4 mobile and CSV imports automatically delegate reconciliation to PA-5",
  );

  const googleSource =
    readFileSync(
      "lib/chernobog/personalAssistance/calendar/google.ts",
      "utf8",
    );

  assert(
    googleSource.includes(
      "https://www.googleapis.com/auth/calendar.events",
    ) &&
    googleSource.includes(
      "privateExtendedProperty",
    ),
    "Google integration uses the shared-calendar-capable events OAuth scope and private extended-property filtering",
  );

  const documentation =
    readFileSync(
      "docs/personal-assistance/PA-5-google-calendar-steward.md",
      "utf8",
    );

  assert(
    documentation.includes(
      "may not automatically",
    ) &&
    documentation.includes(
      "modify unrelated calendar events",
    ),
    "PA-5 authority boundaries are documented explicitly",
  );

  console.log("");
  console.log(
    "PA-5 Google Calendar Steward verifier: PASS",
  );
}

void main().catch(
  (
    error,
  ) => {
    console.error(
      error,
    );
    process.exitCode =
      1;
  },
);