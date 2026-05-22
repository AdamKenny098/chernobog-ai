---
type: doctrine
project: Chernobog
status: active
updated: 2026-05-22
tags:
  - chernobog
  - pipeline
  - modules
  - architecture
---

# Chernobog Pipeline Map

## Purpose

This note defines the intended command flow for Chernobog after the Obsidian vault module milestone.

The goal is to keep `runCommand.ts` as a dispatch/orchestration layer, not a dumping ground for every feature.

## Intended Flow

```txt
User message
→ API route
→ command pipeline
→ high-priority hard guards
→ module follow-up handlers
→ unified command parser
→ module command parsers
→ command help/context handlers
→ module domain handlers
→ core memory/planner/tool fallbacks
→ legacy fallback if needed
→ response finalization
→ trust trace
→ UI payload
```

## Module Follow-Up Priority

Module follow-up checks should happen before old generic file workflow resolution when a module has recent active state.

Example:

```txt
vault search memory
read the first one
```

The second command should resolve through the vault module if the active state is a vault search.

It should not fall through to generic file search and fail as:

```txt
Search for the first one
Read selected file
```

## Domain Handler Priority

Once a command is normalized into a module domain, the domain handler registry should execute it.

Example:

```txt
vault status
```

Expected path:

```txt
parseUnifiedCommand
→ domain: vault
→ getDomainHandler("vault")
→ handleVaultCommand
→ vault tool/module result
```

## Core Should Handle

Core pipeline responsibilities:

- route setup
- trace setup
- hard safety checks
- command parsing entry
- module dispatch
- session/message save
- response finalization
- trust/debug payloads

## Core Should Not Own

Core pipeline should not contain long-term logic for:

- Obsidian-specific note behavior
- file search/read/open workflow internals
- planner-specific task management details
- project workspace doctrine search
- memory review behavior
- future web/email/calendar workflows

These should be modules.

## Known Risk

The current danger is incremental bloat.

Every time a new feature is added directly into `runCommand.ts`, the pipeline becomes harder to test, harder to reason about, and harder to trust.

## Near-Term Refactor Direction

1. Keep the vault module as the working module example.
2. Add a formal module registry.
3. Extract file workflow behavior into `lib/modules/file-workflow/`.
4. Move file follow-up state into a file module session adapter.
5. Keep `runCommand.ts` focused on routing and finalization.

## Related

- [[Module Map]]
- [[Refactor Targets]]
- [[Command Language]]
- [[ADR-0003 - Domain Handlers Over Pipeline Bloat]]
