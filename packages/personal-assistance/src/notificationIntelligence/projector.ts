import {
  getResponsibilityLedger,
} from "../responsibilities";
import {
  analyzeNotification,
} from "./analyzer";
import {
  getNotificationIntelligenceJournal,
} from "./journal";
import type {
  NotificationIntelligenceObservation,
  NotificationProjectionResult,
} from "./types";

export async function analyzeAndProjectNotification(
  observation:
    NotificationIntelligenceObservation,
  options?: {
    persistResponsibility?: boolean;
    actor?: string;
  },
): Promise<NotificationProjectionResult> {
  const intelligence =
    analyzeNotification(
      observation,
    );

  const persistResponsibility =
    options?.persistResponsibility ??
    true;

  if (
    !persistResponsibility
  ) {
    const result:
      NotificationProjectionResult = {
      intelligence,
      outcome:
        "analysis-only",
    };

    await getNotificationIntelligenceJournal()
      .append(result);

    return result;
  }

  if (
    !intelligence
      .responsibility
      .shouldCreate
  ) {
    const result:
      NotificationProjectionResult = {
      intelligence,
      outcome:
        "insufficient-evidence",
    };

    await getNotificationIntelligenceJournal()
      .append(result);

    return result;
  }

  const recommendation =
    intelligence.responsibility;

  const projected =
    await getResponsibilityLedger()
      .create({
        title:
          recommendation.title ??
          "Review notification",
        summary:
          recommendation.summary ??
          "A notification appears to require attention.",
        source: {
          type:
            "notification",
          sourceId:
            observation.eventId,
          application:
            observation.appLabel ??
            observation.appPackage,
        },
        state:
          recommendation.state,
        priority:
          recommendation.priority,
        requiresHuman:
          recommendation.requiresHuman,
        suggestedAction:
          recommendation.suggestedAction,
        confidence:
          recommendation.confidence,
        mergeKey:
          recommendation.mergeKey,
        actor:
          options?.actor ??
          "steward.notification-intelligence",
        reason:
          recommendation.reasons.join(
            " ",
          ),
      });

  const result:
    NotificationProjectionResult = {
    intelligence,
    outcome:
      projected.disposition,
    responsibilityId:
      projected
        .responsibility
        .id,
  };

  await getNotificationIntelligenceJournal()
    .append(result);

  return result;
}
