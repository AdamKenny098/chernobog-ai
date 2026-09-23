# Chernobog PA-3B1 — Notification Intelligence Core

PA-3B1 is the deterministic intelligence layer between sanitized notification observations and the PA-3A1 responsibility ledger.

## Pipeline

```text
sanitized notification
      ↓
classification
      ↓
correspondence assessment
      ↓
action assessment
      ↓
importance assessment
      ↓
responsibility recommendation
      ↓
PA-3A1 create / replay / merge
```

## Conservative promotion rule

Metadata-only observations may be classified, but they **cannot create a responsibility**.

This prevents:

```text
WhatsApp notification
```

from being silently converted into:

```text
Reply to someone
```

without semantic evidence.

A responsibility is promoted only when sanitized content contains a deterministic, sufficiently high-confidence action signal.

## Content preference

If both are present, PA-3B1 prefers:

```text
redactedTitle / redactedBody
```

over:

```text
title / body
```

PA-3B1 does not persist raw notification content in its intelligence journal.

The journal records only:

- event ID
- classification + confidence
- correspondence decision + confidence
- action decision + confidence
- importance
- content-availability class
- projection outcome
- responsibility ID, when created

## Deduplication

The canonical notification `eventId` becomes the PA-3A1 source ID.

Replaying the same event therefore resolves to:

```text
source-replayed
```

rather than creating another responsibility.

## Correlation

For direct correspondence where a permitted sender identity exists, PA-3B1 hashes:

```text
application + sender
```

into a non-human-readable merge key.

This permits repeated messages from the same correspondent in the same app to attach as evidence to one active responsibility without storing the sender inside the correlation key.

PA-3B1 deliberately does not fuzzy-merge notifications without sender/thread evidence.

## Authority boundary

PA-3B1 can:

- analyze sanitized notification evidence;
- create or merge PA-3A1 responsibilities;
- record an explainable analysis journal.

It cannot:

- execute tools;
- send messages;
- grant permissions;
- alter external systems.

## Next slice

PA-3B2 will invoke this core from the accepted PA-2C notification-ingress path after PA-2C has enforced capture/privacy policy.
