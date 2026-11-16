# OH-6K3 — Explicit Reminder Snooze and Reschedule

## Scope
Adds an explicit owner-action endpoint and a SQLite audit to adjust **undelivered** scheduled reminders. Existing reminder IDs, titles, keys, priorities, existing PA attention/DND policy, and work/calendar data are not changed. There are no automatic edits, notifications, or new workers.

`POST /api/personal-assistance/reminders/adjust` with `Content-Type: application/json` accepts:

- `actionId`: caller-generated stable idempotency ID (nonsecret; reuse it only on retries)
- `reminderId`: existing `rem_...` ID
- `expectedDueAt`: current UTC/offset ISO time (optimistic concurrency protection)
- `kind: "snooze", minutes: 1..43200` — new due time is `max(serverNow, currentDueAt) + minutes`
- or `kind: "reschedule", dueAt: "...Z"` (or explicit numeric UTC offset); must be in the future and within 365 days

Response: `{ok:true, disposition:"applied"|"replayed", adjustment:{actionId,reminderId,kind,previousDueAt,dueAt,changedAt}}`. Error responses carry only stable error codes. `GET .../adjust?reminderId=rem_...&limit=50` reads audit history without titles or source evidence.

This endpoint follows the same **already-protected local/Tailnet owner deployment boundary** as existing Personal Assistance POST/PATCH routes. Do **not** expose the endpoint publicly without adding explicit account authentication. Only deliberate owner POST calls can adjust reminders; a recommendation cannot.

## Safety constraints

1. Modification is done inside an immediate SQLite transaction, auditing each distinct successful action. Any repeated `actionId` and identical input returns the original audit item; a different input with that ID conflicts.
2. Stale `expectedDueAt`, cancelled reminders, invalid inputs, and out-of-range targets are rejected.
3. An active reminder delivery reservation (2-minute lease) blocks adjustment with `409 active_lease`. Nothing is changed until the lease expires or delivery is recorded.
4. Once a lease expires, a successful adjustment deletes the expired outbox reservation and device claim **in the same transaction**, so late stale acknowledgements cannot mark the changed reminder delivered.
5. Already delivered reminders are rejected with `409 already_delivered`. The Android transport uses stable reminder-ID deduplication, so an in-place re-arm could silently suppress the new display. A separate follow-up reminder with a new ID is required instead. K3 intentionally does not create one automatically.
6. There is a narrow unavoidable race if a phone was authorized immediately before lease expiry and posts after it. The live lease guard limits this; complete presentation-level versioning would require an Android protocol update and is outside K3.
7. No proactive notification, DND override, calendar write, profile write, or automatic plan update.

## Verification

- `npx tsx scripts/verify-oh6k3-reminder-adjustments.ts`
- `npx tsx scripts/verify-oh6g1-reminder-foundation.ts`
- `npx tsx scripts/verify-oh6g3b-android-reminder-delivery.ts`
- `npx tsc --noEmit`
- Targeted ESLint for the three new TypeScript files.

Verifier uses isolated in-memory SQLite only. Installer is add-only and refuses overwriting unrelated files. It never alters the owner's SQLite database during installation or tests. Schema is lazily created on first live K3 endpoint request.

## Example after installation

```powershell
# Find a scheduled reminder (read-only):
$p = Invoke-RestMethod 'http://localhost:3000/api/personal-assistance/reminders/preview?limit=100'
$p.preview.items | Select-Object id,dueAt,priority

# Replace these with an actual ID and its current dueAt:
$id = 'rem_...'
$expected = '2026-11-16T08:00:00.000Z'
$body = @{ actionId = [guid]::NewGuid().ToString('N'); reminderId = $id; expectedDueAt = $expected; kind = 'snooze'; minutes = 30 } | ConvertTo-Json
Invoke-RestMethod -Method Post -ContentType 'application/json' -Uri 'http://localhost:3000/api/personal-assistance/reminders/adjust' -Body $body
```

Do not run the example against a real reminder unless intending to change it. For live acceptance, read-only history and endpoint checks are safe; isolated verifier exercises writes with synthetic reminders.
