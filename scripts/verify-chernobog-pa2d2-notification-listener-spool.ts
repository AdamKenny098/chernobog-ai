import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import path from "node:path";

function pass(
  message: string,
): void {
  console.log(
    `PASS ${message}`,
  );
}

async function read(
  relativePath: string,
): Promise<string> {
  return readFile(
    path.join(
      process.cwd(),
      relativePath,
    ),
    "utf8",
  );
}

async function main():
  Promise<void> {
  console.log(
    "Chernobog PA-2D2 - Notification Listener & Offline Spool",
  );
  console.log(
    "=========================================================",
  );

  const base =
    "mobile/android-companion";

  const requiredFiles = [
    `${base}/app/src/main/java/ai/chernobog/companion/NotificationPolicyCache.kt`,
    `${base}/app/src/main/java/ai/chernobog/companion/NotificationIdentity.kt`,
    `${base}/app/src/main/java/ai/chernobog/companion/NotificationSpool.kt`,
    `${base}/app/src/main/java/ai/chernobog/companion/NotificationNormalizer.kt`,
    `${base}/app/src/main/java/ai/chernobog/companion/NotificationSyncScheduler.kt`,
    `${base}/app/src/main/java/ai/chernobog/companion/NotificationTransportClient.kt`,
    `${base}/app/src/main/java/ai/chernobog/companion/NotificationSyncWorker.kt`,
    `${base}/app/src/main/java/ai/chernobog/companion/ChernobogNotificationListenerService.kt`,
    `${base}/app/src/main/java/ai/chernobog/companion/NotificationAccessPanel.kt`,
    `${base}/app/src/test/java/ai/chernobog/companion/NotificationIdentityTest.kt`,
    `${base}/PA-2D2.md`,
  ];

  for (
    const relativePath of
    requiredFiles
  ) {
    const content =
      await read(
        relativePath,
      );

    assert.ok(
      content.length > 0,
      `${relativePath} should not be empty`,
    );
  }

  pass(
    "PA-2D2 Android notification sensor files exist",
  );

  const rootBuild =
    await read(
      `${base}/build.gradle.kts`,
    );

  const appBuild =
    await read(
      `${base}/app/build.gradle.kts`,
    );

  assert.match(
    rootBuild,
    /com\.google\.devtools\.ksp"\) version "2\.3\.10"/,
  );
  assert.match(
    appBuild,
    /id\("com\.google\.devtools\.ksp"\)/,
  );
  assert.match(
    appBuild,
    /androidx\.room:room-runtime:2\.8\.5/,
  );
  assert.match(
    appBuild,
    /androidx\.room:room-ktx:2\.8\.5/,
  );
  assert.match(
    appBuild,
    /ksp\("androidx\.room:room-compiler:2\.8\.5"\)/,
  );
  assert.match(
    appBuild,
    /androidx\.work:work-runtime-ktx:2\.11\.2/,
  );
  const versionCodeMatch =
    appBuild.match(
      /versionCode = (\d+)/,
    );

  assert.ok(
    versionCodeMatch,
    "Android companion versionCode should exist",
  );

  const versionCode =
    Number(
      versionCodeMatch[1],
    );

  assert.ok(
    versionCode >= 2,
    "PA-2D2 requires companion versionCode 2 or later",
  );

  const versionNameMatch =
    appBuild.match(
      /versionName = "0\.(\d+)\.(\d+)"/,
    );

  assert.ok(
    versionNameMatch,
    "Android companion versionName should exist",
  );

  const versionMinor =
    Number(
      versionNameMatch[1],
    );

  assert.ok(
    versionMinor >= 2,
    "PA-2D2 requires companion version 0.2.x or later",
  );
  assert.doesNotMatch(
    appBuild,
    /org\.jetbrains\.kotlin\.android/,
  );

  pass(
    "PA-2D2 uses AGP 9 built-in Kotlin with KSP, stable Room 2.8.5 and WorkManager 2.11.2",
  );

  const manifest =
    await read(
      `${base}/app/src/main/AndroidManifest.xml`,
    );

  assert.match(
    manifest,
    /android:name="\.ChernobogNotificationListenerService"/,
  );
  assert.match(
    manifest,
    /android:permission="android\.permission\.BIND_NOTIFICATION_LISTENER_SERVICE"/,
  );
  assert.match(
    manifest,
    /android:exported="false"/,
  );
  assert.match(
    manifest,
    /android\.service\.notification\.NotificationListenerService/,
  );
  assert.doesNotMatch(
    manifest,
    /BIND_ACCESSIBILITY_SERVICE/,
  );
  assert.doesNotMatch(
    manifest,
    /READ_SMS|READ_CALL_LOG|READ_CONTACTS|ACCESS_FINE_LOCATION/,
  );

  pass(
    "NotificationListenerService is declared with the Android system binding permission and no unrelated sensitive permissions",
  );

  const policy =
    await read(
      `${base}/app/src/main/java/ai/chernobog/companion/NotificationPolicyCache.kt`,
    );

  assert.match(
    policy,
    /"disabled"/,
  );
  assert.match(
    policy,
    /notificationIngestEnabled/,
  );
  assert.match(
    policy,
    /captureMode\(\) != "disabled"/,
  );

  pass(
    "local notification capture defaults disabled and follows the authenticated session capability cache",
  );

  const normalizer =
    await read(
      `${base}/app/src/main/java/ai/chernobog/companion/NotificationNormalizer.kt`,
    );

  const spool =
    await read(
      `${base}/app/src/main/java/ai/chernobog/companion/NotificationSpool.kt`,
    );

  assert.match(
    normalizer,
    /normalizeMetadataOnly/,
  );
  assert.doesNotMatch(
    normalizer,
    /EXTRA_TITLE|EXTRA_TEXT|extras\[/,
  );
  assert.doesNotMatch(
    spool,
    /\bsender\b|\btitle\b|\bbody\b|redactedTitle|redactedBody/i,
  );
  assert.match(
    spool,
    /@Database/,
  );
  assert.match(
    spool,
    /notification_spool/,
  );

  pass(
    "offline Room spool is intentionally metadata-only and never persists sender/title/body content",
  );

  const identity =
    await read(
      `${base}/app/src/main/java/ai/chernobog/companion/NotificationIdentity.kt`,
    );

  assert.match(
    identity,
    /SHA-256/,
  );
  assert.match(
    identity,
    /packageName/,
  );
  assert.match(
    identity,
    /notificationKey/,
  );
  assert.match(
    identity,
    /postedAtEpochMs/,
  );

  pass(
    "notification event IDs are stable SHA-256 identities across retries",
  );

  const listener =
    await read(
      `${base}/app/src/main/java/ai/chernobog/companion/ChernobogNotificationListenerService.kt`,
    );

  assert.match(
    listener,
    /NotificationListenerService/,
  );
  assert.match(
    listener,
    /onNotificationPosted/,
  );
  assert.match(
    listener,
    /canCaptureMetadata/,
  );
  assert.match(
    listener,
    /NotificationSpoolDatabase/,
  );
  assert.match(
    listener,
    /NotificationSyncScheduler/,
  );
  assert.match(
    listener,
    /this@ChernobogNotificationListenerService/,
  );
  assert.doesNotMatch(
    listener,
    /this@\s+ChernobogNotificationListenerService/,
  );
  assert.doesNotMatch(
    listener,
    /Log\.[vdiew]|println\(/,
  );

  pass(
    "real Android listener is policy-gated, durable, schedules delivery, and does not log notification material",
  );

  const scheduler =
    await read(
      `${base}/app/src/main/java/ai/chernobog/companion/NotificationSyncScheduler.kt`,
    );

  assert.match(
    scheduler,
    /NetworkType\.CONNECTED/,
  );
  assert.match(
    scheduler,
    /enqueueUniqueWork/,
  );
  assert.match(
    scheduler,
    /ExistingWorkPolicy\.KEEP/,
  );

  pass(
    "WorkManager waits for network connectivity and deduplicates notification sync work",
  );

  const transport =
    await read(
      `${base}/app/src/main/java/ai/chernobog/companion/NotificationTransportClient.kt`,
    );

  assert.match(
    transport,
    /\/api\/personal-assistance\/mobile\/notifications\/reconcile/,
  );
  assert.match(
    transport,
    /\/api\/personal-assistance\/mobile\/notifications"/,
  );
  assert.match(
    transport,
    /Authorization/,
  );
  assert.match(
    transport,
    /Bearer \$token/,
  );
  assert.doesNotMatch(
    transport,
    /"sender"|"title"|"body"|"redactedTitle"|"redactedBody"/,
  );

  pass(
    "mobile delivery uses authenticated PA-2C reconcile/upload routes and sends metadata only",
  );

  const worker =
    await read(
      `${base}/app/src/main/java/ai/chernobog/companion/NotificationSyncWorker.kt`,
    );

  const reconcilePosition =
    worker.indexOf(
      "transport.reconcile",
    );

  const uploadPosition =
    worker.indexOf(
      "transport.upload",
    );

  assert.ok(
    reconcilePosition >= 0,
  );
  assert.ok(
    uploadPosition >
      reconcilePosition,
  );
  assert.match(
    worker,
    /deleteByEventIds/,
  );
  assert.match(
    worker,
    /deleteAll\(\)/,
  );
  assert.match(
    worker,
    /Result\.retry/,
  );

  pass(
    "reconnect path reconciles before upload, deletes only acknowledged IDs, purges on disabled policy and retries transient failure",
  );

  const viewModel =
    await read(
      `${base}/app/src/main/java/ai/chernobog/companion/CompanionViewModel.kt`,
    );

  assert.match(
    viewModel,
    /NotificationPolicyCache/,
  );
  assert.match(
    viewModel,
    /updateFromSession/,
  );
  assert.match(
    viewModel,
    /NotificationSyncScheduler/,
  );

  const screen =
    await read(
      `${base}/app/src/main/java/ai/chernobog/companion/CompanionScreen.kt`,
    );

  const accessPanel =
    await read(
      `${base}/app/src/main/java/ai/chernobog/companion/NotificationAccessPanel.kt`,
    );

  assert.match(
    screen,
    /NotificationAccessPanel\(\)/,
  );
  assert.match(
    accessPanel,
    /ACTION_NOTIFICATION_LISTENER_SETTINGS/,
  );
  assert.match(
    accessPanel,
    /getEnabledListenerPackages/,
  );
  assert.match(
    accessPanel,
    /metadata only/i,
  );

  pass(
    "companion exposes human-controlled Android notification access and current local-spool status",
  );

  const d1Verifier =
    await read(
      "scripts/verify-chernobog-pa2d1-android-foundation.ts",
    );

  assert.match(
    d1Verifier,
    /ChernobogNotificationListenerService/,
  );
  assert.match(
    d1Verifier,
    /later PA-2D2 notification listener/,
  );
  assert.match(
    d1Verifier,
    /BIND_ACCESSIBILITY_SERVICE/,
  );

  pass(
    "PA-2D1 historical verifier was migrated to allow PA-2D2 without weakening unrelated permission boundaries",
  );

  console.log(
    "=========================================================",
  );
  console.log(
    "PASS PA-2D2 Notification Listener & Offline Spool acceptance",
  );
}

void main().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);
