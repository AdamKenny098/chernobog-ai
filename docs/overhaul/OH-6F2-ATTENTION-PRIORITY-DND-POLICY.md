# OH-6F2 — Attention Priority & Do Not Disturb Policy (Advisory)

**Scope:** Adds a deterministic policy overlay on OH-6F1's existing unified attention queue. No delivery, scheduling, notification creation, responsibility mutation, or additional persistence.

## Authorities and design
- OH-6F1 decides queue lanes from the existing PA-3A ledger and PA-4/PA-5 diagnostics. No separate attention ledger is created.
- PA-1A supplies the current effective attention state (`available`, `busy`, `away`, `do-not-disturb`). Reading it may trigger the *existing* expiry of a timed explicit override.
- PA-1B supplies `proactiveAssistanceEnabled` and `interruptionPreference` (`critical-only`, `important`, `normal`, `all`). Neither is changed by OH-6F2.
- Only `now` items originating in the responsibility ledger and requiring user action can be **candidates** for future OH-6G delivery review.
- Health advisories, `review`, `waiting`, `upcoming`, and non-user items are queue-only. They cannot become interrupts merely because their priority is high.
- When proactive assistance is disabled or the item's priority is below the owner's configured preference, retain it in the queue without a delivery candidate.
- Explicit `do-not-disturb` and also `busy`/`away` defer otherwise qualifying candidates. **Critical never overrides DND.**
- Candidate is **not** consent, approval, or actual notification delivery; OH-6G remains the owner of interruption policy and mechanics.
- Responses show only stable queue item identifiers, decisions, reason codes, totals, and public policy flags; they do not return raw notification, roster, calendar ID, or credentials.

## API
`GET /api/personal-assistance/attention-queue/policy?limit=25` (1–100; default 50). Returns `ok`, `policy` with `items`, `counts`, and explicit non-executing boundaries. `completeCoverage=false` when the queue is truncated.

## Acceptance
- Install verifier in `scripts/verify-oh6f2-attention-policy.ts` tests priority thresholds, user intent, stale/advisory boundaries, DND/busy/away behaviour, read-only deterministic assessment, and bounded coverage.
- Existing OH-6F1, OH-6D1, OH-6E2 regressions and `tsc --noEmit` remain green.
- Live endpoint must be checked with `ok:true`. Whether any item qualifies as a candidate depends on explicit profile preferences; no actual notification is sent.

**Status:** OH-6F2 implementation packaged, pending desktop repository installation and live acceptance.
