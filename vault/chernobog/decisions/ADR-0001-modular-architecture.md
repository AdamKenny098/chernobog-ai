---
type: decision
project: Chernobog
status: accepted
updated: 2026-05-22
tags:
  - chernobog
  - adr
  - architecture
  - modules
---

# ADR-0001 - Modular Architecture

## Decision

Chernobog will grow through modules under `lib/modules/*` instead of continuously expanding the central command pipeline.

## Context

The command pipeline, parser, and tool registry have grown as Chernobog gained memory, planning, file workflow, execution, self-development, and vault abilities.

The Obsidian vault module proved that a capability can live outside the core and still integrate through parser, handler, tool, and follow-up hooks.

## Consequences

Positive:

- less core bloat
- clearer ownership
- safer future features
- easier testing by domain
- better roadmap structure

Tradeoff:

- module contracts need discipline
- registration points must be designed carefully
- follow-up priority becomes important

## Rule

If a feature owns domain-specific state or follow-up behavior, it should usually become a module.

## Related

- [[Module Map]]
- [[Module Contract]]
- [[Refactor Targets]]
