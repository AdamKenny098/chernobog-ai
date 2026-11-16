# OH-6J4 — Android Reminder Transport Telemetry

## Purpose

Replace the OH-6G3A legacy fixed `awaiting-android-transport` diagnostic with
truthful read-only server-side evidence. This patch **does not affect** the
Android notification-ingest/spool feature (PA-2D2), delivery transports,
permissions, proactive assistance, or DND.

`GET /api/personal-assistance/reminders/delivery/integration` now reports:

- `status`: `awaiting-android-device`, `android-device-paired`,
  `android-delivery-observed` or `android-history-only`.
- `transport.androidReminderRoutesAvailable`: whether the delivery route is
  included in the running server. This is a code/deployment capability, not proof
  the phone is reachable.
- `transport.pairedAndroidDeviceCount`: only non-revoked Android enrollments; no
  device identifiers or names are returned.
- `transport.acknowledgedAndroidDeliveries`: number of G3B outbox delivery rows
  with **exact** `android:<reminder-id>` receipts. Historical observations, not
  proof that a device is currently online.
- `transport.androidReceiverInstalled`: `false` with no paired phone, `null`
  (unknown) with one or more paired phones. The server cannot remotely inspect
  Android's OS-level receiver installation state.
- `transport.automaticDeliveryEnabled`: best-effort server delivery path
  *eligible* when at least one enrolled Android device exists, the route exists,
  proactive assistance is enabled, and owner attention is available. It **does
  not** prove Android notification permission, OS DND, WorkManager scheduling,
  phone connectivity or a specific reminder's priority gate.
- `transport.deliveryPolicyPermitsAttempt`: only owner attention and proactive
  permission, not complete per-reminder authorization.
- `transport.androidReceiverInstallationVerified` and
  `transport.androidOnlineNowVerified`: always false until a separate,
  authoritative live probe exists.

The endpoint retains G3A's previous count and boundary fields, including
`remotelyDispatched` (now derived from actual G3B acknowledgement history).
The pure helper keeps its original six-argument call form for older verifiers;
production supplies the optional seventh `evidence` argument.

## Acceptance

From repository root:

```powershell
npx tsx .\scripts\verify-oh6j4-transport-telemetry.ts
npx tsx .\scripts\verify-oh6g3a-delivery-coordinator.ts

$r = Invoke-RestMethod 'http://127.0.0.1:3000/api/personal-assistance/reminders/delivery/integration'
$r.integration.status
$r.integration.transport | Format-List
$r.integration.boundaries | Format-List
```

Leave `proactiveAssistanceEnabled` and capture privacy settings unchanged.

## Non-goals

No claims of installed/running Android OS receivers, online devices, exact
once across multiple phones, guaranteed-time push, or real-time probe results.
No database schema changes, device tokens, user preference changes, or writes.
