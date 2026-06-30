# Chernobog V5.6.3 — Approved Memory Recall Bridge

## Status

Implementation package.

## Purpose

V5.6.2 hardened the vault-brain module with structured memory entries, memory statuses, project/version binding, a manifest, and a safe status flow.

V5.6.3 connects that structured memory layer to recall and answer preparation.

The goal is not to build agents, departments, missions, autonomous workers, or Chernobog Inc UI.

The goal is to make Chernobog capable of building a safe memory context packet from structured vault memory, especially approved memory.

## Main outcomes

- Approved structured memory can be recalled through a dedicated helper.
- Vault-only recall is approved-only by policy.
- Raw and candidate memory do not silently become answer truth.
- A POST API endpoint can build recall packets.
- Vault-brain commands can inspect structured memory status and recall approved memory.
- Deterministic structured answer composition exists as a safe stepping stone before LLM answer integration.

## Added command examples

```txt
show structured memory status
show structured memory manifest
recall approved memory Chernobog V5.6.2
recall vault memory Chernobog roadmap
ask approved vault what is the current Chernobog state?
ask structured vault what is next for V5.6?
build memory context packet Chernobog roadmap
```

## Added API

```txt
POST /api/vault/recall
```

Example body:

```json
{
  "query": "What is next for V5.6?",
  "projectId": "chernobog",
  "version": "v5.6",
  "answerMode": "vault-only",
  "limit": 8
}
```

## Trust rule

Vault-only mode must only use approved structured memory.

This is the key test:

```txt
raw memory      -> excluded from vault-only recall
candidate memory -> excluded from vault-only recall
reviewed memory  -> excluded from vault-only recall
approved memory  -> allowed in vault-only recall
```

Reviewed and candidate entries may be used later for review workflows, but they are not approved truth.

## Completion condition

V5.6.3 is complete when:

- structured memory recall works from the stored `entries.json`
- vault-only recall returns approved entries only
- context packets can be built from structured memory
- a safe deterministic answer can be composed from the packet
- `/api/vault/recall` returns a structured recall result
- the verification script passes
- `npx tsc --noEmit` passes
- `npm run lint` has 0 errors

## Safe next step

After this milestone passes, V5.6.4 can begin adding review/approval commands or import-to-candidate workflows.

Do not jump to agent departments yet. The memory layer still needs approval ergonomics and source population before Chernobog Inc orchestration is worth building.
