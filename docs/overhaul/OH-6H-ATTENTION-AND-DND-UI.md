# OH-6H — Attention and Absolute DND UI

## Scope

Exposes an operator-facing control strip immediately below the Command Center header, using the existing canonical Personal Assistance attention API and store. Adds a prominent one-click Enable/Disable DND control and expandable buttons for Available, Busy, Away, and DND.

- `components/chernobog-ui/command-center/AttentionControlSurface.tsx` — new client component.
- `components/chernobog-ui/command-center/CommandCenterView.tsx` — one import and one rendered component, inserted above the Steward workspace.
- No changes to the attention API, profile API, delivery gates, Android receiver, or stored data.

## Behaviour

- Defaults to **Until I turn it off**, respecting the owner's absolute-DND preference. Explicit duration options are 15 minutes, one hour, or custom 5–1440 minutes.
- Timed attention overrides expire via the existing server-side `attentionStore` and revert to Available. Reloads do not reset them.
- "Disable DND" / "Available" sends `DELETE /api/personal-assistance/attention` and clears the explicit override. Other state choices send `PATCH` with optional `durationMinutes`.
- After an update, UI fetches canonical attention and profile data and checks the resulting state. It does not optimistically report success or store DND in browser storage. Inability to verify displays an error.
- Current proactive-assistance and interruption-threshold settings are read-only; changing attention never turns proactive assistance on.
- External changes and timed expiry are reflected through polling every 15 seconds (visible tab only) and foreground/focus refresh.
- DND does not admit critical overrides. Busy and Away preserve their existing deferral semantics.

## Boundaries and known limitations

- This is an **existing operator surface**. It does not introduce or change HTTP authorization; `/api/personal-assistance/attention` inherits existing application deployment/access-control boundaries. A separate authentication audit is required before exposing the command center or its write APIs beyond a trusted operator environment. Do not describe this UI as an independent authorization boundary.
- Does not change Android system DND, proactive assistance preferences, or notification-delivery scheduling.
- Server clocks determine expiration. The visible time is a formatted local display of the server-confirmed timestamp.

## Verification

Run `npx tsx scripts/verify-oh6h-attention-ui.ts`, `npx tsc --noEmit`, and targeted ESLint for the two new/changed TSX files, then perform acceptance:

1. Open `http://localhost:3000/command-center`, confirm an Attention control strip appears immediately below the header, and current state reads Available (or the actual server state).
2. Select DND / Until I turn it off. Verify the UI confirms DND and GET `/api/personal-assistance/attention` shows `state: do-not-disturb`, `explicit: true`, `expiresAt: null`.
3. GET `/api/personal-assistance/reminders/delivery/health?limit=25`: `policy.attentionState` must be `do-not-disturb`. Previously validated OH-6G gates forbid even critical override.
4. Select Available or Disable DND; confirm server state Available and prior proactive assistance setting unchanged.
5. Select Busy with 15-minute duration; verify `expiresAt` populated and state persisted across reload, then reset Available.
6. Select DND / custom 5-minute duration; verify an expiry timestamp and reset Available; do not have to wait 5 minutes because existing expiry tests cover natural timeout.
7. Force a read error (e.g. stop server); controls must fail closed and display unverified state rather than falsely indicating that a mutation succeeded.

Live notification / DND suppression was accepted under OH-6G3C and must not be retested with unsolicited notifications for this UI-only stage.

**Completion requirement:** installer, compiler, lint, OH-6H verifier, and live UI/API checks pass. Do not mark complete from installer alone.
