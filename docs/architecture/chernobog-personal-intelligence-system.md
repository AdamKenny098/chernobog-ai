# Chernobog Personal Intelligence System Architecture

## Design Rule

Chernobog V6.0 is a unification layer, not an autonomy unlock.

The system can interpret, route, propose, report, and dry-run. It cannot freely execute.

## Main Components

```txt
personalIntelligenceTypes.ts
  Shared V6 operating-loop types.

personalIntelligenceOperatingLoop.ts
  Builds V6 operating packets and system status.

personalIntelligenceCommands.ts
  Exposes V6 command bridge commands.

/api/chernobog-inc/personal-intelligence
  GET system status.
  POST operating packet from CEO direction.
```

## Relationship to Earlier Milestones

V6.0 depends on:

- V5.6.2 structured memory
- V5.6.3 approved memory recall
- V5.6.6 vault-only answer mode
- V5.6.9 current state briefings
- V5.7 governance
- V5.8 Chernobog Inc foundation
- V5.9 mission system
- V5.9.5 controlled execution planning
- V5.9.6 readiness reporting

## Boundary Model

V6.0 keeps these boundaries literal:

```txt
executionAllowed: false
toolExecutionAllowed: false
autonomousExecutionAllowed: false
freeRoamingAgentsAllowed: false
```

## Memory Policy

Project history must come from approved structured memory.

Any memory update created as a result of V6 work must enter the structured review flow as candidate memory. Raw memory cannot become approved truth automatically.

## Governance Policy

Every operating packet receives a trust decision before mission proposal or controlled execution planning is considered.

Blocked governance decisions remain blocked.

## Future Direction

Later milestones may add a real execution runner, but only after:

- explicit CEO approval
- security review
- rollback strategy
- audit trail
- dry-run report
- governance pass

V6.0 is the command center, not the unlocked executor.
