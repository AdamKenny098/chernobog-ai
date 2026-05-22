---
type: doctrine
project: Chernobog
status: active
updated: 2026-05-22
tags:
  - chernobog
  - architecture
  - modules
  - doctrine
---

# Chernobog Module Map

## Purpose

This note defines how Chernobog should grow from a centralized command system into a modular personal assistant platform.

The core rule is simple:

> Chernobog core is the kernel. Modules own domain-specific behavior.

The pipeline may dispatch to modules, but it should not contain the business logic of every domain.

## Current Module Pattern

The first confirmed module is:

```txt
lib/modules/obsidian-vault/
```

It owns Obsidian/vault-specific behavior:

- vault command parsing
- vault command execution
- vault tools
- vault session continuity
- vault follow-ups
- backlinks/orphans/indexing
- vault-specific module payloads

This proves that Chernobog can grow through `lib/modules/*` instead of continuously expanding the central pipeline.

## Core Responsibilities

`lib/chernobog/` should remain the core/kernel layer.

Core responsibilities:

- receive user messages
- create and maintain trust traces
- maintain session identity
- run shared command parsing
- dispatch to module handlers
- execute deterministic tools through a shared registry
- save messages/state
- finalize UI payloads
- enforce approval/trust boundaries

Core should not permanently own every domain's workflow details.

## Module Responsibilities

Modules should own domain behavior.

A module may provide:

- command parser
- follow-up parser
- domain handler
- tool registry
- session adapter
- UI/module payload summary
- doctrine retrieval hooks
- safety rules

A module should not directly mutate unrelated global state unless routed through a core-approved adapter.

## Active Modules

### Obsidian Vault

Path:

```txt
lib/modules/obsidian-vault/
```

Purpose:

- Treat the local Obsidian vault as Chernobog's inspectable project knowledge graph.
- Search, read, create, append, link, review, and summarize vault notes.
- Track active note/search state for follow-up commands.

Related notes:

- [[Vault Module]]
- [[Pipeline Map]]
- [[Command Language]]
- [[ADR-0002 - Obsidian Vault as Project Knowledge Layer]]

## Recommended Future Modules

### File Workflow Module

Proposed path:

```txt
lib/modules/file-workflow/
```

Should own:

- file search/read/open command behavior
- selected file candidates
- `read the first one` for file results
- `open it` for files/folders
- active file state
- file/folder follow-up resolution

Reason:

File follow-ups currently compete with vault follow-ups. The file workflow should become a module with its own state and priority rules.

### Project Workspace Module

Proposed path:

```txt
lib/modules/project-workspace/
```

Should own:

- project note search/read behavior
- project source inspection
- project doctrine lookup
- active development target context
- workspace state summaries
- self-development grounding inputs

Reason:

Chernobog is becoming self-development capable. Repo/project awareness should not be scattered through generic execution handlers.

### Memory Review Module

Proposed path:

```txt
lib/modules/memory-review/
```

Should own:

- memory review commands
- memory/vault bridge behavior
- stale memory review
- promoting useful memory into vault notes
- explaining what Chernobog remembers and why

Reason:

V4.8's memory architecture needs review/control behavior to avoid random memory accumulation.

### Planner Module

Proposed path:

```txt
lib/modules/planner/
```

Should eventually own:

- plan creation
- plan continuation
- plan revision
- task conversion
- active plan/session continuity

Reason:

Planning should become a domain module instead of a set of special cases in the core pipeline.

## Module Addition Rule

A new module should not require large edits to `runCommand.ts`.

Preferred module registration points:

- parser registry
- follow-up handler registry
- domain handler registry
- tool registry composition
- optional UI payload registration

## Anti-Bloat Rule

If adding a feature requires more than a small dispatch hook in the core pipeline, it probably belongs in a module.

## Related

- [[Pipeline Map]]
- [[Refactor Targets]]
- [[Module Contract]]
- [[ADR-0001 - Modular Architecture]]
