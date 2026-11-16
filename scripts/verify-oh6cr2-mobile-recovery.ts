import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const prefix = "mobile/android-companion/app/src/main/java/ai/chernobog/companion/";
const read = (p: string): string => readFileSync(join(root, p), "utf8");
const manifest = read("mobile/android-companion/app/src/main/AndroidManifest.xml");
const receiver = read(prefix + "MobileRecoveryReceiver.kt");
const coordinator = read(prefix + "MobileRecoveryCoordinator.kt");
const app = read(prefix + "ChernobogCompanionApplication.kt");
const observer = read(prefix + "ConnectivityReconnectObserver.kt");
const panel = read(prefix + "MobileReliabilityPanel.kt");
const sync = read(prefix + "NotificationSyncWorker.kt");
const reminder = read(prefix + "ReminderDeliveryScheduler.kt");

function pass(label: string, ok: boolean) {
  assert.ok(ok, label);
  console.log(`PASS ${label}`);
}
pass("boot permission and non-exported receiver for boot + package replacement",
  manifest.includes('android.permission.RECEIVE_BOOT_COMPLETED') &&
  /android:name="\.MobileRecoveryReceiver"[\s\S]*?android:exported="false"[\s\S]*?android\.intent\.action\.BOOT_COMPLETED[\s\S]*?android\.intent\.action\.MY_PACKAGE_REPLACED/.test(manifest));
pass("receiver accepts only system boot/package-update intents and enqueues work",
  receiver.includes("Intent.ACTION_BOOT_COMPLETED") &&
  receiver.includes("Intent.ACTION_MY_PACKAGE_REPLACED") &&
  receiver.includes("else -> return") &&
  receiver.includes("MobileRecoveryCoordinator.enqueue") &&
  !receiver.includes("startActivity(") && !receiver.includes("startForegroundService("));
pass("app process start uses existing coordinator and paired-device guard",
  app.includes("MobileRecoveryCoordinator.enqueue") &&
  app.includes("MobileRecoveryCoordinator.Cause.APP_START") &&
  app.includes("savedDeviceId()"));
pass("network handoffs trigger on available and validated routes, not only app launch",
  observer.includes("onAvailable(") && observer.includes("onCapabilitiesChanged(") &&
  observer.includes("NET_CAPABILITY_VALIDATED") &&
  observer.includes("NETWORK_AVAILABLE") && observer.includes("NETWORK_VALIDATED"));
pass("recovery is bounded and uses existing idempotent WorkManager pipelines",
  coordinator.includes("@Synchronized") &&
  coordinator.includes("NETWORK_COOLDOWN_MS") &&
  coordinator.includes("savedDeviceId()") &&
  coordinator.includes("HeartbeatScheduler.ensurePeriodic") &&
  coordinator.includes("ReminderDeliveryScheduler.ensurePeriodic") &&
  coordinator.includes("HeartbeatScheduler.enqueueImmediate") &&
  coordinator.includes("NotificationSyncScheduler.enqueueNow") &&
  coordinator.includes("ReminderDeliveryScheduler.enqueueNow") &&
  reminder.includes("ExistingWorkPolicy.KEEP"));
pass("offline spool still reconciles and uploads existing event IDs",
  sync.includes("transport.reconcile(") &&
  sync.includes("transport.upload(") &&
  sync.includes("acknowledgedEventIds") &&
  sync.includes("Result.retry()"));
pass("recovery history is diagnostic only and visible from R1 panel",
  coordinator.includes('"chernobog_mobile_recovery_v1"') &&
  coordinator.includes("fun snapshot(") &&
  coordinator.includes("lastBootAt") && coordinator.includes("lastNetworkAt") &&
  panel.includes("MobileRecoveryCoordinator.snapshot(context)") &&
  panel.includes("RECOVERY LAST QUEUED") &&
  panel.includes("LAST BOOT RECOVERY"));
pass("no silent permission grants, credential replacement or modified DND policy",
  !coordinator.includes("savedToken()") &&
  !coordinator.includes("clearEnrollment(") &&
  !coordinator.includes("requestPermissions(") &&
  !receiver.includes("requestPermissions(") &&
  !coordinator.includes("overrideDoNotDisturb") &&
  !panel.includes("ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS"));
console.log("OH-6C-R2 REBOOT & NETWORK RECOVERY: PASS");
