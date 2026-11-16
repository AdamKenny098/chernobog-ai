import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const android = "mobile/android-companion/app/src/main/java/ai/chernobog/companion";
function read(relative: string): string {
  return readFileSync(join(root, relative), "utf8");
}
function pass(label: string, check: boolean): void {
  assert.ok(check, label);
  console.log(`PASS ${label}`);
}
const surface = read(`${android}/MobileReliabilityPanel.kt`);
const state = read(`${android}/MobileReliabilityStatus.kt`);
const tracker = read(`${android}/AlkimiiServiceBindingTracker.kt`);
const app = read(`${android}/CompanionScreen.kt`);
const alkimii = read(`${android}/AlkimiiRosterAccessibilityService.kt`);
pass("reliability view integrated into existing companion, no second app", app.includes("MobileReliabilityPanel()"));
pass("heartbeat age uses persisted success, with explicit stale and failure states",
  state.includes("HeartbeatStatusStore(application).read()") && state.includes("lastSuccessAt") &&
  state.includes("HEARTBEAT_STALE_MINUTES = 45L") && state.includes('"DEGRADED"') && state.includes('"STALE"'));
pass("notification listener, post permission and battery exemption are read-only observations",
  state.includes("getEnabledListenerPackages") && state.includes("areNotificationsEnabled()") &&
  state.includes("isIgnoringBatteryOptimizations") && !state.includes("requestPermissions("));
pass("accessibility service is checked by exact class/package, not broad system accessibility flag",
  state.includes("getEnabledAccessibilityServiceList") && state.includes("AlkimiiRosterAccessibilityService::class.java.name") &&
  state.includes("application.packageName"));
pass("binding signal records actual service connect/unbind/destroy with process-safe default",
  alkimii.includes("AlkimiiServiceBindingTracker.markConnected(this)") &&
  (alkimii.match(/AlkimiiServiceBindingTracker\.markDisconnected\(this\)/g) ?? []).length === 2 &&
  tracker.includes("@Volatile") && tracker.includes("var connected: Boolean = false"));
pass("roster last accepted capture is observed without initiating background accessibility capture",
  state.includes('"chernobog_alkimii_roster_v2"') && state.includes('"last_upload_at"') &&
  !surface.includes("performGlobalAction") && !surface.includes("dispatchGesture"));
pass("owner-directed recovery settings only; no silent permissions or enrollment reset",
  surface.includes("Settings.ACTION_ACCESSIBILITY_SETTINGS") &&
  surface.includes("Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS") &&
  surface.includes("Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS") &&
  !surface.includes("clearEnrollment(") && !surface.includes("savedToken()") &&
  !surface.includes("ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS"));
pass("panel explains truthful limits of VPN, force-stop, and binding signals",
  surface.includes("Android force-stop requires manual app relaunch") &&
  surface.includes("VPN reachability cannot be confirmed") &&
  surface.includes("does not guarantee an active service binding"));
pass("recovery retains existing WorkManager and sync architecture",
  surface.includes("HeartbeatScheduler.enqueueImmediate") &&
  surface.includes("NotificationSyncScheduler.enqueueNow") &&
  surface.includes("ReminderDeliveryScheduler.enqueueNow"));
console.log("OH-6C-R1 MOBILE RELIABILITY DIAGNOSTICS: PASS");
