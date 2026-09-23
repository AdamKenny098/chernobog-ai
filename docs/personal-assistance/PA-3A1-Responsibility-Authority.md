# Chernobog PA-3A1 — Responsibility Authority & Durable Ledger

PA-3A1 establishes the canonical workload object that Steward will manage.

## Why responsibilities

Notifications, messages, calendar changes and work-schedule updates are **evidence**.

They are not themselves the user's workload.

Example:

```text
18:01 Sarah: Thursday?
18:04 Sarah: Just checking if that suits
18:12 Sarah: Need to know tonight
```

PA-3 should ultimately produce one responsibility:

```text
Reply to Sarah about Thursday
Priority: important
State: waiting-user
Evidence: 3 related observations
```

## State model

```text
detected
triaged
waiting-user
waiting-external
scheduled
delegated
resolved
dismissed
```

Closed responsibilities may only be deliberately reopened to `triaged`.

## Priority

```text
low
normal
important
critical
```

## Persistence

PA-3A1 stores:

```text
data/personal-assistance/responsibilities.json
data/personal-assistance/responsibility-events.jsonl
```

Writes to the canonical responsibility file are atomic.

The event ledger is append-only.

## Idempotence

If the same `source.type + source.sourceId` arrives again, it is treated as a replay rather than a new responsibility.

## Merge boundary

PA-3A1 does **not** perform fuzzy or LLM-driven merging.

It only merges new evidence when a later intelligence layer provides an explicit `mergeKey`.

This is deliberate. PA-3B will own classification/correlation confidence.

## Human gates

Transitioning to:

```text
waiting-user
```

sets:

```text
requiresHuman = true
```

Resolving or dismissing clears it.

## Authority boundary

PA-3A1 may:

- create responsibilities;
- update responsibility metadata;
- transition lifecycle state;
- merge explicitly correlated evidence;
- list/query responsibilities;
- maintain audit history.

PA-3A1 may not:

- execute tools;
- send messages;
- grant permissions;
- spend money;
- alter external systems.

Those remain separate governed capabilities.
