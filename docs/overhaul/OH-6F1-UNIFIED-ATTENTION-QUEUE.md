# OH-6F1 — Unified Attention Queue (Read Model)

Status: implemented, pending owner machine install and live read-only acceptance.

## Why

Reuse authoritative PA-3A responsibility tracking and OH-6D intelligence, plus PA-4/PA-5 local health findings from OH-6E, without creating a parallel task database or duplicating raw notification ingress. Notification-derived responsibilities already exist in the PA-3A ledger; the queue must not create one row for each raw notification receipt.

## New endpoint

`GET /api/personal-assistance/attention-queue?limit=50&lane=now`

- Optional `limit` integer 1–100 (default 50).
- Optional `lane` is `now`, `upcoming`, `review` or `waiting`.
- `totalMatching` / counts are computed before page truncation.
- Sorted deterministically by lane, priority, due time, and stable ID.
- Only existing open ledger records and grouped schedule/calendar *diagnostic* findings are used.
- Existing responsibility detail/evidence, notification payloads, sender IDs, audit trails, calendar IDs and OAuth secrets are not included. The *existing responsibility title and suggested action* may still contain human-readable sensitive information, so expose the endpoint only on the trusted owner interface.
- `Cache-Control: no-store`. No calendar network calls; no queue persistence or mutations.

## Priority and grouping

- Overdue, explicitly waiting on user, or critical responsibilities are in `now`.
- Scheduled and due-soon items are in `upcoming`.
- Waiting on external parties/delegates stays in `waiting`, even if past due. Never infer permission to send a follow-up.
- Routine work goes to `review`.
- Group local roster problems into one health card and connection problems into one health card. Hide secondary sync-error card until those prerequisites recover; a separate recorded-conflict card remains reviewable.
- Closed responsibilities are excluded.
- The read model deduplicates by responsibility ID only; authoritative merging remains owned by PA-3A.

## Boundaries / planned stages

- No messaging, tool execution, state mutations, automated reminders, calendar edits, notifications, or interruption delivery.
- `OH-6F2`: attention suppression and deterministic DND/priority policy applied to queue presentation; do not silently grant escalation power.
- `OH-6F3`: UI and integration tests; only after accepted should OH-6G implement reminder/delivery policy.
- Mobile always-on reliability is tracked separately as GitHub issue #5 under deferred OH-6C-R.

## Manual acceptance

```powershell
npx tsx .\scripts\verify-oh6f1-unified-attention-queue.ts
Invoke-RestMethod 'http://localhost:3000/api/personal-assistance/attention-queue?limit=25' | ConvertTo-Json -Depth 7
```

An empty queue is valid if the ledger has no open responsibilities and PA-4/PA-5 diagnostics are clear. A non-empty queue is valid when the runtime has unresolved responsibilities or local health findings. Do not insert fake data into the live ledger to test it.
