# Chernobog PA-2D2 — Notification Listener & Offline Spool

PA-2D2 turns the accepted Android companion into a real notification sensor.

## Runtime path

```text
Android NotificationListenerService
        ↓
local PA policy cache
        ↓
metadata-only normalization
        ↓
Room durable spool
        ↓
WorkManager network constraint
        ↓
PA-2C reconcile
        ↓
PA-2C upload
        ↓
delete only acknowledged event IDs
```

## Privacy boundary

PA-2D2 deliberately persists **metadata only**:

- event ID
- package name
- app label
- Android notification key
- category
- channel ID
- posted time
- effective capture mode
- local delivery bookkeeping

It does **not** persist:

- sender identity
- notification title
- notification body
- redacted title/body
- arbitrary notification extras

Content capture remains a later explicitly governed slice.

If the cached PA policy is `disabled`, newly posted notifications are ignored and any existing local spool is purged by the sync worker.

## Stable identity

The event ID is a SHA-256 derived from:

```text
package name + notification key + post time
```

This keeps the event ID stable across local WorkManager retries and duplicate listener callbacks for the same posting.

## Reconnect behavior

WorkManager runs only when Android reports a connected network.

For each batch it:

1. reconciles stable event IDs with PA-2C,
2. deletes already acknowledged IDs,
3. uploads only remaining events,
4. deletes only IDs acknowledged by PA-2C,
5. retries transient network/server failures.

## Human permission

Android notification-listener access remains a user-granted system permission. The companion exposes an `OPEN NOTIFICATION ACCESS` button but does not grant the permission itself.
