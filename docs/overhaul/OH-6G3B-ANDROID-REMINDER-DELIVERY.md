# OH-6G3B — Android Reminder Delivery (Device-Pull Foundation)

## Scope

The currently paired Chernobog Android Companion can **pull due reminders** over
existing Tailscale HTTPS with its stored device bearer token. The server makes
**one reservation at a time** using the existing OH-6G2 SQLite outbox. No
public push endpoint, second notification-capture service, new identity system,
or additional runtime database is introduced.

Device requests:

1. `POST /api/personal-assistance/mobile/reminders/claim` — authenticate
   device, check due reminder, proactive-assistance permission, attention state,
   priority threshold; reserve using OH-6G2 and bind reservation to that device.
2. `POST /api/personal-assistance/mobile/reminders/authorize` — authenticate
   same device, fresh policy recheck, cancellation and lease check.
3. **Android** checks both its notification permission and the OS DND filter,
   displays through `NotificationManager.notify` using a **stable reminder ID**
   to update rather than duplicate alerts.
4. `POST /api/personal-assistance/mobile/reminders/ack` — authenticated same
   device records a genuine post-display receipt in the OH-6G2 outbox.

All endpoints are token-authenticated, `POST`-only, uncached; rejects do not
expose device IDs, reminder titles, SQL errors or credentials. The API reuses
`authenticatePersonalAssistanceMobileRequest` (current phone pairing).

## Safety boundaries

- No notifications when proactive assistance is disabled (current default).
- **Absolute Chernobog DND**: even critical reminders are held.
- **Absolute Android DND**: any interruption filter other than `ALL` blocks.
- No automated preference changes or silent permission grants.
- Caller binds a claim to the actual enrolled device; other devices cannot
  authorize or acknowledge it.
- No fake delivery acknowledgement on network failure or rejected OS posting.
- A phone may show a notification before ACK reaches the server; replay updates
  the existing notification tag (not a fresh independent notification), with
  `setOnlyAlertOnce(true)`. Exactly-once across *multiple phones* is not yet
  guaranteed; acceptance should use a single registered phone.
- Android WorkManager periodic scheduling is **best-effort**, minimum 15 minutes,
  may be delayed by Doze/background restrictions. This is not a precise alarm.
- Server DND and Android DND are both rechecked immediately before post; there
  is still an unavoidable brief distributed timing window. Do not use this for
  life-safety or guaranteed-time notifications.
- An old OH-6G3A read-only integration diagnostic continues reporting
  `awaiting-android-transport` until the final OH-6G3C acceptance updates it.

## Install / build

Install the ZIP from the repository root. It adds eight new source files plus a
verifier/doc, and patches exactly four existing Android integration points:
`AndroidManifest.xml`, `ChernobogCompanionApplication.kt`, `HeartbeatWorker.kt`,
`MainActivity.kt`. The installer backs up those files and rolls back on failure.
It never modifies PA profile, enrollment, roster, or live reminder contents.

From `mobile/android-companion` (assuming Android SDK + Gradle wrapper):

```powershell
.\gradlew.bat :app:assembleDebug
adb install -r .\app\build\outputs\apk\debug\app-debug.apk
```

Open the updated app once. Android 13+ may ask for **Allow notifications**
exactly once. If dismissed, grant it through Android Settings → Apps →
Chernobog Companion → Notifications. Keep Tailscale on and the battery
background exemptions configured.

## Acceptance and rollout

- Run `npx tsx .\scripts\verify-oh6g3b-android-reminder-delivery.ts`.
- Run TypeScript and ESLint checks via the installer.
- Build and install APK; open once and verify enrollment remains intact.
- Check `GET /api/personal-assistance/reminders/delivery/health?limit=25`.
  This stays read-only and should show no sends with proactive disabled.
- To test a real notification later, **explicitly opt in** to proactive
  assistance and use a controlled, due-now test reminder with permitted priority;
  return preferences to their previous values after testing.
- Reserve acceptance of real handset notification, receipt, retry and OS DND
  tests for OH-6G3C. Installation alone is not end-to-end acceptance.
