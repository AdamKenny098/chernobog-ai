# OH-6D3 — Responsibility Integration & Acceptance

**Phase:** OH-6D, final integration checkpoint.

## Scope

This stage integrates the accepted OH-6D1 responsibility read model, OH-6D2 lifecycle/evidence reconciliation, and existing PA-3A responsibility ledger. Existing PA-3B notification intelligence and PA-6 communication responsibility handling remain authoritative for inbound evidence. No original PA components are replaced.

## What was added

- `integrationHealth.ts`: deterministic, aggregate-only health projection over responsibility records and their audit histories.
- `GET /api/personal-assistance/responsibility-intelligence/health?limit=25`: bounded integration health snapshot. The default is 25 records; maximum is 100. When records are not fully scanned, `status: "partial"` means the response is **not** a whole-ledger acceptance claim.
- `verify-oh6d3-responsibility-integration.ts`: isolated temporary-ledger lifecycle, replay, merging, waiting-external, explicit reopening, synthetic corruption, privacy, and non-mutation tests.

## Trust boundaries

Read-only. This stage never sends messages, clicks apps, schedules interruptions, creates reminders, accesses source message bodies, grants permissions, or automatically resolves a responsibility. No live user data is written by the verifier. The health endpoint returns only aggregate counts and finding types, not responsibility titles, source IDs, raw evidence, merge keys, or audit reasons.

`consistent` means the inspected subset passed the current deterministic integrity checks; it does not imply real-world tasks were actually completed. `needs-review` requires user/operator review, not automatic repair.

## Acceptance

1. Run OH-6D1, OH-6D2, and OH-6D3 isolated verifiers.
2. Re-run existing PA-3A, PA-3B2, and PA-6 communication plus acknowledgement regressions.
3. Run TypeScript and scoped ESLint.
4. Smoke-test the new health endpoint (live read-only) after installing:

   `Invoke-RestMethod "http://localhost:3000/api/personal-assistance/responsibility-intelligence/health?limit=25" | ConvertTo-Json -Depth 6`

5. Review `status`, `coverage`, and `counts`; investigate any `needs-review`, and increase `limit` where feasible for `partial`. It is valid for an empty ledger to return `consistent` with 0 scanned records.
6. Check `git status --short` and stage only intentional code and docs. Do not stage `data/`, `.chernobog/`, generated APKs, tokens, or database files.

**OH-6D is closed only after installer + runtime acceptance, not merely ZIP creation.**
