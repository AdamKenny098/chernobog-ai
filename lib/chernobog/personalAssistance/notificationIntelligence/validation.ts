import type {
  NotificationIntelligenceObservation,
} from "./types";

function objectValue(
  value: unknown,
): Record<string, unknown> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error(
      "Expected a JSON object.",
    );
  }

  return value as Record<string, unknown>;
}

function optionalString(
  value: unknown,
  field: string,
  maxLength: number,
): string | undefined {
  if (
    value === undefined ||
    value === null
  ) {
    return undefined;
  }

  if (
    typeof value !== "string"
  ) {
    throw new Error(
      `${field} must be a string.`,
    );
  }

  const trimmed =
    value.trim();

  if (
    !trimmed
  ) {
    return undefined;
  }

  if (
    trimmed.length >
    maxLength
  ) {
    throw new Error(
      `${field} is too long.`,
    );
  }

  return trimmed;
}

export function parseNotificationIntelligenceObservation(
  value: unknown,
): {
  observation: NotificationIntelligenceObservation;
  persistResponsibility: boolean;
} {
  const record =
    objectValue(value);

  const eventId =
    optionalString(
      record.eventId,
      "eventId",
      512,
    );

  if (
    !eventId
  ) {
    throw new Error(
      "eventId is required.",
    );
  }

  const persistResponsibility =
    record.persistResponsibility ===
      undefined
      ? true
      : record.persistResponsibility;

  if (
    typeof persistResponsibility !==
      "boolean"
  ) {
    throw new Error(
      "persistResponsibility must be boolean.",
    );
  }

  return {
    observation: {
      eventId,
      appPackage:
        optionalString(
          record.appPackage,
          "appPackage",
          512,
        ),
      appLabel:
        optionalString(
          record.appLabel,
          "appLabel",
          256,
        ),
      notificationKey:
        optionalString(
          record.notificationKey,
          "notificationKey",
          1024,
        ),
      category:
        optionalString(
          record.category,
          "category",
          128,
        ),
      channelId:
        optionalString(
          record.channelId,
          "channelId",
          256,
        ),
      postedAt:
        optionalString(
          record.postedAt,
          "postedAt",
          64,
        ),
      sender:
        optionalString(
          record.sender,
          "sender",
          512,
        ),
      title:
        optionalString(
          record.title,
          "title",
          2000,
        ),
      body:
        optionalString(
          record.body,
          "body",
          8000,
        ),
      redactedTitle:
        optionalString(
          record.redactedTitle,
          "redactedTitle",
          2000,
        ),
      redactedBody:
        optionalString(
          record.redactedBody,
          "redactedBody",
          8000,
        ),
    },
    persistResponsibility,
  };
}
