# Mission System & Department Workers Architecture

## Overview

The V5.9 mission system is the controlled work ledger for Chernobog Inc.

It sits after:

- V5.8 — Chernobog Inc Foundation
- V5.7 — Trust, Permissions & Governance
- V5.6.x — Vault Brain Memory Foundation

It prepares for controlled execution later, but does not perform execution itself.

## Storage

Mission records are stored at:

```txt
vault/chernobog/system/chernobog-inc/missions/missions.json
vault/chernobog/system/chernobog-inc/missions/mission-audit-log.json
```

## Mission record

A mission records:

- id
- title
- objective
- status
- priority
- projectId
- version
- departments
- workerAssignments
- approvalCheckpoints
- execution flags
- tags
- notes
- audit timestamps

## Worker roles

Worker roles are planning/reporting profiles:

- project-lead
- planner
- designer
- creator
- reviewer
- security-analyst

Each worker role has:

```txt
mayExecuteTools: false
mayAutonomouslyAct: false
```

## Approval checkpoint model

Approval checkpoints are explicit records with:

- id
- title
- description
- required
- status
- approvedAt / rejectedAt
- notes

A required checkpoint blocks approval until it is approved.

## Command bridge

V5.9 patches `lib/modules/vault-brain/commands.ts` so mission commands can be routed through the existing vault-brain command bridge.

## API routes

V5.9 adds:

```txt
GET  /api/chernobog-inc/missions
POST /api/chernobog-inc/missions
POST /api/chernobog-inc/missions/checkpoint
POST /api/chernobog-inc/missions/status
```

## Safety boundary

Mission status is not permission to execute tools.

A mission can become `approved` or `in_progress`, but it still keeps:

```txt
executionAllowed: false
toolExecutionAllowed: false
autonomousExecutionAllowed: false
```

Controlled execution belongs to a later milestone.
