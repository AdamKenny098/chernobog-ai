import {
  publishChernobogEventSafely,
} from "../../events";
import type {
  PersonalAssistanceStoredNotification,
} from "./notificationTypes";

const SOURCE = {
  subsystem:
    "personal-assistance.mobile.notification",
} as const;

export async function publishAcceptedMobileNotification(
  notification:
    PersonalAssistanceStoredNotification,
): Promise<void> {
  await publishChernobogEventSafely({
    type:
      "personal-assistance.mobile.notification.observed",
    occurredAt:
      notification.postedAt,
    source:
      SOURCE,
    severity:
      "info",
    subject:
      notification.deviceId,
    scope:
      "personal-assistance",
    dedupeKey:
      `mobile-notification:${notification.eventId}`,
    payload: {
      eventId:
        notification.eventId,
      deviceId:
        notification.deviceId,
      captureMode:
        notification.captureMode,
      appPackage:
        notification.appPackage,
      appLabel:
        notification.appLabel,
      notificationKey:
        notification.notificationKey,
      category:
        notification.category,
      channelId:
        notification.channelId,
      postedAt:
        notification.postedAt,
      sender:
        notification.sender,
      title:
        notification.title,
      body:
        notification.body,
    },
    metadata: {
      sensitive: true,
      confidence: 1,
      tags: [
        "personal-assistance",
        "mobile",
        "notification",
        "sensor",
      ],
    },
  });
}
