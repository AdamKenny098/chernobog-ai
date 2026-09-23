import type {
  PersonalAssistanceStoredNotification,
} from "../mobile/notificationTypes";
import {
  analyzeAndProjectNotification,
} from "./projector";
import type {
  NotificationIntelligenceObservation,
  NotificationProjectionResult,
} from "./types";

export function notificationIntelligenceObservationFromStoredMobileNotification(
  notification:
    PersonalAssistanceStoredNotification,
): NotificationIntelligenceObservation {
  const observation:
    NotificationIntelligenceObservation = {
    eventId:
      notification.eventId,
    appPackage:
      notification.appPackage,
    appLabel:
      notification.appLabel ??
      undefined,
    notificationKey:
      notification.notificationKey ??
      undefined,
    category:
      notification.category ??
      undefined,
    channelId:
      notification.channelId ??
      undefined,
    postedAt:
      notification.postedAt,
    sender:
      notification.sender ??
      undefined,
  };

  if (
    notification.captureMode ===
      "redacted-content"
  ) {
    observation.redactedTitle =
      notification.title ??
      undefined;

    observation.redactedBody =
      notification.body ??
      undefined;
  } else if (
    notification.captureMode ===
      "full-content"
  ) {
    observation.title =
      notification.title ??
      undefined;

    observation.body =
      notification.body ??
      undefined;
  }

  return observation;
}

export async function analyzeAndProjectStoredMobileNotification(
  notification:
    PersonalAssistanceStoredNotification,
): Promise<NotificationProjectionResult> {
  return analyzeAndProjectNotification(
    notificationIntelligenceObservationFromStoredMobileNotification(
      notification,
    ),
    {
      persistResponsibility:
        true,
      actor:
        "steward.notification-intelligence.mobile-ingress",
    },
  );
}
