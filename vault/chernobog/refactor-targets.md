---
type: doctrine
project: Chernobog
status: active
updated: 2026-05-22
tags:
  - chernobog
  - refactor
  - modules
  - v4-9
---

# Chernobog Refactor Targets

## Purpose

This note records infrastructure that should be modularized or thinned before Chernobog grows further.

The goal is not to rewrite everything. The goal is to extract one stable domain at a time.

## Refactor Priority

### 1. File Workflow

Current issue:

File workflow follow-ups such as `read the first one` can compete with vault follow-ups.

Target:

```txt
lib/modules/file-workflow/
```

Should own:

- file search commands
- file read/open commands
- file result candidates
- selected/active file state
- file-specific follow-ups
- containing folder behavior

Reason:

File workflow is the most obvious next module because it already behaves like a domain.

### 2. Module Registry

Current issue:

Modules currently require manual integration points.

Target:

```txt
lib/chernobog/modules/
```

or:

```txt
lib/chernobog/module-system/
```

Should own:

- module list
- parser registration
- follow-up registration
- domain handler registration
- tool registry composition
- module payload conventions

Reason:

Adding a module should not require repeated core file edits.

### 3. Pipeline Thinning

Current issue:

`runCommand.ts` is responsible for too many decisions.

Target:

Keep it as:

- trace start
- command parse
- module dispatch
- core fallback dispatch
- final payload

Move out:

- domain-specific workflows
- repeated command handling patterns
- hardcoded future module logic

### 4. Project Workspace Doctrine

Current issue:

Project self-development knowledge is spread across execution logic and vault notes.

Target:

```txt
lib/modules/project-workspace/
```

Should own:

- project doctrine retrieval
- file map lookup
- active development target context
- project note search/read wrappers
- self-development prompt context assembly

### 5. Memory Review

Current issue:

Memory and vault now overlap but should remain distinct.

Target:

```txt
lib/modules/memory-review/
```

Should own:

- memory inspection
- memory/vault bridge
- stale memory review
- memory promotion into vault
- explaining memory source/freshness

## Do Not Refactor Yet

Avoid extracting these until the first module extraction succeeds:

- full planner system
- full execution system
- LLM router
- trust layer
- UI dashboard layout

These are higher-risk and should wait.

## Safe Refactor Pattern

For each extraction:

1. Document current behavior.
2. Create module folder.
3. Move parser/handler/session code into module.
4. Keep old public behavior unchanged.
5. Typecheck.
6. Test old commands.
7. Commit.

## Success Criteria

A successful refactor makes the core smaller without changing operator-facing behavior.

Bad refactor:

- breaks commands
- changes command wording unexpectedly
- rewrites unrelated files
- moves too much at once

Good refactor:

- one domain extracted
- old commands still work
- pipeline is thinner
- module owns its state
- trust trace still explains the route

## Related

- [[Module Map]]
- [[Pipeline Map]]
- [[Command Language]]
- [[ADR-0004 - Modules Own Domain Logic]]
