---
type: doctrine
project: Chernobog
status: active
updated: 2026-05-22
tags:
  - chernobog
  - command-language
  - modules
  - v4-9
---

# Chernobog Command Language

## Purpose

Chernobog needs a consistent command grammar across files, vault notes, memory, planner state, apps, and future modules.

The goal is not to make commands rigid. The goal is to make them predictable.

## Current Direction

Commands should normalize into a shared command shape:

```txt
domain
name of the subsystem/capability

action
what the operator wants done

target
what kind of object is affected

reference
how the target is identified

query/content
extra data needed by the command
```

## Core Domains

Known/current domains:

```txt
memory
planner
file
app
workflow
context
chat
guardian
vault
```

Future module domains may include:

```txt
project
web
calendar
email
voice
system
```

## Desired Command Families

### Search

```txt
search files for roadmap
search vault for memory architecture
search memory for Chernobog
search project notes for patch safety
```

### Read

```txt
read the first file
read the first vault note
read it
read active note
read project doctrine about patch safety
```

### Open

```txt
open downloads
open the first file
open the active folder
open vault note Memory Architecture
```

### Remember / Save

```txt
remember that X
save this to the vault as a decision
append this to today's dev log
promote this memory into the vault
```

### Link

```txt
link this note to Memory Architecture
link Vault Module to Module Map
link current task to V4.9 modularization
```

### Review

```txt
review vault status
review memory about Chernobog
show stale notes
show orphan notes
show active module state
```

## Follow-Up Rules

Follow-ups should resolve through the most recent active domain when that domain has valid state.

Examples:

```txt
vault search memory
read the first one
```

This should use vault state.

```txt
find files roadmap
read the first one
```

This should use file state.

## Priority Rule

Follow-up handlers should be ordered by active state, not by whichever legacy parser catches the phrase first.

Bad:

```txt
read the first one → generic file workflow always
```

Good:

```txt
read the first one → active module state decides
```

## V4.9 Goal

V4.9 should not only add new commands. It should reduce inconsistent one-off command behavior.

V4.9 should create:

- module parser registry
- module follow-up registry
- domain handler registry
- shared command action names
- predictable fallback behavior
- command help that reflects real capabilities

## Related

- [[Module Map]]
- [[Pipeline Map]]
- [[Refactor Targets]]
