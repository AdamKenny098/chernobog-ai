# Chernobog PA-5 â€” Google Calendar Steward

## Completion target

PA-5 is complete when Chernobog automatically projects the authoritative PA-4 Alkimii work roster into Google Calendar and keeps those managed events reconciled.

## Authority boundary

PA-5 may automatically:

- create Google Calendar events sourced from authoritative PA-4 shifts;
- update those same Chernobog-managed work events when PA-4 changes;
- remove those same Chernobog-managed work events when PA-4 removes a shift;
- inspect overlapping events for conflict detection.

PA-5 may not automatically:

- modify unrelated calendar events;
- delete unrelated calendar events;
- infer extra work shifts;
- alter personal appointments to resolve a conflict.

## Google OAuth setup

1. Enable the Google Calendar API in a Google Cloud project.
2. Configure the OAuth consent screen.
3. Create an OAuth 2.0 Web application client.
4. Add this authorized redirect URI:

   `http://localhost:3000/api/personal-assistance/calendar/google/callback`

5. Set these values in `.env.local`:

   `CHERNOBOG_PA5_GOOGLE_CLIENT_ID`
   `CHERNOBOG_PA5_GOOGLE_CLIENT_SECRET`
   `CHERNOBOG_PA5_GOOGLE_REDIRECT_URI`

The installer creates `CHERNOBOG_PA5_TOKEN_KEY` automatically. Do not share it.

6. Restart the Next.js server.
7. Open:

   `http://localhost:3000/personal-assistance/calendar`

8. Select **Connect Google Calendar**.

The OAuth callback immediately reconciles the current PA-4 roster. After that, every accepted PA-4 roster import invokes PA-5 automatically.

## Scope

PA-5 requests:

`https://www.googleapis.com/auth/calendar.events`

This permits PA-5 to manage events on calendars available to the connected Google account, including a shared calendar owned by another user when the connected account has write permission.

PA-5 still enforces its own stricter boundary: it only updates or deletes events carrying the private chernobogManaged=pa5-work-shift marker.

## Event ownership

Every PA-5 event carries private Google Calendar extended properties:

- `chernobogManaged=pa5-work-shift`
- `chernobogSourceKey=...`
- `chernobogShiftId=...`
- `chernobogShiftDate=...`
- `chernobogSnapshotId=...`

Reconciliation only updates/deletes events carrying the PA-5 management marker.

## Privacy

OAuth access and refresh tokens are encrypted at rest with AES-256-GCM. The encryption key is held separately in `.env.local`. The state file is ignored by Git.

## Live acceptance

1. Connect Google Calendar.
2. Confirm the six current PA-4 shifts appear once in Google Calendar.
3. Re-sync unchanged PA-4 roster: zero creates/updates/deletes.
4. Import a changed fixture: managed work event updates.
5. Remove a fixture shift: only the matching Chernobog-managed event is removed.
6. Confirm an unrelated Google Calendar event remains untouched.
7. Confirm a conflicting unrelated event increments conflict detection without being moved or edited.