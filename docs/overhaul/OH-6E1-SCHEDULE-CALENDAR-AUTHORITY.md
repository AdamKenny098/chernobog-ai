# OH-6E1 — Schedule & Calendar Authority Read Model

## Scope

Consolidate existing PA-4 Alkimii work-schedule **read authority** and PA-5 Google Calendar **projection status** into one deterministic, read-only view.

- PA-4 remains the only authority for work shifts. Its snapshot, `isStale`, and `pendingRefresh` are not recomputed or overwritten.
- PA-5 remains the only writer of managed Google work events. This package does not call Google Calendar or invoke any sync operation.
- The OH-6E1 endpoint compares the current PA-4 `snapshotId` with the **last recorded** PA-5 sync summary. It does **not** claim to verify the current remote calendar state.
- A fresh roster is required before reporting a recorded-aligned state. Missing, empty, stale and pending-refresh rosters remain distinguishable.
- Conflict counts come from the last PA-5 sync, not a new calendar query.

## Files

1. `packages/personal-assistance/src/scheduleCalendarAuthority/readModel.ts` — pure deterministic projection.
2. `app/api/personal-assistance/schedule-calendar/authority/route.ts` — GET-only status API; no-store and generic error details.
3. `scripts/verify-oh6e1-schedule-calendar-authority.ts` — isolated fixtures for roster freshness, recorded sync correspondence, conflicts, privacy and non-mutation.
4. This document.

## GET endpoint

`GET /api/personal-assistance/schedule-calendar/authority`

Returns `ok`, `authority` including `assessment`, `guidance`, `roster`, `calendar` and explicit `boundaries`.

`assessment` values: `needs-roster`, `needs-calendar`, `needs-sync-review`, `review-conflicts`, `recorded-aligned`.

This response includes the next shift's start/end/status for assistant planning, but never shift role/department/location, calendar ID, redirect URI, OAuth secrets or raw error text. Treat the endpoint as **private** and retain the deployment's Tailnet access boundary. The existing PA-4 endpoint is already private schedule data.

## Acceptance

Run `npx.cmd --no-install tsx scripts/verify-oh6e1-schedule-calendar-authority.ts`, `npx.cmd --no-install tsc --noEmit`, and scoped ESLint; installer invokes these plus the existing PA-4/PA-5 isolated regression suites. No live OAuth calls, event mutations, or production database writes occur during the isolated verifier.

With the app running, read `http://localhost:3000/api/personal-assistance/schedule-calendar/authority` and confirm truthful statuses for the live PA-4/PA-5 state. Do not trigger PA-5 POST until it is separately reviewed and explicitly intended.

## Next checkpoints

- **OH-6E2:** readiness/drift diagnostics and recovery planning, still without automatic calendar mutations.
- **OH-6E3:** integration acceptance across Android Alkimii capture and the existing managed Google Calendar projection, plus Git scope review.
