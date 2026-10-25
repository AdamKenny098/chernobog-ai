# OH-5B â€” Fresh governance core (initial implementation)

This is a NEW isolated governance contract built from clean OH-4 master. No legacy OH-5B branch was merged, and existing vault content was not modified.

## What this increment establishes

- Explicit project IDs are required for memory mutation and retrieval.
- Untrusted external sources may enter raw intake or candidate review, but may never confirm authoritative memory.
- Approval must be matching authenticated caller metadata bound to one memory, project, action, source evidence, actor and reason. The rule does not authenticate a caller: runtime identity verification is mandatory before passing metadata to the policy engine.
- Supersession requires a replacement identity and reason, preserving a conceptual history contract.
- Retrieval defaults to active-project scope; additional projects require explicit selection or a prevalidated approved link; shared scope is opt-in. The caller must log audited cross-project access.

## Non-goals and safety limits

This core is NOT yet wired into live routes or vault persistence. It is not a complete authorization mechanism: server-side authentication, approved-link registry, transcript capture, durable audit persistence, atomically stored Markdown and integration tests must be built in subsequent increments. Do not mark OH-5B accepted until live boundaries are enforced and tested.

Run `npx tsx scripts/verify-chernobog-oh5b-governance.ts` and `npm run typecheck`. Existing baseline lint failures are tracked separately; do not blindly run auto-fix.

## Governance hardening increment

- Proposals require an existing raw or provisional record; they cannot invent state.
- Archive operations cannot bypass trusted owner approval.
- Archival applies only to rejected/superseded records; confirmed records require supersession.
- State transitions require a target memory ID.
- This remains a pure policy core. It does not verify owner identity, authorize REST requests, or write to the vault.
