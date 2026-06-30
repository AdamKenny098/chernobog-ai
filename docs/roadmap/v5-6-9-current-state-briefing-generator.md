# Chernobog V5.6.9 — Current State Briefing Generator

## Purpose

V5.6.9 adds a controlled current-state briefing layer on top of the structured vault memory foundation.

The goal is to let Chernobog answer the operational question:

```txt
Where are we right now?
```

without guessing from general model memory, loose chat history, raw imports, or candidate memory.

## Scope

V5.6.9 uses:

```txt
- approved structured memory
- project profiles
- version profiles
- current project state
```

It does not introduce:

```txt
- agents
- departments
- missions
- autonomous execution
- Chernobog Inc UI
```

## Briefing Inputs

The briefing generator reads approved memory entries of these types:

```txt
project-state
roadmap
decision
task
bug
summary
code-summary
```

Candidate, raw, reviewed, rejected, stale, and superseded memory are excluded.

## Commands

```txt
show current state briefing
generate current state briefing
generate current milestone briefing
show current milestone briefing
brief me
brief me on Chernobog
generate project briefing Chernobog
show project briefing Chernobog
show version briefing v5.6.9
generate version briefing v5.6.9
show briefing policy
show current state briefing policy
```

## API

```txt
POST /api/vault/briefing
```

Example body:

```json
{
  "query": "brief me on Chernobog",
  "projectId": "chernobog",
  "version": "v5.6.9",
  "limitPerSection": 5,
  "includeCodeSummaries": true
}
```

## Completion Condition

V5.6.9 is complete when Chernobog can generate a current-state briefing that:

```txt
- resolves active project/version state
- includes latest completed and next recommended versions
- groups approved memory by useful sections
- cites source entry IDs
- excludes raw/candidate memory
- warns when approved memory is missing
```

## Next Milestone

After V5.6.9 passes, the next major milestone should be:

```txt
V5.7 — Trust, Permissions & Governance
```

The memory foundation is now strong enough to begin formal permission and governance work.
