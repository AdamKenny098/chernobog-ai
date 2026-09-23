# PA-4 — Work Schedule Adapter

## Scope

PA-4 integrates the user's real work-roster source, Alkimii, without granting
Chernobog authority to modify the employer system.

## Source hierarchy

1. Alkimii CSV export — authoritative schedule snapshot.
2. Existing Android notification ingress — live roster/shift change signal.
3. Manual CSV import through the Command Center.
4. Accessibility or screen scraping is not assumed.

## Canonical model

The adapter normalizes imported rows into shifts with:

- source and optional source shift ID;
- local work date;
- UTC start/end;
- role;
- department;
- location;
- status;
- deterministic fingerprint.

The durable state is stored under
`data/personal-assistance/work-schedule.json` with append-only schedule audit
events in `work-schedule-events.jsonl`.

## Reconciliation

The first successful import establishes a baseline.

Later authoritative imports detect:

- added shifts;
- removed shifts;
- changed shifts.

Identical snapshots are treated as confirmations, not changes.

Confirmed changes create a PA-3A1 responsibility with source type
`work-schedule`. PA-4 does not create another task system.

## Notification signals

Alkimii notifications already enter through the accepted PA-2 mobile
notification path. PA-4 observes durable sanitized notifications after ingress.

Only notifications carrying explicit roster / rota / shift / schedule evidence
are treated as schedule-change signals.

A signal marks the authoritative snapshot as needing refresh. If the schedule
is missing or stale, PA-4 creates a human-required responsibility asking for a
fresh Alkimii CSV import.

Notification signal replay is idempotent by event ID.

## Freshness

PA-4 honors the existing PA profile field:

`profile.schedule.staleAfterMinutes`

It also reports the profile's existing `preferredWorkScheduleSource`.

## UI

The live Command Center receives a Work Schedule surface showing:

- Alkimii source;
- fresh/stale state;
- pending refresh signal;
- next upcoming shift;
- loaded shift count;
- last import;
- latest reconciliation count;
- normalized loaded shifts;
- CSV import control.

## Boundaries

PA-4 does not:

- modify Alkimii;
- scrape the Alkimii UI;
- execute tools;
- grant permissions;
- send messages;
- create Google Calendar events.

PA-5 remains the calendar authority.

## Acceptance

Repository acceptance is one bulk pass:

- isolated TypeScript;
- ESLint;
- PA-4 functional verifier;
- PA-1B profile regression;
- PA-2C notification-ingress regression;
- PA-3A1 responsibility regression;
- PA-3B1 / PA-3B2 notification-intelligence regressions;
- PA-3C final Steward regression.

Live acceptance is one Command Center session using an actual Alkimii CSV
export and, where available, an actual Alkimii shift-update notification.
