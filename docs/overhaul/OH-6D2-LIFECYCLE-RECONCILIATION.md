# OH-6D2 - Lifecycle and Evidence Reconciliation

## Scope

Adds a read-only lifecycle assessment of individual PA-3A responsibilities. It reuses the OH-6D1 read model, existing PA-3A state machine, audit journal, and PA-6 communication thread convention. It does not change the responsibility ledger schema, state transitions, notification ingestion, Android application, or calendar.

## API

`GET /api/personal-assistance/responsibility-intelligence/{responsibilityId}/lifecycle`

Returns audit/evidence counts, follow-up state, integrity findings and explicit no-action boundaries. It intentionally does **not** return source IDs, sender identities, raw evidence, audit actor or audit reason. It is a diagnostic and triage interface, not proof that a real-world action has occurred.

### Finding semantics

- `missing-created-audit`, `revision-audit-count-mismatch`: journal may be absent or inconsistent with the record.
- `duplicate-evidence-source`: the same typed source identity appears multiple times in one responsibility. This is flagged, not discarded.
- `invalid-transition`, `transition-chain-gap`, `last-recorded-state-mismatch`: audit state history and current state may not agree.
- Invalid or out-of-order timestamps and repeated audit IDs are reported.

No automatic edits are made to evidence or audit history. User-initiated transitions continue to use the existing state machine.

## Acceptance

The verifier uses a temporary ledger under the OS temporary directory. It tests source replay, merging, communication follow-up, explicit closure/reopening, privacy, read-only behavior and manipulated-evidence anomaly detection. The installer runs verifier, full TypeScript typecheck, and ESLint for the new files. Existing OH-6D1 must be installed first.

`OH-6D2 LIFECYCLE RECONCILIATION: PASS` is the isolated verifier result. Full OH-6D remains open until later integration/acceptance.
