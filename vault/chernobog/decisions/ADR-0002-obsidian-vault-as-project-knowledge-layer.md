---
type: decision
project: Chernobog
status: accepted
updated: 2026-05-22
tags:
  - chernobog
  - adr
  - vault
  - memory
---

# ADR-0002 - Obsidian Vault as Project Knowledge Layer

## Decision

Chernobog will use a local Obsidian-style Markdown vault as an inspectable project knowledge layer.

## Context

SQLite memory is useful for operational assistant memory, but it is not ideal as the only source of durable project doctrine.

The vault gives Chernobog and the operator a shared, readable knowledge graph.

## The Vault Stores

- roadmap state
- architecture doctrine
- file maps
- design doctrine
- patch safety rules
- known failures
- module maps
- self-development rules
- ADRs
- checklists

## The Vault Does Not Replace

- runtime session state
- SQLite memories
- source control
- approval-gated project writes

## Rule

Before self-development proposals or patch plans, Chernobog should retrieve relevant vault doctrine.

## Related

- [[Vault Module]]
- [[Self-Development Rules]]
- [[Patch Safety Rules]]
