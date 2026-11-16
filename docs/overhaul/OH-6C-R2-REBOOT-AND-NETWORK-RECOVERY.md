# OH-6C-R2 — Mobile reboot and network recovery (Stage 2)

**Status at installation:** source package; requires Kotlin compile, APK install and live device acceptance. Continues OH-6C-R1; does not close OH-6C-R or Issue #5.

## Scope
- Register explicit non-exported Android `MobileRecoveryReceiver` for `BOOT_COMPLETED` and `MY_PACKAGE_REPLACED`; request only `RECEIVE_BOOT_COMPLETED`. The receiver enqueues WorkManager jobs, never starts an Activity, service, HTTP call, or grants permissions.
- Supplement, rather than replace, existing app startup and default network `onAvailable` / `onCapabilitiesChanged` (internet validated) events through one coordinator. The coordinator checks existing enrollment identity, keeps existing periodic heartbeat/reminder work, and schedules immediate heartbeat, notification-spool sync, and reminder retrieval using existing unique WorkManager policies. It does **not** bypass server gates, DND, user preferences or delivery receipts.
- Persist bounded, diagnostic-only recovery timestamps/reasons in app-private preferences; throttle repeated network notifications per cause (20 seconds). A queued trigger means **work was scheduled**, not that the server was reachable or the spool was delivered.
- Expose last queued boot/network reason and timestamp within R1 Mobile Reliability details; do not display or log endpoints, tokens, notification bodies or roster data.

## Existing safety boundaries
- Encrypted enrollment remains under `SecureCredentialStore`; no credential reset, re-pairing or changed transport access.
- Offline notification events remain in existing Room spool, drained by the established `NotificationSyncWorker` reconcile/upload/ack logic, and reminders still use the OH-6G delivery outbox. This stage does not introduce any parallel queue or promise lossless results if capture was disabled or unavailable.
- WorkManager background jobs are **best effort**; `15-minute` periodic work is not exact scheduling. A force-stopped Android package cannot automatically restart until the user launches it (platform limitation).
- Android `BOOT_COMPLETED` is delivered after the user unlocks the phone. Direct boot (credential-encrypted store unavailable) is intentionally not supported.
- Network validated indicates Android believes the default network has internet; it does **not** guarantee that Tailscale Serve / desktop Chernobog is reachable. Worker retry/backoff handles temporary failure.
- Phone reboot, Wi-Fi/LTE transitions, Tailscale outage and Doze must be validated **on hardware**. Automated source verification and Kotlin compilation do not prove them.

## Installation / regression
The R2 installer preflights OH-6C-R1 presence, checks each payload SHA256, patches only `AndroidManifest.xml`, `ChernobogCompanionApplication.kt`, `ConnectivityReconnectObserver.kt`, and `MobileReliabilityPanel.kt`, and backs up originals. It runs R2 and R1 checks, PA2d3 and PA4 verification, OH6G3B regression, `tsc --noEmit`, and `:app:compileDebugKotlin`. If a step fails, four files are restored and only newly added R2 payload files removed. No SQLite, paired credentials, spool or preference data is changed by install.

## Live acceptance (with phone connected, current APK built and installed)
1. Open **Chernobog Companion → Mobile Reliability → Recovery Details**; verify no crashes. Launch app after installation; find `RECOVERY SOURCE: APP-START` and `RECOVERY LAST QUEUED` timestamp (could be followed by a network event).
2. Run `adb logcat -c`; open companion; `adb logcat -d -v time -s 'ChernobogRecovery:*' 'AndroidRuntime:E' '*:S'`. Expect `stage=workers-enqueued cause=app-start` and/or a network trigger, not bearer tokens.
3. Disable Wi-Fi briefly with cellular data enabled; restore Wi-Fi or switch back to cellular while Tailscale is enabled. Refresh recovery details. Expect an updated `network-available` or `network-validated` enqueue; no new pairing. Check heartbeat and any existing local spool drain after connectivity returns.
4. Reboot the phone normally. **After unlocking**, wait for Android to reschedule and inspect recovery details/logs. Expect `boot-completed` recovery if Android delivers the broadcast, with the existing paired device intact. Reboot validation is mandatory for R2 acceptance.
5. If available, test offline spool with user-authorized notification capture and a benign test notification: create one event while offline, then reconnect and confirm acknowledged exactly once via existing PA notification health; do not enable private notification capture just to satisfy this test.
6. Verify reminder DND: existing absolute Chernobog DND continues to defer critical reminders; no changes to preferences or Android permission grants.
7. Distinguish physical network recovery from a Tailscale app-only outage; Tailscale reconnect without default-network callback may rely on WorkManager retry/periodic heartbeat, not instantaneous events. Record any lag for R3.

## After R2
OH-6C-R3 Windows host startup, Tailscale Serve readiness and end-to-end reboot acceptance. Keep GitHub Issue #5 open until those pass. Do not commit Android build artifacts, runtime PA data, or device credentials.
