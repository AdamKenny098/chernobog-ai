# Structured Vault Memory Architecture

## Overview

Structured Vault Memory is the hardening layer beneath future Chernobog Inc behaviour.

The old vault brain index can still index notes and chunks. This layer adds formal memory entries with trust status, project binding, version binding, type classification, and context packet generation.

## Design Rules

1. Raw memory is preserved, not trusted.
2. Candidate memory is proposed, not final.
3. Reviewed memory can become approved.
4. Approved memory is the only safe default source for vault-only answers.
5. Rejected, stale, and superseded memory remain available for audit/history but should not be normal recall.
6. Project and version fields prevent cross-project contamination.
7. The LLM receives a controlled memory context packet, not the whole vault.

## Main Files

```txt
lib/modules/vault-brain/memoryTypes.ts
lib/modules/vault-brain/memoryStatus.ts
lib/modules/vault-brain/projectScope.ts
lib/modules/vault-brain/memoryManifest.ts
lib/modules/vault-brain/memoryStore.ts
lib/modules/vault-brain/memoryContextPacket.ts
```

## Store Files

```txt
system/vault-brain/structured-memory/entries.json
system/vault-brain/structured-memory/manifest.json
system/vault-brain/structured-memory/audit-log.json
```

## Answer Safety

Vault-only answer mode must use approved structured memory only.

Vault-first mode may use approved memory first. Candidate/reviewed memory can be included only when explicitly allowed and must be treated as non-final context.

General mode can behave normally, but Chernobog project history should prefer vault-first or vault-only flows.
