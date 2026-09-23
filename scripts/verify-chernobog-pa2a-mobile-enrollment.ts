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

async function expectFailure(
  run: () => unknown,
  pattern: RegExp,
): Promise<void> {
  let failed = false;

  try {
    await run();
  } catch (error) {
    failed = true;
    assert.match(
      error instanceof Error
        ? error.message
        : String(error),
      pattern,
    );
  }

  assert.equal(
    failed,
    true,
  );
}

async function main():
  Promise<void> {
  console.log(
    "Chernobog PA-2A - Android Device Identity & Enrollment",
  );
  console.log(
    "=======================================================",
  );

  const tempRoot =
    await mkdtemp(
      path.join(
        os.tmpdir(),
        "chernobog-pa2a-",
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

    assert.deepEqual(
      personalAssistance
        .listPersonalAssistanceMobileDevices(),
      [],
    );
    pass(
      "fresh PA-2A state contains no invented mobile devices",
    );

    const challenge =
      personalAssistance
        .createPersonalAssistanceMobileEnrollment({
          expiresInMinutes: 10,
          now: new Date(
            "2026-09-06T22:30:00.000Z",
          ),
        });

    assert.ok(
      challenge
        .pairingCode
        .length >= 20,
    );
    assert.equal(
      challenge.createdAt,
      "2026-09-06T22:30:00.000Z",
    );
    assert.equal(
      challenge.expiresAt,
      "2026-09-06T22:40:00.000Z",
    );

    const storedEnrollment =
      database.default
        .prepare(
          `
          SELECT code_hash
          FROM personal_assistance_mobile_enrollment
          WHERE enrollment_id = ?
          LIMIT 1
          `,
        )
        .get(
          challenge
            .enrollmentId,
        ) as
        | {
            code_hash: string;
          }
        | undefined;

    assert.ok(
      storedEnrollment,
    );
    assert.notEqual(
      storedEnrollment.code_hash,
      challenge.pairingCode,
    );
    assert.equal(
      storedEnrollment
        .code_hash
        .includes(
          challenge.pairingCode,
        ),
      false,
    );
    pass(
      "one-time pairing code is generated strongly and stored only as a hash",
    );

    const enrolled =
      personalAssistance
        .enrollPersonalAssistanceMobileDevice(
          {
            pairingCode:
              challenge.pairingCode,
            installationId:
              "test-installation-0001",
            displayName:
              "PA-2A Test Phone",
            appVersion:
              "0.1.0",
          },
          new Date(
            "2026-09-06T22:31:00.000Z",
          ),
        );

    assert.equal(
      enrolled
        .device
        .platform,
      "android",
    );
    assert.equal(
      enrolled
        .device
        .status,
      "active",
    );
    assert.ok(
      enrolled.token.length >= 40,
    );

    const storedDevice =
      database.default
        .prepare(
          `
          SELECT token_hash, revoked_at
          FROM personal_assistance_mobile_device
          WHERE device_id = ?
          LIMIT 1
          `,
        )
        .get(
          enrolled
            .device
            .deviceId,
        ) as
        | {
            token_hash: string;
            revoked_at:
              string | null;
          }
        | undefined;

    assert.ok(
      storedDevice,
    );
    assert.notEqual(
      storedDevice.token_hash,
      enrolled.token,
    );
    assert.equal(
      storedDevice
        .token_hash
        .includes(
          enrolled.token,
        ),
      false,
    );
    assert.equal(
      storedDevice.revoked_at,
      null,
    );
    pass(
      "device enrollment returns a one-time bearer credential while SQLite stores only its hash",
    );

    const authenticated =
      personalAssistance
        .authenticatePersonalAssistanceMobileToken(
          enrolled.token,
        );

    assert.equal(
      authenticated.deviceId,
      enrolled
        .device
        .deviceId,
    );
    assert.equal(
      authenticated
        .installationId,
      "test-installation-0001",
    );
    pass(
      "valid mobile bearer credential resolves only to its enrolled device identity",
    );

    await expectFailure(
      () =>
        personalAssistance
          .enrollPersonalAssistanceMobileDevice(
            {
              pairingCode:
                challenge.pairingCode,
              installationId:
                "test-installation-0002",
              displayName:
                "Replay Attempt",
            },
            new Date(
              "2026-09-06T22:32:00.000Z",
            ),
          ),
      /already been consumed/i,
    );
    pass(
      "pairing code is one-time and cannot be replayed",
    );

    const secondChallenge =
      personalAssistance
        .createPersonalAssistanceMobileEnrollment({
          now: new Date(
            "2026-09-06T22:33:00.000Z",
          ),
        });

    await expectFailure(
      () =>
        personalAssistance
          .enrollPersonalAssistanceMobileDevice(
            {
              pairingCode:
                secondChallenge
                  .pairingCode,
              installationId:
                "test-installation-0001",
              displayName:
                "Duplicate Installation",
            },
            new Date(
              "2026-09-06T22:34:00.000Z",
            ),
          ),
      /already enrolled/i,
    );
    pass(
      "same app installation cannot silently mint a second device identity",
    );

    const devices =
      personalAssistance
        .listPersonalAssistanceMobileDevices();

    assert.equal(
      devices.length,
      1,
    );
    assert.equal(
      Object.prototype.hasOwnProperty.call(
        devices[0] ?? {},
        "token",
      ),
      false,
    );
    assert.equal(
      Object.prototype.hasOwnProperty.call(
        devices[0] ?? {},
        "tokenHash",
      ),
      false,
    );
    pass(
      "mobile device listings contain identity metadata but no credential material",
    );

    const revoked =
      personalAssistance
        .revokePersonalAssistanceMobileDevice(
          enrolled
            .device
            .deviceId,
          new Date(
            "2026-09-06T22:35:00.000Z",
          ),
        );

    assert.equal(
      revoked.status,
      "revoked",
    );
    assert.equal(
      revoked.revokedAt,
      "2026-09-06T22:35:00.000Z",
    );

    await expectFailure(
      () =>
        personalAssistance
          .authenticatePersonalAssistanceMobileToken(
            enrolled.token,
          ),
      /revoked/i,
    );
    pass(
      "device revocation immediately invalidates its bearer credential",
    );

    const eventHelperPath =
      path.join(
        process.cwd(),
        "lib",
        "chernobog",
        "personalAssistance",
        "mobile",
        "events.ts",
      );

    const eventHelper =
      await readFile(
        eventHelperPath,
        "utf8",
      );

    assert.equal(
      /pairingCode/.test(
        eventHelper,
      ),
      false,
    );
    assert.equal(
      /\btoken\b/.test(
        eventHelper,
      ),
      false,
    );
    assert.match(
      eventHelper,
      /publishChernobogEventSafely/,
    );
    assert.match(
      eventHelper,
      /sensitive:\s*true/,
    );
    pass(
      "Event Spine observations are sensitive and exclude pairing/token secrets",
    );

    const apiFiles = [
      "app/api/personal-assistance/mobile/enrollment/route.ts",
      "app/api/personal-assistance/mobile/enroll/route.ts",
      "app/api/personal-assistance/mobile/devices/route.ts",
      "app/api/personal-assistance/mobile/session/route.ts",
    ];

    for (
      const relativePath of
      apiFiles
    ) {
      const content =
        await readFile(
          path.join(
            process.cwd(),
            relativePath,
          ),
          "utf8",
        );

      assert.doesNotMatch(
        content,
        /\.executeTool|toolGateway|runTool|grantsPermissions:\s*true/,
      );
    }
    pass(
      "mobile identity APIs have no Tool Gateway or permission-grant path",
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
      /mobileEnrollmentEnabled:\s*true/,
    );

    const notificationCapabilityIsPrePA2C =
      /notificationIngestEnabled:\s*false/.test(
        profileRoute,
      );

    const notificationCapabilityIsPA2CPolicyGated =
      /notificationIngestEnabled:\s*true/.test(
        profileRoute,
      ) &&
      /notificationCaptureConfigured:/.test(
        profileRoute,
      ) &&
      /effective\.profile\.notification\.capture\s*!==\s*"disabled"/.test(
        profileRoute,
      ) &&
      /offlineSpoolUploadEnabled:\s*true/.test(
        profileRoute,
      );

    assert.equal(
      notificationCapabilityIsPrePA2C ||
        notificationCapabilityIsPA2CPolicyGated,
      true,
    );

    assert.match(
      profileRoute,
      /executesTools:\s*false/,
    );
    assert.match(
      profileRoute,
      /grantsPermissions:\s*false/,
    );

    pass(
      "profile diagnostics preserve PA-2A enrollment/security boundaries while allowing later PA-2C notification capability to be exposed separately from effective capture policy",
    );

    console.log(
      "=======================================================",
    );
    console.log(
      "PASS PA-2A Android Device Identity & Enrollment acceptance",
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
