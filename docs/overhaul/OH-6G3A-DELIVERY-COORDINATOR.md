# OH-6G3A — Reminder Delivery Coordinator (server integration foundation)

## Scope

OH-6G1 stores and previews reminders; OH-6G2 implements DND-aware eligibility,
durable outbox reservations and authenticated-receipt storage primitives. OH-6G3A
connects these components through an injectable coordinator **without granting
an unaudited HTTP route or background worker the authority to send**.

This stage is NOT real mobile notification delivery. The current Android
companion uploads heartbeats and device notifications; the app has no server-
to-Android reminder polling / display receipt implementation. That requires
OH-6G3B and a new APK, then live OH-6G3C acceptance. No proactive preference
change is performed by this package.

## Added files

- `packages/personal-assistance/src/reminders/deliveryCoordinator.ts`:
  `ReminderDeliveryCoordinator.dispatchOne` obtains fresh authority, atomically
  reserves through the OH-6G2 outbox, rechecks fresh attention/profile state,
  invokes an explicitly passed stable-idempotent transport, and writes a durable
  receipt only after the transport confirms success. Failed calls do not create
  receipts and cannot be retried until the outbox lease expires.
- `packages/personal-assistance/src/reminders/integrationHealth.ts`:
  aggregate safe diagnostics and truthful `awaiting-android-transport` state.
- `app/api/personal-assistance/reminders/delivery/integration/route.ts`:
  read-only `GET /api/personal-assistance/reminders/delivery/integration?limit=25`
  (1–100; no titles, no tokens, no mutations, no transport calls).
- `scripts/verify-oh6g3a-delivery-coordinator.ts`: isolated in-memory SQLite tests
  with an injected synthetic transport. Does not touch real user reminder data.
- This document.

## Security properties

1. No autonomous process, cron, API write route, or real Android client is created.
2. Dispatch requires a transport explicitly declaring stable reminder-ID dedupe.
   Reservation IDs are **not** idempotency keys; they change after lease expiry.
3. OH-6G2 enforces DND, Busy, Away, disabled proactive assistance, time and
   priority both when reserving and immediately before calling a transport.
4. A transport receipt is persisted only after `send()` succeeds; a thrown
   transport error leaves the reservation until expiry. No phantom ACKs.
5. Already-reserved or already-delivered reminders never trigger a second
   transport call while their associated outbox state is authoritative.
6. A remote transport must independently deduplicate by reminder ID and must
   re-evaluate **local** DND/permissions immediately before displaying on the
   Android device. Because Android and server states can change during a network
   round trip, the server-side check alone cannot guarantee that a DND change
   made mid-flight prevents a remote display. G3B must address that boundary.
7. The integration diagnostics endpoint never returns reminder title, device
   credentials, receipt text or notification bodies.

## Acceptance

1. Install with `OH-6G3A-Pack/Install-OH-6G3A.ps1 -Repo <repo-path>`.
2. The installer runs G3A/G2/G1/F3/F2/F1 regression suites, repository
   TypeScript, ESLint of new files, and Git whitespace check.
3. Read the live integration report:

   ```powershell
   $r = Invoke-RestMethod 'http://localhost:3000/api/personal-assistance/reminders/delivery/integration?limit=25'
   $r.integration | Select-Object status, totalMatching, returned, completeCoverage, gateCounts, outboxCounts, transport, boundaries | Format-List
   ```

   Expected `ok: true`; `status: awaiting-android-transport`;
   `transport.automaticDeliveryEnabled: false`; `boundaries.readOnly: true`;
   `boundaries.overridesDoNotDisturb: false`.

4. This stage does NOT require activating proactive assistance, generating
   a real reminder, modifying DND, or modifying the currently paired phone.

## Follow-up

- **OH-6G3B**: authenticate a *device-initiated, TLS tailnet-only* reminder
  pull and acknowledgement path; implement Android-side local notification
  presentation with Android notification permission/channel, stable-ID dedupe,
  local DND/permission checks, and durable ACK state. Preserve existing mobile
  enrollment and notification ingest. No unauthenticated push endpoint.
- **OH-6G3C**: live end-to-end delivery tests including explicit opt-in test,
  DND, airplane mode, Wi-Fi/LTE reconnection, process restart, duplicate pull,
  cancellation and receipt verification; restore user settings afterward.

## Deferred reliability

OH-6C-R always-on mobile self-recovery remains tracked separately as GitHub
issue #5 and must not be reported as implemented by this package.
