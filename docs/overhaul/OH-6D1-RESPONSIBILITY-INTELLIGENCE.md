# OH-6D1 - Deterministic Responsibility Assessment

## Purpose

Provides a read-only, deterministic interpretation of the authoritative PA-3A responsibility ledger. It does not introduce a second responsibility store or change PA-3B/PA-6 notification ingestion.

## New endpoint

`GET /api/personal-assistance/responsibility-intelligence`

Optional query parameters:

- `includeClosed=true|false` (default false)
- `sourceType=notification|calendar|email|message|work-schedule|manual|system`
- `bucket=overdue|due-soon|high-priority|standard|waiting|closed`
- `limit=1..200` (default 100)

The response contains deterministic `reviewBucket`, `waitingOn`, `needsUserDecision`, `overdue`, `dueSoon`, `reasonCodes`, counts, and the underlying responsibility ID/revision. Derived assessment is never persisted. A historical ledger entry is not modified by a read.

`overdue`/`dueSoon` mean "worth reviewing"; **they do not authorize an interruption**. When waiting on an external party, `needsUserDecision` stays false even when its due date is past. `counts` describe the full matching result, before the `limit` is applied.

The output omits notification raw content, source IDs, merge keys and evidence details, but includes the responsibility's existing title and summary. Access should remain restricted to the existing trusted/tailnet deployment; this step does not implement authentication or change existing endpoint access controls.

## Authority boundaries

- PA-3A responsibility ledger is the only authority for responsibility records and state.
- PA-3B notification intelligence and PA-6 communication tracking remain the ingestion authorities.
- OH-6D1 only reads and interprets existing records; no state transitions or outbound actions.
- OH-6F will own the unified attention queue; OH-6G will own interruption/reminder decisions.

## Acceptance checks

1. `npx.cmd --no-install tsx scripts/verify-oh6d1-responsibility-intelligence.ts`
2. `npx.cmd --no-install tsc --noEmit`
3. `npx.cmd --no-install eslint packages/personal-assistance/src/responsibilityIntelligence/readModel.ts app/api/personal-assistance/responsibility-intelligence/route.ts scripts/verify-oh6d1-responsibility-intelligence.ts`
4. With server running: `Invoke-RestMethod http://localhost:3000/api/personal-assistance/responsibility-intelligence | ConvertTo-Json -Depth 6`
5. Confirm `git diff --check` and staged file list before committing.

## Next OH-6D steps

D2: evaluate replays/merges, communication ownership transitions, evidence provenance and lifecycle with regression tests. D3: unify domain-specific responsibility observation with explicit policy boundaries; acceptance across PA-3, PA-4, PA-6. Do not implement notification policy here.
