# Structured Memory Review & Approval Flow

## Overview

The structured vault memory layer uses status gates so untrusted information does not become trusted project memory by accident.

## Statuses

```txt
raw
candidate
reviewed
approved
rejected
stale
superseded
```

## Allowed Transitions

```txt
raw -> candidate
raw -> rejected
raw -> stale

candidate -> reviewed
candidate -> rejected
candidate -> stale
candidate -> superseded

reviewed -> approved
reviewed -> candidate
reviewed -> rejected
reviewed -> stale
reviewed -> superseded

approved -> stale
approved -> superseded

stale -> superseded
```

The important blocked transitions are:

```txt
raw -> approved
candidate -> approved
```

A candidate must be reviewed before approval.

## Audit Trail

Each review command writes an audit event to:

```txt
vault/chernobog/system/vault-brain/structured-memory/audit-log.json
```

The audit event records:

- entry ID
- action
- previous status
- next status
- actor
- note
- timestamp

## Files

```txt
lib/modules/vault-brain/memoryReview.ts
lib/modules/vault-brain/memoryStore.ts
lib/modules/vault-brain/memoryStatus.ts
scripts/verify-chernobog-v5-6-4.ts
```

## Design Boundary

This architecture intentionally avoids autonomous memory promotion.

Review commands can promote memory, but only through explicit user command paths. Future UI can call the same lower-level functions, but the status transition rules should remain in the store.
