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
    "Chernobog PA-2B - Mobile Transport & Device Health",
  );
  console.log(
    "===================================================",
  );

  const tempRoot =
    await mkdtemp(
      path.join(
        os.tmpdir(),
        "chernobog-pa2b-",
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
            "2026-09-07T00:00:00.000Z",
          ),
        });

    const enrolled =
      personalAssistance
        .enrollPersonalAssistanceMobileDevice(
          {
            pairingCode:
              challenge.pairingCode,
            installationId:
              "pa2b-installation-0001",
            displayName:
              "PA-2B Test Phone",
            appVersion:
              "0.2.0",
          },
          new Date(
            "2026-09-07T00:01:00.000Z",
          ),
        );

    const device =
      personalAssistance
        .authenticatePersonalAssistanceMobileToken(
          enrolled.token,
        );

    pass(
      "PA-2B starts from an authenticated PA-2A mobile identity",
    );

    const first =
      personalAssistance
        .recordPersonalAssistanceMobileHeartbeat(
          device,
          {
            heartbeatId:
              "heartbeat-pa2b-0001",
            batteryPercent:
              73,
            charging:
              false,
            lowPowerMode:
              false,
            networkType:
              "wifi",
            appState:
              "background",
            notificationListenerEnabled:
              false,
            spoolPendingCount:
              0,
            clientObservedAt:
              "2026-09-07T00:01:30.000Z",
          },
          new Date(
            "2026-09-07T00:01:31.000Z",
          ),
        );

    assert.equal(
      first.accepted,
      true,
    );
    assert.equal(
      first.duplicate,
      false,
    );
    assert.equal(
      first.historyPersisted,
      false,
    );
    assert.equal(
      first.snapshot
        .batteryPercent,
      73,
    );
    assert.equal(
      first.snapshot
        .networkType,
      "wifi",
    );
    pass(
      "authenticated heartbeat records current device health",
    );

    const listed =
      personalAssistance
        .listPersonalAssistanceMobileDevices();

    assert.equal(
      listed[0]
        ?.lastSeenAt,
      "2026-09-07T00:01:31.000Z",
    );
    pass(
      "heartbeat advances authoritative device last-seen state",
    );

    const historyCountBefore =
      database.default
        .prepare(
          `
          SELECT COUNT(*) AS count
          FROM personal_assistance_mobile_health_history
          `,
        )
        .get() as {
          count: number;
        };

    assert.equal(
      historyCountBefore.count,
      0,
    );
    pass(
      "device-health history is not retained while PA-1B privacy policy is disabled",
    );

    const duplicate =
      personalAssistance
        .recordPersonalAssistanceMobileHeartbeat(
          device,
          {
            heartbeatId:
              "heartbeat-pa2b-0001",
            batteryPercent:
              20,
            networkType:
              "cellular",
          },
          new Date(
            "2026-09-07T00:02:00.000Z",
          ),
        );

    assert.equal(
      duplicate.accepted,
      true,
    );
    assert.equal(
      duplicate.duplicate,
      true,
    );
    assert.equal(
      duplicate.snapshot
        .batteryPercent,
      73,
    );
    pass(
      "replayed heartbeat ID is acknowledged idempotently without overwriting current health",
    );

    personalAssistance
      .patchPersonalAssistanceProfile(
        {
          privacy: {
            storeDeviceHealthHistory:
              true,
          },
          reason:
            "PA-2B verifier enables history",
        },
        new Date(
          "2026-09-07T00:02:30.000Z",
        ),
      );

    const second =
      personalAssistance
        .recordPersonalAssistanceMobileHeartbeat(
          device,
          {
            heartbeatId:
              "heartbeat-pa2b-0002",
            batteryPercent:
              69,
            charging:
              true,
            lowPowerMode:
              false,
            networkType:
              "cellular",
            appState:
              "foreground",
            notificationListenerEnabled:
              false,
            spoolPendingCount:
              4,
            clientObservedAt:
              "2026-09-07T00:03:00.000Z",
          },
          new Date(
            "2026-09-07T00:03:01.000Z",
          ),
        );

    assert.equal(
      second.historyPersisted,
      true,
    );

    const current =
      personalAssistance
        .getPersonalAssistanceMobileHealth(
          device.deviceId,
        );

    assert.ok(current);
    assert.equal(
      current.batteryPercent,
      69,
    );
    assert.equal(
      current.charging,
      true,
    );
    assert.equal(
      current.spoolPendingCount,
      4,
    );

    const historyCountAfter =
      database.default
        .prepare(
          `
          SELECT COUNT(*) AS count
          FROM personal_assistance_mobile_health_history
          `,
        )
        .get() as {
          count: number;
        };

    assert.equal(
      historyCountAfter.count,
      1,
    );
    pass(
      "explicit PA-1B privacy consent enables health history for later heartbeats only",
    );

    const receiptCount =
      database.default
        .prepare(
          `
          SELECT COUNT(*) AS count
          FROM personal_assistance_mobile_heartbeat_receipt
          `,
        )
        .get() as {
          count: number;
        };

    assert.equal(
      receiptCount.count,
      2,
    );
    pass(
      "minimal heartbeat receipt ledger supports reconnect deduplication independently of health-history retention",
    );

    const transport =
      personalAssistance
        .getPersonalAssistanceMobileTransportPolicy();

    assert.equal(
      transport.mode,
      "tailnet-only",
    );
    assert.equal(
      transport
        .applicationAuthentication,
      "device-bearer",
    );
    assert.equal(
      transport.tlsRequired,
      true,
    );
    assert.equal(
      transport
        .directInternetExposureSupported,
      false,
    );
    assert.equal(
      transport
        .sourceNetworkAssertion,
      "not-inferred-by-application",
    );
    pass(
      "transport policy truthfully requires Tailnet use without pretending Next.js can infer the request path",
    );

    const heartbeatRoute =
      await readFile(
        path.join(
          process.cwd(),
          "app",
          "api",
          "personal-assistance",
          "mobile",
          "heartbeat",
          "route.ts",
        ),
        "utf8",
      );

    assert.match(
      heartbeatRoute,
      /authenticatePersonalAssistanceMobileRequest/,
    );
    assert.doesNotMatch(
      heartbeatRoute,
      /\.executeTool|toolGateway|runTool|permissionGranting:\s*true/,
    );
    const heartbeatNotificationBoundaryIsValid =
      (
        /notificationIngest:\s*false/.test(
          heartbeatRoute,
        ) &&
        /offlineSpoolUpload:\s*false/.test(
          heartbeatRoute,
        )
      ) ||
      (
        /notificationApiAvailable:\s*true/.test(
          heartbeatRoute,
        ) &&
        /notificationCaptureMode/.test(
          heartbeatRoute,
        ) &&
        /notificationIngest:\s*\n\s*notificationCaptureAllowed/.test(
          heartbeatRoute,
        ) &&
        /offlineSpoolUpload:\s*\n\s*notificationCaptureAllowed/.test(
          heartbeatRoute,
        )
      );

    assert.equal(
      heartbeatNotificationBoundaryIsValid,
      true,
    );
    pass(
      "heartbeat API is device-authenticated and keeps notification/spool capabilities either disabled or explicitly profile-gated while tool and permission capabilities stay disabled",
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
      /heartbeat:\s*true/,
    );
    const sessionNotificationBoundaryIsValid =
      /notificationIngest:\s*false/.test(
        sessionRoute,
      ) ||
      (
        /notificationApiAvailable:\s*true/.test(
          sessionRoute,
        ) &&
        /notificationCaptureMode/.test(
          sessionRoute,
        ) &&
        /notificationIngest:\s*\n\s*notificationCaptureAllowed/.test(
          sessionRoute,
        ) &&
        /offlineSpoolUpload:\s*\n\s*notificationCaptureAllowed/.test(
          sessionRoute,
        )
      );

    assert.equal(
      sessionNotificationBoundaryIsValid,
      true,
    );
    pass(
      "mobile session advertises heartbeat while notification/spool capability remains disabled before PA-2C or explicitly profile-gated after PA-2C",
    );

    const profileRoute =
      await readFile(
        path.join(
          process.cwd(),
          "app",
          "api",
          "personal-assistance",
          "profile",
          "route.ts",
        ),
        "utf8",
      );

    assert.match(
      profileRoute,
      /mobileDeviceHealthEnabled:\s*true/,
    );
    assert.match(
      profileRoute,
      /tailnetTransportRequired:\s*true/,
    );
    const profileNotificationBoundaryIsValid =
      /notificationIngestEnabled:\s*false/.test(
        profileRoute,
      ) ||
      (
        /notificationIngestEnabled:\s*true/.test(
          profileRoute,
        ) &&
        /notificationCaptureConfigured/.test(
          profileRoute,
        ) &&
        /offlineSpoolUploadEnabled:\s*true/.test(
          profileRoute,
        )
      );

    assert.equal(
      profileNotificationBoundaryIsValid,
      true,
    );
    pass(
      "profile diagnostics preserve PA-2B transport/health boundaries while allowing PA-2C notification capability to be exposed separately from effective capture policy",
    );

    console.log(
      "===================================================",
    );
    console.log(
      "PASS PA-2B Mobile Transport & Device Health acceptance",
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
