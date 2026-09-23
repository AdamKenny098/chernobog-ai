import {
  NextResponse,
} from "next/server";

import {
  authenticatePersonalAssistanceMobileRequest,
  ingestPersonalAssistanceMobileNotificationBatch,
  publishAcceptedMobileNotification,
} from "@/lib/chernobog/personalAssistance";
import type {
  PersonalAssistanceMobileNotificationBatchInput,
} from "@/lib/chernobog/personalAssistance";
import {
  markPersonalAssistanceMobileNotificationProcessed,
  readPersonalAssistanceStoredMobileNotification,
} from "@/lib/chernobog/personalAssistance/mobile/notificationStore";
import {
  analyzeAndProjectStoredMobileNotification,
} from "@/lib/chernobog/personalAssistance/notificationIntelligence/mobileBridge";
import {
  observeAlkimiiScheduleNotificationSafely,
} from "@/lib/chernobog/personalAssistance/workSchedule";
import type {
  NotificationProjectionResult,
} from "@/lib/chernobog/personalAssistance/notificationIntelligence";import {
  observeCommunicationResponsibilitySafely,
} from "@/lib/chernobog/personalAssistance/communicationResponsibility";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IntelligenceSummary = {
  eventId: string;
  outcome:
    NotificationProjectionResult["outcome"];
  responsibilityId?: string;
  classification: string;
  importance: string;
  correspondence: boolean;
  actionRequired: boolean;
};

function intelligenceSummary(
  projection:
    NotificationProjectionResult,
): IntelligenceSummary {
  return {
    eventId:
      projection.intelligence.eventId,
    outcome:
      projection.outcome,
    responsibilityId:
      projection.responsibilityId,
    classification:
      projection.intelligence.classification.kind,
    importance:
      projection.intelligence.importance.level,
    correspondence:
      projection.intelligence.correspondence.likelyCorrespondence,
    actionRequired:
      projection.intelligence.action.actionRequired,
  };
}

export async function POST(
  request: Request,
) {
  let device:
    ReturnType<
      typeof authenticatePersonalAssistanceMobileRequest
    >;

  let ingested:
    ReturnType<
      typeof ingestPersonalAssistanceMobileNotificationBatch
    >;

  try {
    device =
      authenticatePersonalAssistanceMobileRequest(
        request,
      );

    const body =
      (await request.json()) as unknown;

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      throw new Error(
        "Request body must be a JSON object.",
      );
    }

    ingested =
      ingestPersonalAssistanceMobileNotificationBatch(
        device,
        body as PersonalAssistanceMobileNotificationBatchInput,
      );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    const unauthorized =
      /authorization|bearer|credential|revoked/i.test(
        message,
      );

    return NextResponse.json(
      {
        ok: false,
        error:
          unauthorized
            ? "mobile_notification_unauthorized"
            : "mobile_notification_batch_invalid",
        message,
      },
      {
        status:
          unauthorized
            ? 401
            : 400,
      },
    );
  }

  const intelligence:
    IntelligenceSummary[] = [];

  try {
    for (
      const item of
      ingested.result.results
    ) {
      if (
        item.disposition !==
          "accepted" &&
        item.disposition !==
          "duplicate"
      ) {
        continue;
      }

      if (
        item.disposition ===
          "duplicate" &&
        ingested.result
          .acknowledgedEventIds
          .includes(
            item.eventId,
          )
      ) {
        continue;
      }

      const notification =
        readPersonalAssistanceStoredMobileNotification(
          device,
          item.eventId,
        );

      if (
        !notification
      ) {
        continue;
      }

      await publishAcceptedMobileNotification(
        notification,
      );

      await observeAlkimiiScheduleNotificationSafely(
        notification,
      );

      const projection =
        await analyzeAndProjectStoredMobileNotification(
          notification,
        );

      await observeCommunicationResponsibilitySafely(
        notification,
        projection,
      );

      intelligence.push(
        intelligenceSummary(
          projection,
        ),
      );
      markPersonalAssistanceMobileNotificationProcessed(
        device,
        item.eventId,
      );

      if (
        !ingested.result
          .acknowledgedEventIds
          .includes(
            item.eventId,
          )
      ) {
        ingested.result
          .acknowledgedEventIds
          .push(
            item.eventId,
          );
      }
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    return NextResponse.json(
      {
        ok: false,
        error:
          "mobile_notification_intelligence_unavailable",
        message,
        retryable: true,
        result:
          ingested.result,
        intelligence,
        capabilities: {
          notificationApiAvailable: true,
          offlineSpoolUpload: true,
          classification: true,
          importanceScoring: true,
          correspondenceDetection: true,
          actionDetection: true,
          responsibilityProjection: true,
          toolExecution: false,
          permissionGranting: false,
        },
      },
      {
        status: 503,
      },
    );
  }

  return NextResponse.json({
    ok: true,
    result:
      ingested.result,
    intelligence,
    capabilities: {
      notificationApiAvailable: true,
      offlineSpoolUpload: true,
      classification: true,
      importanceScoring: true,
      correspondenceDetection: true,
      actionDetection: true,
      responsibilityProjection: true,
      toolExecution: false,
      permissionGranting: false,
    },
  });
}
