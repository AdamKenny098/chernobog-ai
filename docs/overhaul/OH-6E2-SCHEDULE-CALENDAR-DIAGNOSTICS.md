# OH-6E2 — Schedule & Calendar Diagnostics

## Scope

This additive, read-only diagnostic layer combines existing PA-4 Alkimii schedule state, PA-5 Google Calendar recorded synchronization state, and the Personal Assistance profile's configured time zone. It **does not** fetch remote Google events, change preferences, reconnect OAuth, sync calendars, or create responsibilities.

API: `GET /api/personal-assistance/schedule-calendar/diagnostics`

The output contains **bounded, aggregate-only** diagnostics: current/stale/absent roster; last import and recorded sync age in minutes; whether the recorded sync references the current roster; calendar connection and automatic-sync settings; recorded overlap count; time-zone mismatch/absence; and structured reason codes.

## Trust semantics

- PA-4 is the authoritative Alkimii roster. No extra shifts may be inferred from Google Calendar, and `hasUpcomingShiftInSnapshot=false` is *not* proof of time off.
- PA-5 owns Google Calendar. A locally recorded successful sync is *not* proof of remote state. The endpoint cannot establish remote drift or current conflict conditions.
- For Ireland, a profile of `Europe/Dublin` is preferable to `UTC` because the offset changes across daylight saving transitions. The endpoint does not set or assume the user's profile time zone; it only advises when it is absent or mismatched.
- Recorded conflicts are advisory; never delete unrelated calendar entries. Detailed conflict events require authorized PA-5 inspection.
- OAuth secrets, calendar IDs, raw shift metadata and provider error bodies are excluded from the JSON output.

## Acceptance

1. Run `npx tsx scripts/verify-oh6e2-schedule-calendar-diagnostics.ts`.
2. Run the existing OH-6E1 and PA-4/PA-5 verification suites.
3. With server on port 3000, run `Invoke-RestMethod http://localhost:3000/api/personal-assistance/schedule-calendar/diagnostics | ConvertTo-Json -Depth 8`.
4. Verify `ok=true`, `evidenceScope=local-pa4-pa5-records-only`, read-only boundary flags, and expected findings. Warnings arising from genuine operational configuration do not fail the endpoint.

A *live* PA-5 reconnection and roster refresh require explicit user action through existing PA-4/PA-5 workflows and are separate from the OH-6E2 diagnostic-only acceptance.
