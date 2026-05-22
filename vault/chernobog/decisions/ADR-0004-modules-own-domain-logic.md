---
type: decision
project: Chernobog
status: accepted
updated: 2026-05-22
tags:
  - chernobog
  - adr
  - modules
  - architecture
---

# ADR-0004 - Modules Own Domain Logic

## Decision

Domain-specific logic should live inside modules where possible.

## Context

Chernobog has multiple domains that behave like independent systems:

- files
- vault
- memory
- planner
- project workspace
- self-development
- future web/calendar/email systems

If all domain behavior lives in the core, Chernobog becomes a monolith.

## Rule

Modules should own:

- parser details
- command execution
- follow-up resolution
- domain state
- domain-specific reply formatting

Core should own:

- dispatch
- trust trace
- approval boundary
- persistence bridge
- final UI payload

## Next Candidate

The next recommended extraction is:

```txt
lib/modules/file-workflow/
```

Reason:

File workflow already has domain state and follow-ups, and it has already conflicted with vault follow-ups.

## Related

- [[Refactor Targets]]
- [[Module Contract]]
- [[Command Language]]
