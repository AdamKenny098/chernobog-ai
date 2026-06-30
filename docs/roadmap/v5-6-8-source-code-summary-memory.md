# Chernobog V5.6.8 — Source Code Summary Memory

## Purpose

V5.6.8 adds the first safe bridge between the repository and structured vault memory.

The goal is not to dump raw source code into approved memory.

The goal is to create reviewable `code-summary` memory candidates that describe source files, modules, routes, exports, functions, and obvious file roles. These summaries can then move through the existing V5.6.4 review and approval flow.

## Scope

V5.6.8 adds:

- deterministic source file scanner
- code-summary analysis model
- candidate memory writer
- command bridge for code-summary memory
- verification script
- docs for the code-summary memory policy

## Non-goals

V5.6.8 does not add:

- autonomous agents
- Chernobog Inc departments
- mission execution
- automatic approval of code memory
- LLM summarisation of raw source
- full semantic code search

## Commands

```txt
show code summary memory status
scan code summary memory
scan code summary memory for lib/modules/vault-brain
create code summary candidates
create code summary candidates for lib/modules/vault-brain
list code summary memory
show code summary memory vault-brain
```

## Review rule

Generated code-summary memory entries are created as:

```txt
memoryType: code-summary
status: candidate
source: code
```

They are not approved vault truth until explicitly reviewed and approved.

## Completion condition

V5.6.8 is complete when Chernobog can scan source files, create `code-summary` candidate memory, preserve source references, avoid raw-source approval, and pass the verifier, TypeScript, and lint.
