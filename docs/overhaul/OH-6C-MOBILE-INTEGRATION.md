# Chernobog OH-6C - Mobile Integration and credential recovery

## Scope

- Restore the enrolled Android companion after an invalid bearer token without
  uninstalling the app, rotating its installation identifier or deleting its
  Room notification spool.
- Keep PA-2A's original enrollment protocol unchanged.
- Require a separate local-owner-minted, 256-bit, single-use, 10-minute
  recovery code for credential rotation; a normal enrollment code is not valid.
- Bind recovery to both the active device ID and installation ID in a SQLite
  transaction. Never restore a revoked device. Invalidate the previous bearer.
- Defer expanded recovery diagnostics and any downstream acknowledgement
  outbox architecture to OH-6D / OH-6E.
- Block communication-observer failure from marking a notification receipt as
  processed. A 503 leaves it eligible for retry/reconciliation.

## Ownership and safety

- `@chernobog/personal-assistance/mobile/store.ts` owns device identity,
  credentials, and the new recovery challenge state in the existing PA SQLite.
- `scripts/oh6c-mobile-recovery.ts` is LOCAL owner tooling. No HTTP endpoint
  creates a mobile recovery code. `/mobile/recover` only consumes one.
- Android `SecureCredentialStore.saveEnrollment` updates the encrypted bearer
  only after the server has returned the original device/installation IDs.
- Android Room spool, policies, WorkManager, Tailscale, schedules, calendar,
  and existing responsibility ledger are unchanged.

## Runtime activation (do not run until OH-6C installer and Android build pass)

1. Install the newly built APK **as an update**, never by uninstalling or
   clearing application data. Verify the APK has the same application ID and
   compatible signing key before installation.
2. Confirm the phone uses the correct HTTPS Tailscale endpoint and that it
   reaches the same server instance/database as the owner recovery CLI.
3. On the server host, from the repository root, run
   `npx tsx scripts/oh6c-mobile-recovery.ts --list`.
   The printed PA database path must correspond to the actual Next.js server's
   `CHERNOBOG_DATA_DIR` (or default `<repo>/data`).
4. Locate the *active* device ID matching the phone's existing Device Panel.
   Run `npx tsx scripts/oh6c-mobile-recovery.ts --create <DEVICE_ID>`.
   The code expires after 10 minutes; do not paste it into chat or logs.
5. On the existing phone installation, tap **Credential Recovery** and enter
   the code. It rotates the server bearer in place and saves the new encrypted
   bearer on the phone. Then Refresh Session should report CONNECTED.
6. Verify heartbeat and notification spool reconciliation; confirm no pending
   events were lost. Recheck the work schedule adapter as needed.

## Recovery and failure boundaries

- Do not rotate a revoked device's identity; investigate and explicitly
  re-enroll as a new installation only after backup of local spool data.
- If the owner CLI lists no devices or the phone's ID is absent, DO NOT create
  or force a new registration: verify the actual server's database path first.
- If the device has the correct registration but the phone is using another
  endpoint, fix the endpoint rather than immediately rotating its credential.
- If recovery fails after server commit but before the phone saves the token,
  generate another local single-use code; the old local notification spool is
  still present.
- Failed communication observation now returns retryable HTTP 503 before
  acknowledgement. A failing Alkimii safe observer can still mask an error;
  review explicitly in OH-6D / OH-6E.
- Existing `/mobile/enrollment` owner authorization and network exposure is
  legacy PA-2A behaviour and is not broadened here. Restrict the server to the
  private trusted Tailnet; a separate owner-access audit is still warranted.

## Acceptance gates

- Isolated recovery test (temporary SQLite DB) passes.
- TypeScript and targeted ESLint pass.
- OH-1G package boundary verifier passes.
- Android debug APK builds using installed Android SDK.
- Live phone recovers with same deviceId/installationId and preserves spool.
- Heartbeat, session, notification sync and Alkimii ingestion pass live checks.

Until Android build and live checks pass, OH-6C is **installed but not closed**.
