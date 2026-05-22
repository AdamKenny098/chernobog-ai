---
type: decision
project: Chernobog
status: accepted
updated: 2026-05-22
tags:
  - chernobog
  - adr
  - pipeline
  - modules
---

# ADR-0003 - Domain Handlers Over Pipeline Bloat

## Decision

Chernobog should use domain handlers for module execution instead of embedding every domain's logic directly in `runCommand.ts`.

## Context

The Obsidian vault module required direct command execution and follow-up behavior.

Embedding this logic directly into the main pipeline would make the pipeline larger and harder to maintain.

## Chosen Pattern

```txt
parse command
→ detect domain
→ get domain handler
→ execute module/domain handler
→ return result to pipeline finalizer
```

## Consequences

Positive:

- `runCommand.ts` remains thinner
- modules own domain behavior
- more domains can be added safely
- follow-up conflicts can be handled by module priority

Tradeoff:

- domain handler registration must be kept current
- trace output should clearly show module routing

## Rule

New domain-specific behavior should go through the domain handler registry unless there is a strong reason not to.

## Related

- [[Pipeline Map]]
- [[Module Map]]
