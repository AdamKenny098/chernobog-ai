# OH-6K4 — Explicit Adaptive Recommendation Feedback

## Scope

Owner-initiated feedback for the **existing** OH-6K2 adaptive recommendations. This is not automatic preference inference, messaging, reminder creation, calendar planning or DND control. No Android APK changes.

## Contracts

- An exact current K2 recommendation must exist before a new feedback action can be recorded. The POST service recomputes the live K2 read model and never trusts a client-provided recommendation body, category, or reason codes.
- `useful` records explicit positive feedback, without altering source rank, priority or delivery policy.
- `irrelevant` hides a **noncritical** item from the default on-demand K2 view for up to 30 days. Underlying OH-6F queue and reminders remain untouched.
- `revisit-later` hides a **noncritical** item until its owner-supplied future ISO-8601 instant (at most 30 days). It does **not** schedule any notification or task.
- `clear` reverses feedback presentation while retaining a bounded metadata-only audit.
- Critical items always remain visible. A changed evidence signature (original ID, reason codes, title and action (hashed, never stored raw), due date, lane, priority, category, and requiresUser) invalidates suppression.
- `includeHidden=true` always reveals hidden items for review. Original source ranks remain unchanged, even if the visible list has gaps.
- Stable `actionKey` plus `expectedRevision` protect idempotency and concurrent writes. A different payload with the same key is refused.
- Feedback rows contain recommendation IDs, SHA-256 evidence signatures, verdicts, bounded revisit instants, revisions, and timestamps — **never titles, raw notifications, sender metadata, calendar IDs, or personal profile data**.

## API

- `GET /api/personal-assistance/adaptive-recommendations?limit=25&includeHidden=false` — original K2 snapshot with feedback presentation and `feedbackSummary`.
- `GET /api/personal-assistance/adaptive-feedback?recommendationId=<id>&limit=20` — feedback metadata and bounded audit for one ID.
- `POST /api/personal-assistance/adaptive-feedback` with `Content-Type: application/json`:

```json
{
  "actionKey": "owner:recommendation:example-01",
  "recommendationId": "recommendation:health:roster",
  "expectedRevision": 0,
  "verdict": "useful"
}
```

For `revisit-later`, add `"revisitAt":"2026-11-17T12:00:00Z"` adjusted to an actual time within the next 30 days. `expectedRevision` is zero on first feedback and the previous revision on each subsequent change. `actionKey` is a unique client-generated idempotency key; do not reuse for unrelated feedback. For `clear`, use `verdict: "clear"`.

The POST performs same-origin browser checks and rejects non-JSON and unknown fields. Like other existing PA owner write APIs, it relies on the host's **existing trusted local/Tailnet deployment boundary**; same-origin checks are **not** standalone authentication. Do not expose this endpoint publicly without an owner authentication layer.

## Installer

Installer verifies manifest and preexisting file hashes; for the one existing K2 route, only the exact original K2 package file is eligible for replacement. It backs up that file; adds new files only when absent, and runs K4, K2, OH-6F1, TypeScript, and targeted ESLint checks. Rollback restores the original route and removes only newly created files. No live data is read or changed by installer/verifiers. The first live K2 GET initializes the feedback tables in PA's existing SQLite database, without modifying owner preferences or preexisting PA tables.

## Acceptance

- Inspect the new K2 GET with `includeHidden=true` and verify unchanged recommendations and DND policy.
- Submit an explicit feedback action on a chosen **synthetic or genuinely desired** recommendation; do not test `irrelevant` on an important real action unless you intend to dismiss it.
- Refresh K2 GET and confirm feedback annotation and presentation. Check history and reversibility.
- Install verifier uses a private `:memory:` SQLite database. No real feedback action is required to validate the implementation.

## Remaining work

K5 UI integration and end-to-end acceptance. J1 Windows fresh-sign-in acceptance and obsolete PA-2D2 verifier remain separate pending OH-6J closure items.
