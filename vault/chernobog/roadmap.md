# Chernobog Roadmap

## Current Milestone

Chernobog is moving through the memory/vault/module transition.

The current practical milestone is:

```txt
Vault foundation complete
→ vault doctrine seeded
→ modular core formalized
→ bloated workflow domains extracted
```

## Completed or Functionally Working

### Command Interface and Tool Foundation

Implemented:

- local command interface
- Chernobog visual dashboard direction
- tool execution foundation
- file search/read/open workflows
- memory/state experimentation
- trust/debug visibility

### Execution Core

Implemented:

- structured execution tasks
- execution steps
- risk levels
- approval-gated operations
- execution state tracking

### Tool Expansion

Implemented:

- create folder
- create text file
- append text file
- open file/folder
- rename/copy/move/list/path info workflows
- project command execution
- project file writing

### Self-Development Alpha

Implemented:

- self-inspection targets
- active development target/files
- AI-backed proposal generation
- proposal validation against allowed files
- rejected proposal fallback
- prepared patch plans
- guarded patch generation attempts
- patch rejection for unsafe output
- model routing for default/code brains

### Obsidian Vault Foundation

Implemented:

- vault folder at `vault/chernobog/`
- project doctrine notes
- Obsidian vault module under `lib/modules/obsidian-vault/`
- vault search/read/create/append/link/backlinks/orphans/status/review commands
- vault follow-up handling for active search/note state

## Immediate Milestone: Vault Doctrine Seed

Goal:

Populate the vault with enough architecture doctrine to guide the next modularization pass.

Deliverables:

- [[Module Map]]
- [[Pipeline Map]]
- [[Command Language]]
- [[Vault Module]]
- [[Refactor Targets]]
- [[Module Contract]]
- ADR notes
- checklists

Completion condition:

Chernobog's vault explains how Chernobog should be structured before the next code refactor begins.

## Next Milestone: Modular Core and Unified Commands

Goal:

Make modules first-class and reduce bloated central infrastructure.

Planned phases:

1. Formalize module registry.
2. Formalize follow-up handler registry.
3. Formalize domain handler registry.
4. Extract file workflow into `lib/modules/file-workflow/`.
5. Normalize command grammar across file/vault/memory/planner.
6. Update command help and debug parser output.

## Later Milestone: Diff-Based Patching

Goal:

Replace dangerous full-file rewrites with smaller patch operations.

Planned features:

- generate targeted diffs
- show diff before approval
- apply small patches
- reject broad rewrites
- patch only explicit code regions
- require validation after patching

## Later Milestone: Project Workspace Awareness

Goal:

Chernobog understands multiple project areas and can reason about current working context.

Planned features:

- project profile registry
- active project selection
- repository state summaries
- current milestone tracking
- automatic doctrine retrieval by project

## Long-Term Milestone: Near-Autonomous Assistant Foundation

Goal:

Chernobog becomes a more complete local personal AI system with reliable tool use, memory, project awareness, and controlled action.

Planned features:

- stronger planner
- task queue
- scheduled checks
- richer memory retrieval
- local OS control expansion
- approval policies
- trust dashboard
- long-running workflow support

## Current Rule

Do not add new major capability modules until the modular architecture is stable.

Next code target:

```txt
lib/modules/file-workflow/
```
