# PA-6 — Communication Responsibility

PA-6 builds on the existing PA-2 Android notification sensor, PA-3 notification intelligence, and PA-3A responsibility ledger.

## Monitored channels

- WhatsApp
- Google Messages / SMS
- Discord
- Gmail
- generic Android notifications already classified by PA-3 as communication/email

## Behaviour

A sufficiently clear actionable incoming communication becomes one durable responsibility.

PA-6 applies `communication.defaultResponseWindowHours` as the follow-up deadline. If no response window is configured, PA-6 does not invent one.

The existing PA-3 `notification-thread:<hash>` merge key remains the conversation identity, so repeated notifications from the same sender/application merge into the active responsibility.

Lifecycle:

`waiting-user -> waiting-external -> waiting-user -> resolved`

`mark-replied` is explicit user evidence that the user responded. A later actionable inbound notification on the same active thread can reopen `waiting-external -> waiting-user`.

Notification dismissal alone never counts as a reply.

## Governance

PA-6 does not silently widen notification privacy. Live tracking requires explicit profile opt-in.

Recommended privacy-preserving live configuration:

- capture = `redacted-content`
- storeBodies = `true`
- redactSensitiveContent = `true`
- storeSenderIdentity = `true`
- communication.trackResponsibilities = `true`

PA-6 has no message-send, app-click, gesture, or permission-grant authority.

## API

`GET /api/personal-assistance/communications`

`POST /api/personal-assistance/communications/:id`

Actions:

- `mark-replied`
- `resolve`
- `dismiss`
- `reopen`
- `snooze`

Existing Steward responsibility UI continues to display the resulting responsibilities because PA-6 deliberately reuses the same ledger.