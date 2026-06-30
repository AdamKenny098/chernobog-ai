# V5.6.2 — Structured Vault Memory Hardening

## Purpose

V5.6.2 hardens the existing `vault-brain` module into a stricter structured memory foundation.

This milestone is intentionally not an agent milestone. It does not build Chernobog Inc departments, missions, autonomous workers, or company UI.

Its job is to make vault memory safe enough for those systems later.

## Completion Target

Chernobog has a structured vault memory foundation that can:

- distinguish raw, candidate, reviewed, approved, rejected, stale, and superseded memory
- prevent raw memory from automatically becoming approved memory
- bind memory to projects and versions
- classify memory by source and memory type
- maintain a structured memory manifest
- build a clean memory context packet for later vault-only and vault-first answering

## Memory Status Flow

```txt
raw
  -> candidate
  -> reviewed
  -> approved
```

Alternative outcomes:

```txt
rejected
stale
superseded
```

Hard rule:

```txt
raw -> approved is invalid
candidate -> approved is invalid
reviewed -> approved is valid
```

## Memory Types

V5.6.2 supports these formal memory types:

```txt
raw
summary
task
decision
bug
idea
roadmap
code-summary
project-state
identity
rule
```

## Memory Entry Shape

Every structured memory entry supports:

```txt
id
title
body
source
memoryType
status
projectId
version
tags
confidence
createdAt
updatedAt
sourceRef
```

Additional optional fields include:

```txt
supersedes
supersededBy
review
metadata
```

## Store Location

Structured memory is stored under:

```txt
vault/chernobog/system/vault-brain/structured-memory/
```

The main files are:

```txt
entries.json
manifest.json
audit-log.json
```

## Verification

Run:

```bash
npm run chernobog:v5.6.2:verify
npx tsc --noEmit
npm run lint
```

Pass means the structure exists, the status flow is enforced, approved-only filtering works, and the repo still type-checks/lints.
