# Chernobog V5.6.7 — Memory Correction & Audit Trail

## Purpose

V5.6.7 hardens structured vault memory by making approved/candidate/reviewed entries correctable without silently rewriting history.

This milestone does not build agents, missions, departments, autonomous execution, or Chernobog Inc UI.

The goal is simple:

```txt
When memory is wrong, Chernobog can fix the field and keep a record of what changed.
```

## Why this matters

V5.6.2 created structured memory.
V5.6.3 added approved recall.
V5.6.4 added review and approval commands.
V5.6.5 added project/version profile state.
V5.6.6 added vault-only answering.

V5.6.7 closes the next safety gap: memory will sometimes be wrong, incomplete, badly scoped, or stale.

Correction must be explicit and auditable.

## New capabilities

- field-level memory corrections
- correction history per memory entry
- global correction audit trail
- safe metadata edits
- project/version re-binding
- tag correction
- confidence correction
- memory type correction
- correction events written to the structured memory audit log

## Correctable fields

```txt
title
body
source
memoryType
projectId
version
tags
confidence
sourceRef
reviewNotes
```

## Intentionally not correctable through this layer

```txt
status
```

Status changes must continue to use the V5.6.4 review/approval flow.

That means this remains blocked:

```txt
correct memory status <id> to approved
```

Approval must stay approval-gated.

## New commands

```txt
show memory corrections
show memory correction audit
show memory corrections for <id>
show memory correction history <id>
correct memory entry <id> <field> to <value>
correct memory <field> <id> to <value>
set memory entry <id> <field> to <value>
set memory <field> <id> to <value>
move memory entry <id> to project <projectId>
move memory entry <id> to version <version>
retag memory entry <id> as <tag1>, <tag2>
set memory confidence <id> to <number>
```

## Completion condition

V5.6.7 is complete when:

- memory fields can be corrected safely
- correction history is recorded
- correction actions appear in audit logs
- status correction is blocked
- project/version binding can be corrected
- verifier passes
- TypeScript and lint remain clean

## Next milestone

V5.6.8 should be **Source Code Summary Memory**.

That milestone should create structured code-summary memory for repo files without dumping raw source into the answer layer.
