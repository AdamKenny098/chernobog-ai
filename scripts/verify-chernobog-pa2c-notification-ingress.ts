import assert from "node:assert/strict";
import {
  mkdtemp,
  readFile,
  rm,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

function pass(
  message: string,
): void {
  console.log(
    `PASS ${message}`,
  );
}

async function main():
  Promise<void> {
  console.log(
    "Chernobog PA-2C - Notification Ingress & Reconciliation",
  );
  console.log(
    "=========================================================",
  );

  const tempRoot =
    await mkdtemp(
      path.join(
        os.tmpdir(),
        "chernobog-pa2c-",
      ),
    );

  const previousDataDirectory =
    process.env
      .CHERNOBOG_DATA_DIR;

  let primaryDatabase:
    | {
        close: () => void;
      }
    | null = null;

  process.env
    .CHERNOBOG_DATA_DIR =
    tempRoot;

  try {
    const personalAssistance =
      await import(
        "../lib/chernobog/personalAssistance"
      );
    const database =
      await import(
        "../lib/chernobog/db"
      );

    primaryDatabase =
      database.default;

    const challenge =
      personalAssistance
        .createPersonalAssistanceMobileEnrollment({
          now: new Date(
            "2026-09-07T01:00:00.000Z",
          ),
        });

    const enrolled =
      personalAssistance
        .enrollPersonalAssistanceMobileDevice(
          {
            pairingCode:
              challenge.pairingCode,
            installationId:
              "pa2c-installation-0001",
            displayName:
              "PA-2C Test Phone",
            appVersion:
              "0.3.0",
          },
          new Date(
            "2026-09-07T01:01:00.000Z",
          ),
        );

    const device =
      personalAssistance
        .authenticatePersonalAssistanceMobileToken(
          enrolled.token,
        );

    pass(
      "PA-2C starts from an authenticated PA-2A mobile identity",
    );

    const disabledBatch =
      personalAssistance
        .ingestPersonalAssistanceMobileNotificationBatch(
          device,
          {
            batchId:
              "batch-pa2c-disabled",
            events: [
              {
                eventId:
                  "notification-pa2c-disabled-0001",
                appPackage:
                  "com.example.chat",
                postedAt:
                  "2026-09-07T01:01:30.000Z",
                title:
                  "Should not be stored",
                body:
                  "Disabled capture body",
              },
            ],
          },
          new Date(
            "2026-09-07T01:01:31.000Z",
          ),
        );

    assert.equal(
      disabledBatch
        .result
        .acceptedCount,
      0,
    );
    assert.equal(
      disabledBatch
        .result
        .rejectedCount,
      1,
    );
    assert.equal(
      disabledBatch
        .result
        .results[0]
        ?.reason,
      "capture-disabled",
    );
    assert.deepEqual(
      disabledBatch
        .result
        .acknowledgedEventIds,
      [
        "notification-pa2c-disabled-0001",
      ],
    );

    const disabledStoredCount =
      database.default
        .prepare(
          `
          SELECT COUNT(*) AS count
          FROM personal_assistance_mobile_notification
          `,
        )
        .get() as {
          count: number;
        };

    assert.equal(
      disabledStoredCount.count,
      0,
    );
    pass(
      "default disabled notification capture acknowledges the spool item without persisting notification content",
    );

    personalAssistance
      .patchPersonalAssistanceProfile(
        {
          notification: {
            capture:
              "metadata-only",
            retentionDays:
              14,
            storeBodies:
              false,
          },
          privacy: {
            storeSenderIdentity:
              false,
          },
          reason:
            "PA-2C metadata-only verifier",
        },
        new Date(
          "2026-09-07T01:02:00.000Z",
        ),
      );

    const metadataBatch =
      personalAssistance
        .ingestPersonalAssistanceMobileNotificationBatch(
          device,
          {
            batchId:
              "batch-pa2c-metadata",
            events: [
              {
                eventId:
                  "notification-pa2c-metadata-0001",
                appPackage:
                  "com.example.chat",
                appLabel:
                  "Example Chat",
                notificationKey:
                  "notif-key-1",
                category:
                  "message",
                channelId:
                  "messages",
                postedAt:
                  "2026-09-07T01:02:10.000Z",
                sender:
                  "Private Sender",
                title:
                  "Secret title",
                body:
                  "Secret body",
                redactedTitle:
                  "Redacted title",
                redactedBody:
                  "Redacted body",
              },
            ],
          },
          new Date(
            "2026-09-07T01:02:11.000Z",
          ),
        );

    assert.equal(
      metadataBatch
        .result
        .acceptedCount,
      1,
    );
    assert.equal(
      metadataBatch
        .accepted[0]
        ?.captureMode,
      "metadata-only",
    );
    assert.equal(
      metadataBatch
        .accepted[0]
        ?.sender,
      null,
    );
    assert.equal(
      metadataBatch
        .accepted[0]
        ?.title,
      null,
    );
    assert.equal(
      metadataBatch
        .accepted[0]
        ?.body,
      null,
    );
    assert.equal(
      metadataBatch
        .accepted[0]
        ?.appPackage,
      "com.example.chat",
    );
    pass(
      "metadata-only capture strips sender and notification content according to PA-1B privacy policy",
    );

    const metadataRow =
      database.default
        .prepare(
          `
          SELECT notification_json
          FROM personal_assistance_mobile_notification
          WHERE event_id = ?
          LIMIT 1
          `,
        )
        .get(
          "notification-pa2c-metadata-0001",
        ) as
        | {
            notification_json: string;
          }
        | undefined;

    assert.ok(
      metadataRow,
    );
    assert.equal(
      metadataRow.notification_json
        .includes(
          "Secret title",
        ),
      false,
    );
    assert.equal(
      metadataRow.notification_json
        .includes(
          "Secret body",
        ),
      false,
    );
    assert.equal(
      metadataRow.notification_json
        .includes(
          "Private Sender",
        ),
      false,
    );
    pass(
      "discarded metadata-only content never reaches durable notification storage",
    );

    const replay =
      personalAssistance
        .ingestPersonalAssistanceMobileNotificationBatch(
          device,
          {
            batchId:
              "batch-pa2c-replay",
            events: [
              {
                eventId:
                  "notification-pa2c-metadata-0001",
                appPackage:
                  "com.example.chat",
                postedAt:
                  "2026-09-07T01:02:10.000Z",
              },
            ],
          },
          new Date(
            "2026-09-07T01:03:00.000Z",
          ),
        );

    assert.equal(
      replay
        .result
        .duplicateCount,
      1,
    );
    assert.equal(
      replay
        .accepted
        .length,
      0,
    );
    pass(
      "stable notification event IDs make offline-spool retries idempotent",
    );

    const reconciled =
      personalAssistance
        .reconcilePersonalAssistanceMobileNotificationReceipts(
          device,
          [
            "notification-pa2c-metadata-0001",
            "notification-pa2c-disabled-0001",
            "notification-pa2c-unknown-0001",
          ],
        );

    assert.deepEqual(
      reconciled
        .acknowledgedEventIds,
      [
        "notification-pa2c-metadata-0001",
        "notification-pa2c-disabled-0001",
      ],
    );
    assert.deepEqual(
      reconciled
        .unknownEventIds,
      [
        "notification-pa2c-unknown-0001",
      ],
    );
    pass(
      "explicit reconciliation distinguishes durable acknowledgements from events the phone must retry",
    );

    personalAssistance
      .patchPersonalAssistanceProfile(
        {
          notification: {
            capture:
              "full-content",
            storeBodies:
              true,
            redactSensitiveContent:
              true,
          },
          privacy: {
            storeSenderIdentity:
              true,
          },
          reason:
            "PA-2C redaction verifier",
        },
        new Date(
          "2026-09-07T01:04:00.000Z",
        ),
      );

    const redacted =
      personalAssistance
        .ingestPersonalAssistanceMobileNotificationBatch(
          device,
          {
            batchId:
              "batch-pa2c-redacted",
            events: [
              {
                eventId:
                  "notification-pa2c-redacted-0001",
                appPackage:
                  "com.example.mail",
                appLabel:
                  "Example Mail",
                postedAt:
                  "2026-09-07T01:04:10.000Z",
                sender:
                  "Known Sender",
                title:
                  "Raw secret title",
                body:
                  "Raw secret body",
                redactedTitle:
                  "Safe title",
                redactedBody:
                  "Safe body",
              },
            ],
          },
          new Date(
            "2026-09-07T01:04:11.000Z",
          ),
        );

    assert.equal(
      redacted
        .accepted[0]
        ?.captureMode,
      "full-content",
    );
    assert.equal(
      redacted
        .accepted[0]
        ?.sender,
      "Known Sender",
    );
    assert.equal(
      redacted
        .accepted[0]
        ?.title,
      "Safe title",
    );
    assert.equal(
      redacted
        .accepted[0]
        ?.body,
      "Safe body",
    );

    const redactedRow =
      database.default
        .prepare(
          `
          SELECT notification_json
          FROM personal_assistance_mobile_notification
          WHERE event_id = ?
          LIMIT 1
          `,
        )
        .get(
          "notification-pa2c-redacted-0001",
        ) as
        | {
            notification_json: string;
          }
        | undefined;

    assert.ok(
      redactedRow,
    );
    assert.equal(
      redactedRow.notification_json
        .includes(
          "Raw secret title",
        ),
      false,
    );
    assert.equal(
      redactedRow.notification_json
        .includes(
          "Raw secret body",
        ),
      false,
    );
    assert.equal(
      redactedRow.notification_json
        .includes(
          "Safe title",
        ),
      true,
    );
    pass(
      "sensitive-content redaction policy wins over full-content capture and stores only client-redacted content",
    );

    personalAssistance
      .patchPersonalAssistanceProfile(
        {
          notification: {
            redactSensitiveContent:
              false,
          },
          reason:
            "PA-2C explicit raw-content verifier",
        },
        new Date(
          "2026-09-07T01:05:00.000Z",
        ),
      );

    const full =
      personalAssistance
        .ingestPersonalAssistanceMobileNotificationBatch(
          device,
          {
            batchId:
              "batch-pa2c-full",
            events: [
              {
                eventId:
                  "notification-pa2c-full-0001",
                appPackage:
                  "com.example.mail",
                postedAt:
                  "2026-09-07T01:05:10.000Z",
                sender:
                  "Known Sender",
                title:
                  "Explicit full title",
                body:
                  "Explicit full body",
                redactedTitle:
                  "Unused redacted title",
                redactedBody:
                  "Unused redacted body",
              },
            ],
          },
          new Date(
            "2026-09-07T01:05:11.000Z",
          ),
        );

    assert.equal(
      full
        .accepted[0]
        ?.title,
      "Explicit full title",
    );
    assert.equal(
      full
        .accepted[0]
        ?.body,
      "Explicit full body",
    );
    pass(
      "raw notification content is stored only after explicit full-content plus redaction-disabled policy",
    );

    const eventsHelper =
      await readFile(
        path.join(
          process.cwd(),
          "lib",
          "chernobog",
          "personalAssistance",
          "mobile",
          "notificationEvents.ts",
        ),
        "utf8",
      );

    assert.match(
      eventsHelper,
      /publishChernobogEventSafely/,
    );
    assert.match(
      eventsHelper,
      /personal-assistance\.mobile\.notification\.observed/,
    );
    assert.match(
      eventsHelper,
      /sensitive:\s*true/,
    );
    pass(
      "accepted sanitized notification observations are published into the existing sensitive Event Spine",
    );

    const route =
      await readFile(
        path.join(
          process.cwd(),
          "app",
          "api",
          "personal-assistance",
          "mobile",
          "notifications",
          "route.ts",
        ),
        "utf8",
      );

    assert.match(
      route,
      /analyzeAndProjectStoredMobileNotification/,
    );
    assert.match(
      route,
      /classification:\s*true/,
    );
    assert.match(
      route,
      /importanceScoring:\s*true/,
    );
    assert.match(
      route,
      /correspondenceDetection:\s*true/,
    );
    assert.match(
      route,
      /actionDetection:\s*true/,
    );
    assert.match(
      route,
      /toolExecution:\s*false/,
    );
    assert.match(
      route,
      /permissionGranting:\s*false/,
    );
    assert.doesNotMatch(
      route,
      /\.executeTool|toolGateway|runTool|permissionGranting:\s*true/,
    );
    pass(
      "PA-2C privacy/reconciliation boundaries remain intact while allowing the PA-3B2 later-phase intelligence extension",
    );

    const sessionRoute =
      await readFile(
        path.join(
          process.cwd(),
          "app",
          "api",
          "personal-assistance",
          "mobile",
          "session",
          "route.ts",
        ),
        "utf8",
      );

    assert.match(
      sessionRoute,
      /notificationApiAvailable:\s*true/,
    );
    assert.match(
      sessionRoute,
      /notificationCaptureMode/,
    );
    pass(
      "mobile session exposes notification API availability separately from the user's effective capture policy",
    );

    console.log(
      "=========================================================",
    );
    console.log(
      "PASS PA-2C Notification Ingress & Reconciliation acceptance",
    );
  } finally {
    if (primaryDatabase) {
      try {
        primaryDatabase.close();
      } catch {
        // Best-effort verifier cleanup only.
      }
    }

    if (
      previousDataDirectory ===
      undefined
    ) {
      delete process.env
        .CHERNOBOG_DATA_DIR;
    } else {
      process.env
        .CHERNOBOG_DATA_DIR =
        previousDataDirectory;
    }

    await rm(
      tempRoot,
      {
        recursive: true,
        force: true,
      },
    );
  }
}

void main().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);
