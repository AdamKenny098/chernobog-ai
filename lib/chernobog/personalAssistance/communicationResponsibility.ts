import {
  publishChernobogEventSafely,
} from "../events";
import {
  getPersonalAssistanceProfile,
} from "./profileStore";
import {
  getResponsibilityLedger,
} from "./responsibilities";
import type {
  Responsibility,
} from "./responsibilities";
import type {
  NotificationProjectionResult,
} from "./notificationIntelligence";
import type {
  PersonalAssistanceStoredNotification,
} from "./mobile/notificationTypes";

export type CommunicationChannel =
  | "whatsapp"
  | "messages"
  | "discord"
  | "gmail"
  | "generic";

export type CommunicationObservationResult = {
  outcome:
    | "tracking-disabled"
    | "unmonitored"
    | "insufficient-evidence"
    | "source-replayed"
    | "created"
    | "merged"
    | "reopened"
    | "failed";
  channel: CommunicationChannel | null;
  responsibilityId?: string;
  dueAt?: string;
  error?: string;
};

const TARGETS = [
  {
    channel: "whatsapp" as const,
    packages: ["com.whatsapp", "com.whatsapp.w4b"],
    labels: ["whatsapp"],
  },
  {
    channel: "messages" as const,
    packages: ["com.google.android.apps.messaging"],
    labels: ["messages", "google messages"],
  },
  {
    channel: "discord" as const,
    packages: ["com.discord"],
    labels: ["discord"],
  },
  {
    channel: "gmail" as const,
    packages: ["com.google.android.gm"],
    labels: ["gmail"],
  },
] as const;

function lower(
  value: string | null | undefined,
): string {
  return (value ?? "").trim().toLocaleLowerCase();
}

export function communicationChannel(
  notification:
    Pick<
      PersonalAssistanceStoredNotification,
      "appPackage" | "appLabel" | "category"
    >,
  projection?: NotificationProjectionResult,
): CommunicationChannel | null {
  const appPackage = lower(notification.appPackage);
  const appLabel = lower(notification.appLabel);

  for (const target of TARGETS) {
    if (
      target.packages.some((value) => appPackage === value) ||
      target.labels.some(
        (value) =>
          appLabel === value ||
          appLabel.includes(value),
      )
    ) {
      return target.channel;
    }
  }

  const kind =
    projection?.intelligence.classification.kind;

  const category =
    lower(notification.category);

  if (
    kind === "communication" ||
    kind === "email" ||
    category === "msg" ||
    category === "message" ||
    category === "email"
  ) {
    return "generic";
  }

  return null;
}

export function responseDueAt(
  postedAt: string | null | undefined,
  hours: number | null,
  now = new Date(),
): string | undefined {
  if (hours === null) {
    return undefined;
  }

  const parsed =
    postedAt ? Date.parse(postedAt) : Number.NaN;

  const base =
    Number.isFinite(parsed)
      ? parsed
      : now.getTime();

  return new Date(
    base + hours * 60 * 60 * 1000,
  ).toISOString();
}

function isCommunicationResponsibility(
  responsibility: Responsibility,
): boolean {
  return Boolean(
    responsibility.mergeKey?.startsWith(
      "notification-thread:",
    ),
  );
}

async function publish(
  responsibility: Responsibility,
  outcome: string,
  channel: CommunicationChannel | null,
): Promise<void> {
  await publishChernobogEventSafely({
    type:
      "personal-assistance.communication.responsibility-updated",
    source: {
      subsystem:
        "personal-assistance.communication-responsibility",
    },
    severity:
      "info",
    subject:
      responsibility.id,
    scope:
      "personal-assistance",
    dedupeKey:
      `pa6:${responsibility.id}:${responsibility.revision}:${outcome}`,
    payload: {
      responsibilityId:
        responsibility.id,
      state:
        responsibility.state,
      dueAt:
        responsibility.dueAt ?? null,
      channel,
      outcome,
    },
    metadata: {
      sensitive:
        true,
      confidence:
        1,
      tags: [
        "personal-assistance",
        "communication",
        "responsibility",
        "pa6",
      ],
    },
  });
}

export async function observeCommunicationResponsibility(
  notification: PersonalAssistanceStoredNotification,
  projection: NotificationProjectionResult,
): Promise<CommunicationObservationResult> {
  const profile =
    getPersonalAssistanceProfile();

  if (!profile.communication.trackResponsibilities) {
    return {
      outcome:
        "tracking-disabled",
      channel:
        null,
    };
  }

  const channel =
    communicationChannel(
      notification,
      projection,
    );

  if (!channel) {
    return {
      outcome:
        "unmonitored",
      channel:
        null,
    };
  }

  if (
    projection.outcome === "analysis-only" ||
    projection.outcome === "insufficient-evidence" ||
    !projection.responsibilityId
  ) {
    return {
      outcome:
        "insufficient-evidence",
      channel,
    };
  }

  if (projection.outcome === "source-replayed") {
    return {
      outcome:
        "source-replayed",
      channel,
      responsibilityId:
        projection.responsibilityId,
    };
  }

  const ledger =
    getResponsibilityLedger();

  let responsibility =
    await ledger.get(
      projection.responsibilityId,
    );

  if (!responsibility) {
    return {
      outcome:
        "failed",
      channel,
      responsibilityId:
        projection.responsibilityId,
      error:
        "Projected responsibility was not found in the responsibility ledger.",
    };
  }

  const dueAt =
    responseDueAt(
      notification.postedAt,
      profile.communication.defaultResponseWindowHours,
    );

  const suggestedAction =
    projection.intelligence.action.suggestedAction;

  if (dueAt || suggestedAction) {
    responsibility =
      await ledger.update(
        responsibility.id,
        {
          dueAt,
          suggestedAction,
          actor:
            "steward.communication-responsibility",
          reason:
            "PA-6 applied communication follow-up policy.",
        },
      );
  }

  let outcome:
    CommunicationObservationResult["outcome"] =
    projection.outcome === "merged"
      ? "merged"
      : "created";

  if (
    responsibility.state === "waiting-external" &&
    projection.intelligence.action.actionRequired
  ) {
    responsibility =
      await ledger.transition(
        responsibility.id,
        {
          state:
            "waiting-user",
          actor:
            "steward.communication-responsibility",
          reason:
            "New actionable inbound communication reopened the thread for the user.",
        },
      );

    outcome =
      "reopened";
  }

  await publish(
    responsibility,
    outcome,
    channel,
  );

  return {
    outcome,
    channel,
    responsibilityId:
      responsibility.id,
    dueAt:
      responsibility.dueAt,
  };
}

export async function observeCommunicationResponsibilitySafely(
  notification: PersonalAssistanceStoredNotification,
  projection: NotificationProjectionResult,
): Promise<CommunicationObservationResult> {
  try {
    return await observeCommunicationResponsibility(
      notification,
      projection,
    );
  } catch (error) {
    return {
      outcome:
        "failed",
      channel:
        communicationChannel(
          notification,
          projection,
        ),
      responsibilityId:
        projection.responsibilityId,
      error:
        error instanceof Error
          ? error.message
          : String(error),
    };
  }
}

export async function getCommunicationStatus(
  now = new Date(),
) {
  const profile =
    getPersonalAssistanceProfile();

  const responsibilities =
    (await getResponsibilityLedger().list({
      includeClosed:
        true,
    }))
      .filter(isCommunicationResponsibility)
      .map((responsibility) => {
        const due =
          responsibility.dueAt
            ? Date.parse(responsibility.dueAt)
            : Number.NaN;

        return {
          responsibility,
          overdue:
            responsibility.state !== "resolved" &&
            responsibility.state !== "dismissed" &&
            Number.isFinite(due) &&
            due < now.getTime(),
          waitingOn:
            responsibility.state === "waiting-user"
              ? "user"
              : responsibility.state === "waiting-external"
                ? "external"
                : "none",
        };
      });

  const open =
    responsibilities.filter(
      ({ responsibility }) =>
        responsibility.state !== "resolved" &&
        responsibility.state !== "dismissed",
    );

  return {
    enabled:
      profile.communication.trackResponsibilities,
    responseWindowHours:
      profile.communication.defaultResponseWindowHours,
    captureMode:
      profile.notification.capture,
    storesBodies:
      profile.notification.storeBodies,
    storesSenderIdentity:
      profile.privacy.storeSenderIdentity,
    monitoredChannels: [
      "whatsapp",
      "messages",
      "discord",
      "gmail",
      "generic",
    ],
    openCount:
      open.length,
    overdueCount:
      open.filter((item) => item.overdue).length,
    communications:
      responsibilities,
    boundaries: {
      readsNotifications:
        true,
      createsResponsibilities:
        true,
      sendsMessages:
        false,
      clicksApps:
        false,
      grantsPermissions:
        false,
    },
  };
}

export async function applyCommunicationAction(
  id: string,
  input: unknown,
): Promise<Responsibility> {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input)
  ) {
    throw new Error(
      "Request body must be a JSON object.",
    );
  }

  const record =
    input as Record<string, unknown>;

  const action =
    record.action;

  const ledger =
    getResponsibilityLedger();

  let responsibility =
    await ledger.get(id);

  if (
    !responsibility ||
    !isCommunicationResponsibility(
      responsibility,
    )
  ) {
    throw new Error(
      "Communication responsibility not found.",
    );
  }

  if (action === "mark-replied") {
    responsibility =
      await ledger.transition(
        id,
        {
          state:
            "waiting-external",
          actor:
            "explicit-user",
          reason:
            "User marked the communication as replied.",
        },
      );
  } else if (action === "resolve") {
    responsibility =
      await ledger.transition(
        id,
        {
          state:
            "resolved",
          actor:
            "explicit-user",
          reason:
            "User marked the communication responsibility resolved.",
        },
      );
  } else if (action === "dismiss") {
    responsibility =
      await ledger.transition(
        id,
        {
          state:
            "dismissed",
          actor:
            "explicit-user",
          reason:
            "User dismissed the communication responsibility.",
        },
      );
  } else if (action === "reopen") {
    responsibility =
      await ledger.transition(
        id,
        {
          state:
            "waiting-user",
          actor:
            "explicit-user",
          reason:
            "User reopened the communication responsibility.",
        },
      );
  } else if (action === "snooze") {
    const hours =
      record.hours;

    if (
      typeof hours !== "number" ||
      !Number.isInteger(hours) ||
      hours < 1 ||
      hours > 720
    ) {
      throw new Error(
        "Snooze hours must be an integer from 1 to 720.",
      );
    }

    responsibility =
      await ledger.update(
        id,
        {
          dueAt:
            new Date(
              Date.now() +
              hours * 60 * 60 * 1000,
            ).toISOString(),
          actor:
            "explicit-user",
          reason:
            `User snoozed communication follow-up for ${hours} hour(s).`,
        },
      );
  } else {
    throw new Error(
      "action must be mark-replied, resolve, dismiss, reopen, or snooze.",
    );
  }

  await publish(
    responsibility,
    String(action),
    null,
  );

  return responsibility;
}