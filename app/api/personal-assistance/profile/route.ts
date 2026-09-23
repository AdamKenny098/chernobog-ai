import {
  NextResponse,
} from "next/server";

import {
  getPersonalAssistanceEffectiveProfile,
  getPersonalAttentionSnapshot,
  listPersonalAssistanceProfileAudit,
  patchPersonalAssistanceProfile,
  resetPersonalAssistanceProfile,
} from "@/lib/chernobog/personalAssistance";
import type {
  PersonalAssistanceProfilePatch,
} from "@/lib/chernobog/personalAssistance";

export const runtime = "nodejs";

type JsonObject =
  Record<string, unknown>;

const TOP_LEVEL_KEYS =
  new Set([
    "locale",
    "timeZone",
    "proactiveAssistanceEnabled",
    "interruptionPreference",
    "notification",
    "communication",
    "schedule",
    "privacy",
    "reason",
  ]);

const NESTED_KEYS:
  Record<string, Set<string>> = {
    notification: new Set([
      "capture",
      "retentionDays",
      "storeBodies",
      "redactSensitiveContent",
    ]),
    communication: new Set([
      "trackResponsibilities",
      "defaultResponseWindowHours",
    ]),
    schedule: new Set([
      "preferredWorkScheduleSource",
      "preferredCalendarSource",
      "staleAfterMinutes",
    ]),
    privacy: new Set([
      "storeSenderIdentity",
      "storeDeviceHealthHistory",
    ]),
  };

function isObject(
  value: unknown,
): value is JsonObject {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function assertKnownKeys(
  body: JsonObject,
): void {
  for (
    const key of
    Object.keys(body)
  ) {
    if (
      !TOP_LEVEL_KEYS.has(
        key,
      )
    ) {
      throw new Error(
        `Unknown profile field: ${key}`,
      );
    }
  }

  for (
    const [
      key,
      allowed,
    ] of Object.entries(
      NESTED_KEYS,
    )
  ) {
    const value =
      body[key];

    if (
      value === undefined
    ) {
      continue;
    }

    if (
      !isObject(value)
    ) {
      throw new Error(
        `${key} must be a JSON object.`,
      );
    }

    for (
      const nestedKey of
      Object.keys(value)
    ) {
      if (
        !allowed.has(
          nestedKey,
        )
      ) {
        throw new Error(
          `Unknown profile field: ${key}.${nestedKey}`,
        );
      }
    }
  }
}

function responseBody(
  includeAudit: boolean,
) {
  const effective =
    getPersonalAssistanceEffectiveProfile();

  return {
    ok: true,
    profile:
      effective.profile,
    origins:
      effective.origins,
    attention:
      getPersonalAttentionSnapshot(),
    audit:
      includeAudit
        ? listPersonalAssistanceProfileAudit()
        : undefined,
    boundary: {
      executesTools: false,
      grantsPermissions: false,
      inferredPreferencesEnabled: false,
      notificationIngestEnabled: true,
      notificationCaptureConfigured:
        effective.profile.notification.capture !==
        "disabled",
      offlineSpoolUploadEnabled: true,
      mobileEnrollmentEnabled: true,
      mobileDeviceHealthEnabled: true,
      tailnetTransportRequired: true,
    },
  };
}

export async function GET(
  request: Request,
) {
  try {
    const url =
      new URL(
        request.url,
      );

    return NextResponse.json(
      responseBody(
        url.searchParams.get(
          "includeAudit",
        ) === "true",
      ),
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "personal_assistance_profile_read_failed",
        message:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 500,
      },
    );
  }
}

export async function PATCH(
  request: Request,
) {
  try {
    const body =
      (await request.json()) as unknown;

    if (!isObject(body)) {
      throw new Error(
        "Request body must be a JSON object.",
      );
    }

    assertKnownKeys(
      body,
    );

    patchPersonalAssistanceProfile(
      body as
        PersonalAssistanceProfilePatch,
    );

    return NextResponse.json(
      responseBody(false),
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "personal_assistance_profile_update_failed",
        message:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 400,
      },
    );
  }
}

export async function DELETE(
  request: Request,
) {
  try {
    const body =
      await request
        .json()
        .catch(
          () => ({}),
        );

    const reason =
      isObject(body) &&
      typeof body.reason ===
        "string"
        ? body.reason
        : undefined;

    resetPersonalAssistanceProfile(
      reason,
    );

    return NextResponse.json(
      responseBody(false),
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "personal_assistance_profile_reset_failed",
        message:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 400,
      },
    );
  }
}