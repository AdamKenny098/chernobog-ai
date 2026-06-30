# V5.9 — Mission System & Department Workers

## Purpose

V5.9 introduces controlled mission records for Chernobog Inc.

The goal is to let Chernobog structure work as missions assigned to departments and worker roles while keeping execution approval-gated and non-autonomous.

## Scope

V5.9 adds:

- mission schema
- mission store
- mission audit log
- department worker role profiles
- mission approval checkpoints
- mission status transitions
- mission commands
- mission API routes

## Non-goals

V5.9 does not add:

- free-roaming agents
- autonomous execution
- automatic tool use
- background workers
- repo writes from missions
- mission execution without approval

## Status flow

```txt
proposed
  ↓
approved
  ↓
in_progress
  ↓
blocked / needs_review / completed / rejected
```

Terminal states:

```txt
completed
rejected
```

## Required approval checkpoints

Every mission starts with:

```txt
ceo-approval
```

Security-scoped missions also include:

```txt
security-review
```

A mission cannot become approved until all required checkpoints are approved.

## Execution boundary

Every mission record has:

```txt
executionAllowed: false
toolExecutionAllowed: false
autonomousExecutionAllowed: false
```

This is deliberate. V5.9 creates mission structure, not uncontrolled workers.

## Completion condition

V5.9 is complete when Chernobog can:

- create mission records
- assign departments and worker roles
- require approval checkpoints
- update mission status safely
- audit mission lifecycle changes
- expose mission commands and API routes
- prove no mission can execute tools or act autonomously
