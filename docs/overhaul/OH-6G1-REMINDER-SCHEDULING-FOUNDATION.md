# OH-6G1 — Reminder Scheduling Foundation

## Purpose

Establish durable, explicit reminders inside the **existing PA-owned SQLite** file
(`CHERNOBOG_DATA_DIR/chernobog.db` or `data/chernobog.db`) without scheduling
interruptions, sending mobile notifications, contacting Google, or changing the
current user attention and proactive-assistance settings.

## New files

- `packages/personal-assistance/src/reminders/foundation.ts` — pure input validation,
  due-time evaluation, preview policy; advisory candidate does not authorize delivery.
- `packages/personal-assistance/src/reminders/store.ts` — transactional SQLite store,
  idempotent create, explicit cancel, unique reminder key; no automatic insertion from
  notifications, responsibilities, or calendar history.
- `scripts/manage-oh6g1-reminders.ts` — **local-only explicit** add/list/cancel CLI.
- `app/api/personal-assistance/reminders/preview/route.ts` — GET-only preview endpoint.
- `scripts/verify-oh6g1-reminder-foundation.ts` — isolated in-memory SQLite and policy tests.
- This documentation file.

## Invariants

- Keys are caller-supplied stable identifiers to prevent duplicates. Replaying an identical
  create returns the original row. Reusing the same key with changed data fails.
- Cancellation preserves the key and does not silently reactivate a reminder.
- Every due time must carry an explicit `Z` or numeric timezone offset. For local Dublin
  dates, use the correct offset for that date (including DST).
- A due reminder may be marked `candidate` **in preview only** if proactive assistance is
  enabled, priority passes the owner's preference and the attention state is `available`.
- **Do Not Disturb is absolute**, including for critical reminders; Busy and Away also defer.
- A scheduled or previewed reminder is **never sent** in OH-6G1; no worker, remote write
  endpoint, pending delivery claim or delivery acknowledgement exists yet.
- Preview counts are over all active stored reminders. Limit only affects returned items;
  `completeCoverage=false` accurately signals truncation.
- GET initializes the new SQLite reminder table if this is the first request, but never
  changes any reminder row, delivery state, preference or user responsibility.
- This module does not yet migrate or project OH-6F responsibilities. That integration and
  the delivery idempotency ledger belong to OH-6G2.

## Local commands

From the repository root:

```powershell
# Add an explicit test reminder due tomorrow (edit date to a future ISO instant):
.\node_modules\.bin\tsx.cmd scripts/manage-oh6g1-reminders.ts add --key manual:test-reminder-1 --title "Review Chernobog" --dueAt "2026-11-14T10:00:00Z" --priority important

# Same command with same key/payload returns disposition: replayed.
.\node_modules\.bin\tsx.cmd scripts/manage-oh6g1-reminders.ts list

# Cancel by rem_... ID shown by add/list:
.\node_modules\.bin\tsx.cmd scripts/manage-oh6g1-reminders.ts cancel --id rem_<id>

# GET preview; this must not send messages.
Invoke-RestMethod "http://localhost:3000/api/personal-assistance/reminders/preview?limit=25" | ConvertTo-Json -Depth 6
```

The CLI mutates the PA-owned SQLite **only when you explicitly run add or cancel**.
`list` and the preview endpoint are read-only on existing reminder records.

## Installer and acceptance

The installation is **add-only**, checks payload SHA-256, refuses to overwrite existing
files, runs the new verifier and OH-6F regression verifiers, typecheck, targeted ESLint,
and whitespace checks; on failure, removes only files added by this installer.

Expected: `OH-6G1 REMINDER SCHEDULING FOUNDATION INSTALL: PASS`.

Live acceptance: `ok:true`, an `asOf` timestamp, `completeCoverage:true` if <= limit,
`counts` and explicit false values for every delivery boundary. An empty queue is a valid
starting condition. The new runtime SQLite table is created lazily; no existing
responsibilities, calendar or OH-6F code is modified.

## Not included until OH-6G2

Remote reminder creation authentication, delivery scheduler, delivery ledger with at-most-once
claims, retry states, Android push/notifications, recurring schedules and lifecycle syncing.
Do **not** interpret `candidate` as permission to deliver.
