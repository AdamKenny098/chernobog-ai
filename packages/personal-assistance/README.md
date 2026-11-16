# @chernobog/personal-assistance

Authoritative Personal Assistance implementation package, established by OH-1G and consolidated under OH-6B.

## Existing owners (preserved)

- **PA-1A** `src/attentionStore.ts`: explicit available/busy/away/do-not-disturb state and its audit. Cognition accesses it through the existing `PersonalAttentionProvider` public contract.
- **PA-1B** `src/profileStore.ts`: preferences and opt-in privacy policy.
- **PA-2** `src/mobile/*`: registered Android devices, authenticated notification ingest, receipts and heartbeat.
- **PA-3/PA-6** `src/responsibilities/*`, `src/notificationIntelligence/*`, `src/communicationResponsibility.ts`: one durable responsibility ledger and communication follow-ups.
- **PA-4** `src/workSchedule/*`: authoritative Alkimii roster; JSON state and an audit trail.
- **PA-5** `src/calendar/*`: approved Google Calendar reconciliation; only Chernobog-managed shift events may be modified.

OH-1L already established the PA-owned SQLite connection. Existing JSON-backed responsibility, schedule and calendar records remain in their accepted locations. No data migration is part of OH-6B.

## OH-6B read port

`personalAssistanceReadAuthority` is a frozen, **read-only delegation facade** for attention, profile, responsibilities and work schedule. It performs no caching, writes, scheduling, message delivery, or tool execution. Its reads are not one cross-store atomic transaction. The underlying attention read may persist expiry of an existing user override, per accepted PA-1A behaviour.

Do not bypass the canonical owners, and do not add a second responsibility ledger, attention store, roster store or scheduler.

OH-3 owns durable jobs; OH-4 owns prompt/intent dispatch; OH-5 owns governed memory; Trust/Tool Gateway owns approvals and execution. PA may consume their public contracts but does not take over those authorities.

OH-6B does not implement PA-7/PA-8, mobile credential rotation, notification acknowledgement fixes, or new outward-facing API routes. Those are reserved for subsequent OH-6 milestones.

See `docs/overhaul/OH-6B-PERSONAL-ASSISTANCE-AUTHORITY.md` for ownership and acceptance requirements.
