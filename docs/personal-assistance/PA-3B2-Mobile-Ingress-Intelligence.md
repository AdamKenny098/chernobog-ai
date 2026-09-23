# Chernobog PA-3B2 — Real Mobile Ingress → Notification Intelligence

PA-3B2 connects the accepted PA-2C mobile notification ingress to PA-3B1 notification intelligence and the PA-3A1 responsibility ledger.

## Path

```text
Android companion
    ↓
PA-2C authenticated upload
    ↓
PA-1B capture/privacy enforcement
    ↓
durable sanitized notification
    ↓
Event Spine observation
    ↓
PA-3B1 analysis
    ↓
PA-3A1 create / replay / merge
```

## Critical ordering rule

PA-3B2 analyzes **only the stored PA-2C representation**.

It never analyzes the raw mobile request object directly.

That means sender/content fields stripped by PA-1B policy cannot leak into PA-3 intelligence.

## Retry safety

PA-2C writes notification receipts before PA-3B2 runs.

If intelligence processing fails after ingestion, PA-3B2 returns HTTP 503 with `retryable: true`.

On retry, PA-2C identifies the event as a duplicate, PA-3B2 reloads the already-sanitized stored notification, and intelligence runs again.

PA-3A1 source identity uses the stable notification event ID, so responsibility projection is idempotent.

## Capture-disabled behavior

Capture-disabled events have a PA-2C receipt but no durable notification row.

They are acknowledged to the phone but are not analyzed.

## Metadata-only behavior

The current Android companion deliberately sends metadata-only notification evidence.

PA-3B1 may classify that evidence, but its conservative promotion rule prevents it from inventing a responsibility without semantic content.

A later governed content-capture slice is required before the phone can create semantic responsibilities from notification text.

## Authority boundary

PA-3B2 may:

- publish the already-sanitized notification observation;
- classify it;
- score importance;
- detect correspondence/action;
- create or merge a PA-3A1 responsibility.

It may not:

- execute tools;
- send messages;
- grant permissions;
- bypass PA-1B capture/privacy policy.
