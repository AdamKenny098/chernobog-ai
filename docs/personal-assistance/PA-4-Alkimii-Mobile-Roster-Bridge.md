# PA-4 — Alkimii Mobile Roster Bridge

## Purpose

The user's Alkimii employee account does not expose Shift Search / CSV export on
desktop. PA-4 therefore uses the employee-visible Android roster as the primary
authoritative source while retaining CSV import as a fallback.

## Android source

Google Play package:

`com.alkimii.connect.app`

The companion registers a dedicated Android Accessibility service which is:

- manually enabled by the user in Android Accessibility settings;
- restricted in Android accessibility metadata to the Alkimii package;
- re-checks the package in code before every capture;
- read-only;
- unable to perform gestures;
- contains no `performAction`, `dispatchGesture`, or global-action path;
- debounced and content-hash deduplicated;
- only uploads screens that look like a roster and contain date/time evidence.

The Accessibility service exists because the employee-facing Alkimii account
does not provide the desktop export route required by the original PA-4 live
acceptance.

## Transport

Captured visible text nodes are sent over the existing enrolled companion HTTPS
endpoint using the stored bearer credential.

Route:

`POST /api/personal-assistance/mobile/work-schedule/alkimii-roster`

The server:

- requires normal PA-2 mobile authentication;
- accepts only `com.alkimii.connect.app`;
- validates capture size;
- parses dates and time ranges server-side;
- supports common Irish/European dates and textual month dates;
- supports split start/end accessibility nodes;
- supports overnight shifts;
- rejects captures from which no shifts can be established.

Raw accessibility text is not added to the PA-3 responsibility ledger or Event
Spine. Only normalized schedule state proceeds into PA-4.

## PA-4 integration

A successful mobile roster capture creates the same canonical
`WorkScheduleSnapshot` used by the CSV path.

Therefore all accepted PA-4 behavior is reused:

- durable snapshot;
- reconciliation;
- added / removed / changed shifts;
- freshness;
- pending-refresh clearing;
- PA-3A1 schedule-change responsibility projection;
- Event Spine publication;
- Command Center Work Schedule display.

CSV remains a fallback.

## Boundaries

This bridge does not:

- click Alkimii controls;
- modify shifts;
- send messages;
- create calendar events;
- grant permissions;
- self-enable Accessibility;
- inspect other Android applications.

The user must explicitly enable the Accessibility service through Android
settings.
