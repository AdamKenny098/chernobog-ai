# OH-6K2 — Adaptive Recommendations (on-demand, read-only)

**Scope:** Deterministic recommendation projection over OH-6F1 unified attention queue. No additional inference model, storage, scheduling, notification delivery, device permissions or autonomous action.

## Authoritative inputs

- Existing PA-3A responsibility ledger, filtered to open responsibilities.
- PA-4 authoritative roster **health**, not speculative free time; stale snapshots never establish shift schedules.
- PA-5 locally **recorded** synchronization health; not a live Google Calendar drift check.
- Existing owner preference for proactive assistance and interruption threshold, plus effective attention state / absolute DND.

## API

`GET /api/personal-assistance/adaptive-recommendations?limit=25`

`limit` is optional integer 1–100. Uses existing OH-6F data authority, fetching a maximum of 100 source items then applying the response display limit. If the source has more than 100 items, `recommendations.source.completeCoverage` is false; the endpoint does not pretend to cover all items. No mutation methods are implemented.

Each recommendation includes a stable reference to the source queue item, rank **inherited** from OH-6F, priority, lane, explanation, original reason codes, a manually actionable suggestion and a qualified/recorded evidence confidence label. A qualified label is not a statistical probability. Existing queue title and action hints may be personal; route uses the same trust boundary as the pre-existing attention-queue endpoint. No raw notification event data, calendar IDs or credentials are added.

`recommendations.policy` is observational; **pushEnabled is always false** even if proactive assistance is enabled. DND remains an absolute reason for no unsolicited delivery. Any later push integration must go through the existing OH-6G authoritative delivery gates rather than reading this diagnostic as authorization.

## Boundaries

- Doesn't create/reschedule reminders; that belongs to K3.
- Doesn't write feedback/preferences; that belongs to K4.
- Doesn't send notifications or change attention/DND.
- Doesn't create calendar events or execute tools; executive planning belongs to OH-7.
- Existing `getPersonalAttentionSnapshot()` performs its normal expired-override housekeeping if an existing attention override is past its expiry; K2 itself introduces no new write operations.
- This is an on-demand API, not a background worker.

## Acceptance

Run `npx tsx scripts/verify-oh6k2-adaptive-recommendations.ts`, `npx tsc --noEmit`, and `npx eslint` on the three new TypeScript files. Then check the live GET endpoint. Expected with current live snapshot: four items including two distinct user decisions, one stale roster warning and one historical recorded conflict warning; actual content may change with new roster or responsibility data.
