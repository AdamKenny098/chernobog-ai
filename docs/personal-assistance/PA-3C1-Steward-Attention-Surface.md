# PA-3C1 — Steward Attention Surface

## Purpose

PA-3C1 makes the durable Steward responsibility ledger visible and operable
from the live Chernobog Command Center.

The UI does not create another responsibility store.

Canonical authorities remain:

- PA-3A1 responsibility ledger for durable personal responsibilities.
- PA-1A Personal Attention Authority for available/busy/away/DND state.
- Cognition attention and initiative queues remain transient runtime systems.

## Live surface

The Command Center gains a compact Steward strip directly below its header.

The collapsed strip shows:

- current user attention state;
- active responsibility count;
- needs-user count;
- important/critical counts;
- next responsibility title.

Opening the strip shows up to six highest-priority responsibilities, sorted by:

1. priority;
2. whether the item requires the user;
3. due time;
4. most recent update.

Each item exposes:

- priority;
- state;
- title and summary;
- source application/type;
- confidence;
- evidence count;
- due/update time;
- suggested action.

## Explicit user actions

PA-3C1 can submit only responsibility state transitions already permitted by
PA-3A1:

- Resolve -> resolved
- Waiting elsewhere -> waiting-external
- Needs me -> waiting-user
- Dismiss -> dismissed

Every mutation goes through the existing PA-3A1 transition API and records the
actor as `steward.attention-ui`.

## Boundaries

PA-3C1:

- does not execute tools;
- does not grant permissions;
- does not send messages;
- does not change calendar state;
- does not duplicate responsibilities into cognition queues;
- does not create a second persistence layer;
- does not infer new responsibilities in the UI.

The surface defers its initial client sync outside synchronous effect execution,
then polls the two read APIs every four seconds only while the page is visible.

## Acceptance

Repository acceptance requires:

- isolated TypeScript check;
- ESLint on touched/new source;
- PA-3C1 static verifier.

Live acceptance requires opening `/command-center`, confirming the strip shows
real PA-3A1 data, expanding it, and successfully transitioning a test
responsibility through one explicit user action.
