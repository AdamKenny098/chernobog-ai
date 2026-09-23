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
    "Chernobog PA-1B - Personal Assistance Profile Core",
  );
  console.log(
    "===================================================",
  );

  const tempRoot =
    await mkdtemp(
      path.join(
        os.tmpdir(),
        "chernobog-pa1b-",
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

    const initial =
      personalAssistance
        .getPersonalAssistanceEffectiveProfile();

    assert.equal(
      initial.profile.revision,
      0,
    );
    assert.equal(
      initial.profile
        .proactiveAssistanceEnabled,
      false,
    );
    assert.equal(
      initial.profile
        .interruptionPreference,
      "critical-only",
    );
    assert.equal(
      initial.profile
        .notification.capture,
      "disabled",
    );
    assert.equal(
      initial.profile
        .notification.storeBodies,
      false,
    );
    assert.equal(
      initial.profile
        .communication
        .trackResponsibilities,
      false,
    );
    assert.equal(
      initial.profile
        .privacy
        .storeSenderIdentity,
      false,
    );
    assert.deepEqual(
      initial.profile
        .explicitFields,
      [],
    );
    assert.equal(
      initial.origins[
        "notification.capture"
      ],
      "system-default",
    );
    pass(
      "fresh profile defaults are conservative and do not invent explicit user preferences",
    );

    const patched =
      personalAssistance
        .patchPersonalAssistanceProfile(
          {
            locale:
              "en-IE",
            timeZone:
              "Europe/Dublin",
            proactiveAssistanceEnabled:
              true,
            interruptionPreference:
              "important",
            notification: {
              capture:
                "metadata-only",
              retentionDays:
                14,
            },
            communication: {
              trackResponsibilities:
                true,
              defaultResponseWindowHours:
                24,
            },
            schedule: {
              staleAfterMinutes:
                180,
            },
            reason:
              "PA-1B acceptance",
          },
          new Date(
            "2026-09-06T22:00:00.000Z",
          ),
        );

    assert.equal(
      patched.revision,
      1,
    );
    assert.equal(
      patched.locale,
      "en-IE",
    );
    assert.equal(
      patched.timeZone,
      "Europe/Dublin",
    );
    assert.equal(
      patched
        .proactiveAssistanceEnabled,
      true,
    );
    assert.equal(
      patched
        .notification.capture,
      "metadata-only",
    );
    assert.equal(
      patched
        .notification.storeBodies,
      false,
    );
    assert.equal(
      patched
        .communication
        .trackResponsibilities,
      true,
    );
    assert.equal(
      patched.reason,
      "PA-1B acceptance",
    );
    pass(
      "explicit user profile settings persist without silently enabling unrelated privacy fields",
    );

    const effective =
      personalAssistance
        .getPersonalAssistanceEffectiveProfile();

    assert.equal(
      effective.origins.locale,
      "explicit-user",
    );
    assert.equal(
      effective.origins[
        "notification.capture"
      ],
      "explicit-user",
    );
    assert.equal(
      effective.origins[
        "notification.storeBodies"
      ],
      "system-default",
    );
    assert.equal(
      effective.origins[
        "privacy.storeSenderIdentity"
      ],
      "system-default",
    );
    pass(
      "effective profile distinguishes explicit user settings from system defaults per field",
    );

    const second =
      personalAssistance
        .patchPersonalAssistanceProfile(
          {
            notification: {
              redactSensitiveContent:
                true,
            },
            privacy: {
              storeDeviceHealthHistory:
                true,
            },
          },
          new Date(
            "2026-09-06T22:01:00.000Z",
          ),
        );

    assert.equal(
      second.revision,
      2,
    );
    assert.equal(
      second.locale,
      "en-IE",
    );
    assert.equal(
      second
        .notification.capture,
      "metadata-only",
    );
    assert.equal(
      second
        .privacy
        .storeDeviceHealthHistory,
      true,
    );
    pass(
      "partial profile patches preserve unrelated settings",
    );

    const attentionBefore =
      personalAssistance
        .setPersonalAttention(
          {
            state:
              "busy",
            reason:
              "PA-1B composition",
          },
          new Date(
            "2026-09-06T22:02:00.000Z",
          ),
        );

    assert.equal(
      attentionBefore.state,
      "busy",
    );

    const profileAfterAttention =
      personalAssistance
        .getPersonalAssistanceProfile();

    assert.equal(
      profileAfterAttention
        .revision,
      2,
    );
    assert.equal(
      profileAfterAttention
        .proactiveAssistanceEnabled,
      true,
    );
    pass(
      "PA-1B profile and PA-1A attention remain separate authorities that compose without mutating each other",
    );

    const audit =
      personalAssistance
        .listPersonalAssistanceProfileAudit(
          10,
        );

    assert.equal(
      audit.length,
      2,
    );
    assert.equal(
      audit[0]
        ?.action,
      "patch",
    );
    assert.equal(
      audit[0]
        ?.revision,
      2,
    );
    assert.deepEqual(
      audit[0]
        ?.changedFields,
      [
        "notification.redactSensitiveContent",
        "privacy.storeDeviceHealthHistory",
      ],
    );
    assert.equal(
      audit[1]
        ?.revision,
      1,
    );
    pass(
      "profile mutations produce inspectable revisioned audit records with changed-field lists",
    );

    const reset =
      personalAssistance
        .resetPersonalAssistanceProfile(
          "PA-1B acceptance reset",
          new Date(
            "2026-09-06T22:03:00.000Z",
          ),
        );

    assert.equal(
      reset.revision,
      3,
    );
    assert.equal(
      reset
        .proactiveAssistanceEnabled,
      false,
    );
    assert.equal(
      reset
        .notification.capture,
      "disabled",
    );
    assert.equal(
      reset
        .privacy
        .storeDeviceHealthHistory,
      false,
    );
    assert.deepEqual(
      reset.explicitFields,
      [],
    );
    pass(
      "profile reset returns to conservative defaults while preserving revision history",
    );

    assert.equal(
      personalAssistance
        .getPersonalAttentionSnapshot()
        .state,
      "busy",
    );
    pass(
      "profile reset does not erase the independent PA-1A attention authority",
    );

    const routePath =
      path.join(
        process.cwd(),
        "app",
        "api",
        "personal-assistance",
        "profile",
        "route.ts",
      );
    const route =
      await readFile(
        routePath,
        "utf8",
      );

    assert.match(
      route,
      /export async function GET/,
    );
    assert.match(
      route,
      /export async function PATCH/,
    );
    assert.match(
      route,
      /export async function DELETE/,
    );
    assert.doesNotMatch(
      route,
      /\.executeTool|toolGateway|runTool|allowedToExecute\s*:\s*true/,
    );
    assert.match(
      route,
      /grantsPermissions:\s*false/,
    );
    assert.match(
      route,
      /inferredPreferencesEnabled:\s*false/,
    );
    pass(
      "profile API exposes explicit read/update/reset surfaces without tool, permission, or inferred-preference authority",
    );

    const profileCopy =
      personalAssistance
        .getPersonalAssistanceProfile();

    profileCopy
      .notification.capture =
      "full-content";

    assert.equal(
      personalAssistance
        .getPersonalAssistanceProfile()
        .notification.capture,
      "disabled",
    );
    pass(
      "profile snapshots are defensive values rather than mutable shared authority state",
    );

    console.log(
      "===================================================",
    );
    console.log(
      "PASS PA-1B Personal Assistance Profile Core acceptance",
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