# Chernobog PA-3B3 — Governed Android Notification Content Capture

PA-3B3 extends the accepted PA-2D2 Android notification sensor so PA-3B1 can receive useful semantic evidence without bypassing PA-1B privacy authority.

## Authority

The phone does not invent its own content policy. The authenticated mobile session exposes the existing PA-1B notification/privacy settings: capture mode, body storage, sensitive-content redaction, and sender-identity storage.

## Capture behavior

- `disabled`: no new notification capture; the sync worker purges the local spool.
- `metadata-only`: no sender/title/body content is persisted.
- `redacted-content`: only locally redacted title/body evidence is persisted.
- `full-content`: raw title/body are persisted only when full-content is selected and sensitive-content redaction is explicitly disabled.
- bodies are persisted only when `notification.storeBodies=true`.
- sender identity is persisted only when `privacy.storeSenderIdentity=true`.

For Android message/email categories, the notification title commonly contains the correspondent name. When sender storage is disabled, PA-3B3 suppresses that title as well so identity cannot leak through a title field.

## Local redaction

Before redacted content is written to Room, the companion masks common email addresses, URLs, OTP/PIN/passcode/password/security-code values, long phone/account-like numbers, and long token-like strings. The server still re-applies PA-1B policy on ingestion.

## Offline spool

Room schema advances from version 1 to 2 through a non-destructive migration adding nullable sender/title/body/redactedTitle/redactedBody columns. Existing metadata-only rows survive.

Before upload, queued rows are re-sanitized against the latest cached policy and the sanitized copy is written back to Room. A policy downgrade therefore strips or redacts queued evidence before transport.

## Boundaries

PA-3B3 does not grant notification access, grant Chernobog permissions, execute tools, send messages, or bypass PA-1B. Notification content is never logged.
