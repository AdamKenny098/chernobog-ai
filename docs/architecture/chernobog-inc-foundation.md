# Chernobog Inc Foundation Architecture

## Architecture rule

Chernobog Inc is an organizational model, not an autonomy bypass.

V5.8 defines structure. It does not create free-running agents.

## Layer position

```txt
Vault Memory Foundation
  ↓
Trust / Governance
  ↓
Chernobog Inc Foundation
  ↓
Future Mission System
  ↓
Future Controlled Execution
```

## Executive Core

The Executive Core receives CEO direction and converts it into structured reports or work proposals.

It does not execute tools directly.

## Departments

Departments provide scoped perspectives:

- Engineering: code and implementation planning
- Design: interface and product feel
- Narrative: lore, writing, continuity
- Research: evidence-backed findings
- Operations: roadmap and current-state coordination
- Security: risk, approval, and governance

## Roles

Roles are reusable responsibility profiles used inside departments.

In V5.8 every role has:

```txt
mayExecuteTools: false
```

Execution belongs to later governed layers.

## Proposals

Work proposals are stored under:

```txt
vault/chernobog/system/chernobog-inc/proposals.json
```

They are not missions. They are not execution plans. They are reviewable proposal records.

Every proposal starts with:

```txt
status: proposed
executionAllowed: false
approvalGate.required: true
```

## API routes

```txt
GET  /api/chernobog-inc/structure
GET  /api/chernobog-inc/proposals
POST /api/chernobog-inc/proposals
```

## Safety boundary

V5.8 must remain safe to use before agentic features exist.

It may:

- display structure
- display departments
- display role catalog
- display report format
- create proposed work records

It may not:

- execute work
- launch agents
- create autonomous missions
- bypass approvals
- promote memory approval state
- override governance decisions
