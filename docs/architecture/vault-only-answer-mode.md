# Vault-Only Answer Mode Architecture

## Principle

The LLM is not the memory. The vault is the memory.

Vault-only answer mode exists to prevent Chernobog from silently mixing unapproved memory, raw intake, candidate notes, or outside model assumptions into project-history answers.

## Flow

```txt
user question
  ↓
command/API parser
  ↓
project/version scope resolver
  ↓
approved structured memory filter
  ↓
keyword relevance scoring
  ↓
deterministic source-backed answer
  ↓
insufficient-memory response when needed
```

## Policy

```ts
{
  mode: "vault-only",
  approvedOnly: true,
  allowCandidateMemory: false,
  allowRawMemory: false,
  allowOutsideModelMemory: false
}
```

## Why deterministic composition first?

This milestone intentionally avoids handing raw retrieved text to an LLM and pretending the result is safely grounded.

The deterministic answer composer is less advanced, but it proves the safety boundary first:

- only approved entries can be used
- source entry IDs are shown
- missing approved memory is admitted
- no raw/candidate decoys leak into answers

A later milestone can add LLM summarisation over the approved packet once this boundary is stable.

## Relationship to Previous Milestones

```txt
V5.6.2 — structured memory schema/store
V5.6.3 — approved memory recall bridge
V5.6.4 — memory review/approval commands
V5.6.5 — project/version memory profiles
V5.6.6 — vault-only answer mode
```

## Non-Goals

V5.6.6 does not add:

- autonomous agents
- missions
- departments
- proactive worker scans
- UI review panels
- LLM-based final answer generation

Those require this safer memory boundary first.
