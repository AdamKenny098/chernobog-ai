# Chernobog V5.6.4 — Memory Review & Approval Commands

## Purpose

V5.6.4 makes structured vault memory reviewable without manually editing JSON files.

V5.6.2 created the structured memory model.
V5.6.3 created approved memory recall.
V5.6.4 adds the command-level workflow needed to move memory through review states safely.

This milestone does not add agents, missions, autonomous execution, or the Chernobog Inc UI.

## Core Rule

Raw memory must not automatically become approved memory.

The safe path is:

```txt
raw -> candidate -> reviewed -> approved
```

V5.6.4 keeps that rule enforced by the store and the review commands.

## Commands

```txt
show memory inbox
show candidate memory
show reviewed memory
show memory review queue
show memory entry <id>
review memory entry <id>
approve memory entry <id>
reject memory entry <id>
mark memory stale <id>
supersede memory entry <oldId> with <newId>
show memory audit log
```

## Completion Condition

V5.6.4 is complete when:

- candidate memory can be listed
- individual entries can be inspected
- candidates can be moved to reviewed
- reviewed entries can be approved
- raw entries cannot be directly approved
- rejected, stale, and superseded states can be applied safely
- review actions create audit events
- TypeScript and lint still pass

## Next Milestone

Recommended next milestone:

```txt
V5.6.5 — Project & Version Memory Profiles
```

The reason is straightforward: once memory can be reviewed, Chernobog needs stronger project/version profiles so approved memory can answer current-state questions reliably.
