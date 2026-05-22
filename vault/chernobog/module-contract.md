---
type: doctrine
project: Chernobog
status: draft
updated: 2026-05-22
tags:
  - chernobog
  - modules
  - contract
  - architecture
---

# Module Contract

## Purpose

This note defines the expected shape of a Chernobog module.

The exact TypeScript implementation can evolve, but the architectural rule should stay stable:

> Modules expose capabilities. Core dispatches capabilities.

## Recommended Module Shape

A Chernobog module may expose:

```ts
export type ChernobogModule = {
  id: string;
  displayName: string;
  parseCommand?: ModuleCommandParser;
  handleCommand?: ModuleDomainHandler;
  handleFollowUp?: ModuleFollowUpHandler;
  tools?: ModuleToolRegistry;
  summarizeState?: ModuleStateSummarizer;
};
```

## Parser

A module parser should recognize domain-specific commands and adapt them into the shared command language.

Example:

```txt
vault search memory architecture
```

Should become:

```txt
domain: vault
action: search
target: vault
query: memory architecture
```

## Domain Handler

A domain handler executes a recognized command.

It should return:

- route
- reply
- optional module payload

It should not directly finalize the entire Chernobog response.

## Follow-Up Handler

A follow-up handler should only activate when the module has enough recent state.

Example:

```txt
read the first one
```

This should only resolve to the vault module if a recent vault search exists.

## Tool Registry

Modules may export tools, but tools should be merged into the main tool registry in a controlled way.

Bad:

```ts
vault_tool_registry: vaultToolRegistry
```

Good:

```ts
...vaultToolRegistry
```

## Session State

Module-specific session state should stay inside the module where possible.

The core may store a summary or payload, but module details should not be scattered across unrelated files.

## UI Payload

Modules may return module payloads for UI/debug panels.

Suggested payload shape:

```ts
modulePayload: {
  moduleId: string;
  stateSummary?: string;
  activeObject?: unknown;
  resultCount?: number;
  warnings?: string[];
}
```

## Module Safety

A module must clearly define:

- safe automatic actions
- actions requiring notice
- actions requiring approval
- forbidden actions

## Related

- [[Module Map]]
- [[Pipeline Map]]
- [[Refactor Targets]]
