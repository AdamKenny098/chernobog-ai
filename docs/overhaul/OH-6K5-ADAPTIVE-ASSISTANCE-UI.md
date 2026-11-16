# OH-6K5 — Adaptive Personal Assistance UI

The Command Center now mounts the `AdaptiveAssistanceSurface` directly after the Steward attention panel. The added control is collapsed initially. It is stylistically consistent with the existing amber-on-black Command Center; no new navigation surface or frontend service is required.

## Reads

- `GET /api/personal-assistance/adaptive-recommendations?limit=100&includeHidden=true`
- `GET /api/personal-assistance/reminders/preview?limit=100`
- `GET /api/personal-assistance/reminders/adjust?reminderId=...&limit=20` on owner request

The K4 feed includes hidden recommendations so the owner can clear previous feedback. Confidence and stale-source caveats appear unchanged. The reminder list shows an explicit empty state, appropriate for current live owner data (zero active reminders).

## Explicit writes

- `POST /api/personal-assistance/adaptive-feedback` with `actionKey`, `recommendationId`, `expectedRevision`, `verdict` and, for `revisit-later`, `revisitAt` with explicit `Z` offset.
- `POST /api/personal-assistance/reminders/adjust` with `actionId`, `reminderId`, `expectedDueAt`, `kind` and `minutes` or `dueAt`.

Client action IDs are random and not reused. Feedback revision and reminder due-time are copied from the last successful authoritative read. Inputs are bounded locally and validated by existing K3/K4 server services. Server rejection is displayed; there is no automatic fallback action. A successful write triggers fresh reads before showing confirmation.

No automatic notifications, reminder creation, responsibility changes, calendar modifications, attention-profile mutations or DND overrides are added. Critical feedback cannot be hidden through the UI. The underlying K4 service also preserves critical visibility.

## Acceptance

1. Open `http://localhost:3000/command-center` and expand **Personal Assistance / OH-6K5**.
2. Verify four existing adaptive recommendations are listed and the roster/calendar caveats are visible.
3. Check `on-demand-only` and `push off` policy lines.
4. With an item visible, click **Useful**, verify it becomes `useful` after server refresh; then **Clear feedback** and verify it becomes `cleared`.
5. Optional: enter a future date/time to test **Revisit later**, then clear it. Avoid changing live feedback if you only want a non-mutating test; automated verifier uses isolated K4 SQLite fixtures.
6. With no scheduled reminders, the right panel should show **No active reminders**. Do not create a live reminder purely for testing. K3 already covers snooze and reschedule using in-memory fixtures.
7. DND and proactive assistance preferences must remain unchanged.

## Deployment boundary

The UI is a same-origin browser client, not an authorization mechanism. K3/K4 write APIs rely on the pre-existing local/Tailnet operator access boundary. Do not expose them to unauthenticated public web access.

## Installation integrity

The installer adds the component, verifier and documentation and performs a surgical, reversible insert into `CommandCenterView.tsx`. It safeguards against missing or duplicated insertion anchors, backs up the complete original component, validates SHA-256 payload hashes, verifies K5 and K4/K3/K2 regressions and runs TypeScript and targeted ESLint. Any failed verification restores the original component and removes only files installed in this attempt.
