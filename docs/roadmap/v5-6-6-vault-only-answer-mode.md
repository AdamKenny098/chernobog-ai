# Chernobog V5.6.6 — Vault-Only Answer Mode

## Purpose

V5.6.6 wires the structured memory work from V5.6.2 through V5.6.5 into a strict answer path.

The milestone does **not** build agents, missions, autonomous execution, or the Chernobog Inc UI. It adds a controlled way to answer from approved structured vault memory only.

## Scope

V5.6.6 adds:

- a vault-only answer policy
- deterministic approved-memory answer composition
- command helpers for vault-only questions
- `/api/vault/answer`
- verifier coverage proving raw/candidate memory cannot appear in vault-only answers

## Key Rule

Vault-only answers may only use memory entries with:

```txt
status = approved
```

The answer path must not use:

```txt
raw
candidate
reviewed
rejected
stale
superseded
outside model memory
```

## Commands

```txt
show vault only answer policy
answer from vault only <question>
ask vault only <question>
vault only answer <question>
ask approved vault <question>
answer from approved memory <question>
```

## API

```txt
POST /api/vault/answer
```

Example:

```json
{
  "query": "What is next for V5.6?",
  "projectId": "chernobog",
  "version": "v5.6.6",
  "memoryTypes": ["project-state", "roadmap", "decision"],
  "limit": 8
}
```

## Completion Condition

V5.6.6 is complete when:

- approved matching memory produces a source-backed vault-only answer
- raw/candidate memory is excluded even if textually relevant
- insufficient approved memory returns an honest insufficient-memory answer
- command route recognizes vault-only answer commands
- API route exists
- TypeScript and lint pass

## Next Milestone

Recommended next milestone:

```txt
V5.6.7 — Memory Correction & Audit Trail
```

That milestone should make field-level memory correction safer and easier before the system becomes more autonomous.
