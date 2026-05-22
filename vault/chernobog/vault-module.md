---
type: module
project: Chernobog
status: active
updated: 2026-05-22
tags:
  - chernobog
  - module
  - vault
  - obsidian
---

# Vault Module

## Purpose

The Obsidian vault module connects Chernobog to a local Markdown vault used as project knowledge, doctrine, and long-term inspectable memory.

This module is the first working proof that Chernobog can grow through modular capabilities instead of bloating the central pipeline.

## Path

```txt
lib/modules/obsidian-vault/
```

## Owns

The module owns:

- vault command parsing
- vault command execution
- vault tools
- Markdown note reading/writing
- wikilink extraction
- backlink detection
- orphan note detection
- project index generation
- active vault session state
- vault follow-up resolution
- vault status/review replies

## Does Not Own

The vault module should not own:

- generic file workflows
- global planner state
- core memory database implementation
- arbitrary project file writes
- approval policy for source patching
- UI layout

It may provide context and doctrine to other systems, but it should not become the whole assistant.

## Confirmed Capabilities

Working command families:

```txt
vault status
vault search <query>
vault read <note>
vault create <type> <title>
vault append <note>: <content>
vault link <note> to <note>
vault backlinks <note>
vault find orphans
vault review <query>
what does the vault know about <topic>
```

Working follow-up families:

```txt
read the first one
show backlinks for it
link it to <note>
append this to it: <content>
```

## Session State

The module should track:

- active vault note
- last vault search
- last graph action
- last vault action
- follow-up candidates

## Safety Position

Vault writing is less dangerous than source-code patching, but it still needs discipline.

Safe vault writes:

- append dev logs
- create doctrine notes
- create ADR notes
- link notes
- create project indexes

Riskier vault writes:

- overwriting major doctrine notes
- bulk rewriting the vault
- deleting notes
- moving notes automatically

Deletion and bulk rewrites should require explicit operator approval.

## Strategic Role

The vault is not just storage.

The vault is Chernobog's project knowledge graph:

- what exists
- why it exists
- what failed before
- what files are sensitive
- what roadmap stage is active
- what rules govern patching
- what architecture Chernobog should preserve

## Related

- [[Module Map]]
- [[Pipeline Map]]
- [[ADR-0002 - Obsidian Vault as Project Knowledge Layer]]
- [[Self-Development Rules]]
- [[Patch Safety Rules]]
