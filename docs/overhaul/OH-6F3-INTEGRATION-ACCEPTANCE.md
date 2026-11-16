# OH-6F3 — Unified Attention Queue Integration & Acceptance

## Purpose

Closes OH-6F1/2 integration using a **single-snapshot aggregate acceptance read**. Reuses the existing responsibility ledger, Alkimii schedule authority, PA-5 recorded calendar diagnostics, PA-1A attention state, and PA-1B explicit profile preferences. No second persistence store, notification delivery path, tool execution, or silent preference adjustment.

## Acceptance API

`GET /api/personal-assistance/attention-queue/acceptance?limit=100`

- Maximum 100 queue items; default 100. A smaller `limit` is useful for intentionally testing partial coverage.
- `ok:true`, `acceptance.status:"ready"`: all **returned** queue-policy mappings and bounded coverage verified, and **all** queue items were evaluated. This is an integrity/readiness result, *not* permission to deliver notifications.
- `ok:true`, `acceptance.status:"partial"`: bounded evaluation omitted items; do not claim full OH-6F integration coverage. Increase the limit up to 100. If more than 100 items exist, use the existing queue API to investigate and expand verification separately.
- `ok:false`, `acceptance.status:"inconsistent"` (503): mapping, counts, candidate authorization, DND, or execution boundaries have been violated; fail closed and do not proceed.
- `acceptance.findings` contains stable diagnostic codes only; responses never contain item titles, notification text, phone identifiers, raw shifts, calendar IDs, or OAuth secrets.
- `queueCounts` and `policyCounts` reflect the live local source snapshot. They may change between calls as the underlying system changes.
- `policyContext.proactiveAssistanceEnabled:false` results in zero candidates by design. `critical-only` filters out important, normal, and low items. Explicit Do Not Disturb is an absolute prohibition against any candidate, including critical.

**Existing nuance:** `getPersonalAttentionSnapshot()` can expire a previously timed PA-1A override via its existing lifecycle. OH-6F3 does not introduce writes, preferences changes, or expiration scheduling.

## Verification

Run `npx tsx scripts/verify-oh6f3-integration-acceptance.ts` or use the packaged installer, which also runs the existing OH-6F1/2/6D1/6D3/6E1/6E2 verifiers, repo TypeScript, ESLint, and `git diff --check`. No production PA profile changes are required during testing; synthetic fixtures cover alternative preferences and states.

Check live status:

```powershell
$r = Invoke-RestMethod "http://localhost:3000/api/personal-assistance/attention-queue/acceptance?limit=100"
$r.acceptance | Select-Object status,coverage,queueCounts,policyCounts,policyContext,safeguards,findings
```

Expected when normal queue contains <=100 entries and no integration defects: `status: ready`, `coverage.complete: True`, all five safeguards `True`. `queueOnly` can equal all items if proactive assistance remains disabled.

## OH-6 sign-off boundary

Completing OH-6F3 closes **OH-6F** as an *advisory/read-only* system. It does not mean push-notification delivery exists. OH-6G is responsible for actual reminder/notification and interruption policies, and cannot treat an OH-6F candidate as delivery authorization. The separate OH-6C-R mobile reliability work remains on GitHub Issue #5.
