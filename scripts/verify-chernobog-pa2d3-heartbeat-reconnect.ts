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
    "Chernobog PA-2D3 - Heartbeat, Device Health & Reconnect",
  );
  console.log(
    "========================================================",
  );

  const base =
    "mobile/android-companion";

  const requiredFiles = [
    `${base}/app/src/main/java/ai/chernobog/companion/HeartbeatModels.kt`,
    `${base}/app/src/main/java/ai/chernobog/companion/AppVisibilityTracker.kt`,
    `${base}/app/src/main/java/ai/chernobog/companion/HeartbeatLeaseStore.kt`,
    `${base}/app/src/main/java/ai/chernobog/companion/DeviceHealthCollector.kt`,
    `${base}/app/src/main/java/ai/chernobog/companion/HeartbeatStatusStore.kt`,
    `${base}/app/src/main/java/ai/chernobog/companion/HeartbeatTransportClient.kt`,
    `${base}/app/src/main/java/ai/chernobog/companion/HeartbeatWorker.kt`,
    `${base}/app/src/main/java/ai/chernobog/companion/HeartbeatScheduler.kt`,
    `${base}/app/src/main/java/ai/chernobog/companion/ConnectivityReconnectObserver.kt`,
    `${base}/app/src/main/java/ai/chernobog/companion/ChernobogCompanionApplication.kt`,
    `${base}/app/src/main/java/ai/chernobog/companion/DeviceHealthPanel.kt`,
    `${base}/PA-2D3.md`,
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
    "PA-2D3 Android heartbeat/reconnect files exist",
  );

  const appBuild =
    await read(
      `${base}/app/build.gradle.kts`,
    );

  assert.match(
    appBuild,
    /versionCode = 3/,
  );
  assert.match(
    appBuild,
    /versionName = "0\.3\.0"/,
  );
  assert.match(
    appBuild,
    /androidx\.work:work-runtime-ktx:2\.11\.2/,
  );
  assert.match(
    appBuild,
    /androidx\.room:room-runtime:2\.8\.5/,
  );
  assert.doesNotMatch(
    appBuild,
    /org\.jetbrains\.kotlin\.android/,
  );

  pass(
    "PA-2D3 advances the companion to 0.3.0 while preserving the accepted AGP 9/Room/WorkManager stack",
  );

  const manifest =
    await read(
      `${base}/app/src/main/AndroidManifest.xml`,
    );

  assert.match(
    manifest,
    /android\.permission\.ACCESS_NETWORK_STATE/,
  );
  assert.match(
    manifest,
    /android:name="\.ChernobogCompanionApplication"/,
  );
  assert.match(
    manifest,
    /ChernobogNotificationListenerService/,
  );
  assert.match(
    manifest,
    /<service(?:(?!<\/service>)[\s\S])*android:name="\.AlkimiiRosterAccessibilityService"(?:(?!<\/service>)[\s\S])*android:permission="android\.permission\.BIND_ACCESSIBILITY_SERVICE"(?:(?!<\/service>)[\s\S])*<\/service>/,
    "PA-4 registers Accessibility authority only on the explicit Alkimii roster bridge service",
  );

  assert.equal(
    (manifest.match(/android\.permission\.BIND_ACCESSIBILITY_SERVICE/g) ?? []).length,
    1,
    "the Android manifest contains exactly one Accessibility-service binding",
  );
  assert.doesNotMatch(
    manifest,
    /READ_SMS|READ_CALL_LOG|READ_CONTACTS|ACCESS_FINE_LOCATION/,
  );

  pass(
    "PA-2D3 adds only network-state observation and retains the notification-listener safety boundary",
  );

  const collector =
    await read(
      `${base}/app/src/main/java/ai/chernobog/companion/DeviceHealthCollector.kt`,
    );

  for (
    const token of
    [
      "EXTRA_LEVEL",
      "EXTRA_SCALE",
      "EXTRA_STATUS",
      "isPowerSaveMode",
      "TRANSPORT_WIFI",
      "TRANSPORT_CELLULAR",
      "TRANSPORT_ETHERNET",
      "getEnabledListenerPackages",
      "NotificationSpoolDatabase",
      "AppVisibilityTracker",
    ]
  ) {
    assert.match(
      collector,
      new RegExp(token),
    );
  }

  assert.doesNotMatch(
    collector,
    /location|contacts|sms|call_log/i,
  );

  pass(
    "device-health collector reports PA-2B battery, charging, low-power, network, app-state, listener and spool fields without unrelated sensors",
  );

  const models =
    await read(
      `${base}/app/src/main/java/ai/chernobog/companion/HeartbeatModels.kt`,
    );

  for (
    const field of
    [
      "heartbeatId",
      "batteryPercent",
      "charging",
      "lowPowerMode",
      "networkType",
      "appState",
      "notificationListenerEnabled",
      "spoolPendingCount",
      "clientObservedAt",
    ]
  ) {
    assert.match(
      models,
      new RegExp(
        `"${field}"`,
      ),
    );
  }

  pass(
    "heartbeat JSON matches the accepted PA-2B mobile-health contract",
  );

  const lease =
    await read(
      `${base}/app/src/main/java/ai/chernobog/companion/HeartbeatLeaseStore.kt`,
    );

  assert.match(
    lease,
    /pending_heartbeat_id/,
  );
  assert.match(
    lease,
    /UUID\.randomUUID\(\)/,
  );
  assert.match(
    lease,
    /fun acquire/,
  );
  assert.match(
    lease,
    /fun complete/,
  );

  pass(
    "heartbeat identifier is durably leased across retries and cleared only after completion",
  );

  const transport =
    await read(
      `${base}/app/src/main/java/ai/chernobog/companion/HeartbeatTransportClient.kt`,
    );

  assert.match(
    transport,
    /\/api\/personal-assistance\/mobile\/heartbeat/,
  );
  assert.match(
    transport,
    /Authorization/,
  );
  assert.match(
    transport,
    /Bearer \$token/,
  );
  assert.match(
    transport,
    /status == 429/,
  );
  assert.match(
    transport,
    /status >= 500/,
  );
  assert.doesNotMatch(
    transport,
    /Log\.[vdiew]|println\(/,
  );

  pass(
    "heartbeat transport authenticates against PA-2B, retries transient failures and does not log credentials/health payloads",
  );

  const worker =
    await read(
      `${base}/app/src/main/java/ai/chernobog/companion/HeartbeatWorker.kt`,
    );

  const collectPosition =
    worker.indexOf(
      "DeviceHealthCollector",
    );

  const sendPosition =
    worker.indexOf(
      "HeartbeatTransportClient",
    );

  const completePosition =
    worker.indexOf(
      "leaseStore.complete",
    );

  assert.ok(
    collectPosition >= 0,
  );
  assert.ok(
    sendPosition >
      collectPosition,
  );
  assert.ok(
    completePosition >
      sendPosition,
  );
  assert.match(
    worker,
    /Result\.retry/,
  );
  assert.match(
    worker,
    /NotificationSyncScheduler/,
  );
  assert.doesNotMatch(
    worker,
    /toolExecution|permissionGranting/,
  );

  pass(
    "heartbeat worker collects health, posts it, preserves retry idempotence and couples successful recovery to spool reconciliation",
  );

  const scheduler =
    await read(
      `${base}/app/src/main/java/ai/chernobog/companion/HeartbeatScheduler.kt`,
    );

  assert.match(
    scheduler,
    /PeriodicWorkRequestBuilder/,
  );
  assert.match(
    scheduler,
    /15,[\s\S]*TimeUnit\.MINUTES/,
  );
  assert.match(
    scheduler,
    /NetworkType\.CONNECTED/,
  );
  assert.match(
    scheduler,
    /enqueueUniquePeriodicWork/,
  );
  assert.match(
    scheduler,
    /enqueueUniqueWork/,
  );
  assert.match(
    scheduler,
    /BackoffPolicy\.EXPONENTIAL/,
  );

  pass(
    "WorkManager schedules network-gated periodic and immediate heartbeats with exponential retry backoff",
  );

  const reconnect =
    await read(
      `${base}/app/src/main/java/ai/chernobog/companion/ConnectivityReconnectObserver.kt`,
    );

  assert.match(
    reconnect,
    /registerDefaultNetworkCallback/,
  );
  assert.match(
    reconnect,
    /onAvailable/,
  );
  assert.match(
    reconnect,
    /HeartbeatScheduler/,
  );
  assert.match(
    reconnect,
    /NotificationSyncScheduler/,
  );

  pass(
    "live reconnect callback immediately schedules both health heartbeat and notification-spool recovery",
  );

  const application =
    await read(
      `${base}/app/src/main/java/ai/chernobog/companion/ChernobogCompanionApplication.kt`,
    );

  assert.match(
    application,
    /AppVisibilityTracker/,
  );
  assert.match(
    application,
    /ConnectivityReconnectObserver/,
  );
  assert.match(
    application,
    /ensurePeriodic/,
  );
  assert.match(
    application,
    /enqueueImmediate/,
  );
  assert.match(
    application,
    /savedDeviceId/,
  );

  pass(
    "enrolled companion restores heartbeat/reconnect scheduling whenever Android recreates the app process",
  );

  const viewModel =
    await read(
      `${base}/app/src/main/java/ai/chernobog/companion/CompanionViewModel.kt`,
    );

  assert.match(
    viewModel,
    /session[\s\S]*capabilities[\s\S]*heartbeat/,
  );
  assert.match(
    viewModel,
    /HeartbeatScheduler[\s\S]*ensurePeriodic/,
  );
  assert.match(
    viewModel,
    /HeartbeatScheduler[\s\S]*enqueueImmediate/,
  );

  const screen =
    await read(
      `${base}/app/src/main/java/ai/chernobog/companion/CompanionScreen.kt`,
    );

  const healthPanel =
    await read(
      `${base}/app/src/main/java/ai/chernobog/companion/DeviceHealthPanel.kt`,
    );

  assert.match(
    screen,
    /DeviceHealthPanel\(\)/,
  );
  assert.match(
    healthPanel,
    /HEARTBEAT \+ SYNC NOW/,
  );
  assert.match(
    healthPanel,
    /BATTERY/,
  );
  assert.match(
    healthPanel,
    /NETWORK/,
  );
  assert.match(
    healthPanel,
    /LAST HEARTBEAT/,
  );

  pass(
    "companion exposes live device-health state and a manual heartbeat/recovery control",
  );

  const d2Verifier =
    await read(
      "scripts/verify-chernobog-pa2d2-notification-listener-spool.ts",
    );

  assert.match(
    d2Verifier,
    /versionCodeMatch/,
  );
  assert.match(
    d2Verifier,
    /versionCode >= 2/,
  );
  assert.match(
    d2Verifier,
    /versionMinor >= 2/,
  );

  pass(
    "PA-2D2 historical verifier was migrated to accept later companion versions without weakening its minimum-version contract",
  );

  const heartbeatRoute =
    await read(
      "app/api/personal-assistance/mobile/heartbeat/route.ts",
    );

  assert.match(
    heartbeatRoute,
    /recordPersonalAssistanceMobileHeartbeat/,
  );
  assert.match(
    heartbeatRoute,
    /toolExecution:\s*false/,
  );
  assert.match(
    heartbeatRoute,
    /permissionGranting:\s*false/,
  );

  pass(
    "PA-2D3 remains bound to the accepted PA-2B server authority with tool/permission boundaries disabled",
  );

  console.log(
    "========================================================",
  );
  console.log(
    "PASS PA-2D3 Heartbeat, Device Health & Reconnect acceptance",
  );
}

void main().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);
