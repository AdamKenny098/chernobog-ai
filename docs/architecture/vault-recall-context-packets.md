# Architecture — Vault Recall and Context Packets

## Purpose

This document describes the V5.6.3 bridge between structured vault memory and answer preparation.

V5.6.2 created the structured memory store.
V5.6.3 makes it recallable.

## Flow

```txt
User query
  ↓
Structured recall request
  ↓
Project/version/type/status filters
  ↓
Structured memory query
  ↓
Memory context packet
  ↓
Deterministic vault-backed answer composer
  ↓
Future LLM answer layer
```

## Answer modes

### vault-only

Allowed truth source:

```txt
approved structured memory only
```

If no approved memory matches, Chernobog must say it does not know from approved vault memory yet.

### vault-first

Default safe source:

```txt
approved structured memory
```

Candidate/reviewed memory can only be included if a caller explicitly sets `allowCandidateContext`.

### general

General mode may exist for future mixed reasoning, but V5.6.3 still keeps the structured packet explicit.

## API policy

`POST /api/vault/recall` accepts:

```ts
{
  query: string;
  projectId?: string;
  version?: string;
  memoryTypes?: VaultMemoryType[];
  statuses?: VaultMemoryStatus[];
  tags?: string[];
  answerMode?: "vault-only" | "vault-first" | "general";
  allowCandidateContext?: boolean;
  limit?: number;
}
```

The endpoint sanitizes answer mode, statuses, memory types, and limit.

For `vault-only`, the recall policy overrides any unsafe status input and only permits approved entries.

## Why deterministic answer composition exists

The deterministic answer composer is intentionally simple.

It does not pretend to be the final Chernobog reasoning layer.

Its purpose is to prove that Chernobog can:

- retrieve structured approved memory
- show supporting entries
- avoid raw/candidate contamination
- return an unsupported answer when approved memory is missing

Once this is stable, a future LLM answer layer can consume the same packet.

## Non-goals

V5.6.3 does not add:

- agents
- departments
- missions
- autonomous execution
- Chernobog Inc UI
- automatic approval
- background scans
- embedding/vector search

Those depend on a trustworthy memory substrate first.
