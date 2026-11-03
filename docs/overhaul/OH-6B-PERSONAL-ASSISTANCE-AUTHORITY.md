# OH-6B — Personal Assistance Authority

**Pass:** 1 — Consolidation  
**Purpose:** A single discoverable read entrypoint backed only by accepted PA-1–PA-6 owners, without replacing existing APIs or storage.

## Verified ownership map

| Concern | Sole authority | Persistence / boundary |
| --- | --- | --- |
| Attention state | PA-1A `packages/personal-assistance/src/attentionStore.ts` | PA-owned SQLite, with revision, expiry and audit |
| Personal preferences / consent | PA-1B `profileStore.ts` | PA-owned SQLite; default capture disabled; no implicit opt-in |
| Android identity and ingest | PA-2 `mobile/*` and Android companion | PA-owned SQLite + phone offline Room spool; bearer tokens encrypted on phone and hashed server-side |
| Notification interpretation | PA-3 `notificationIntelligence/*` | Classify **sanitized stored** observations before responsibility projection |
| Responsibilities / correspondence | PA-3A and PA-6 `responsibilities/*`, `communicationResponsibility.ts` | One canonical responsibility JSON ledger plus event log; no other durable task authority |
| Work schedule | PA-4 `workSchedule/*` | Authoritative Alkimii snapshot; file-backed schedule and audit |
| Google Calendar | PA-5 `calendar/*` | Google provider + PA-owned configuration; only events marked as PA-5-managed may be reconciled |
| Durable scheduling | OH-3 `packages/runtime/src/schedulerRuntime.ts` | Job store remains outside PA |
| Command interpretation | OH-4 `lib/chernobog/cognition/liveOh4CommandPipeline.ts` | PA is a downstream consumer only |
| Memory / recall | OH-5 `packages/vault/src/oh5/*` | Vault maintains memory governance; PA never mirrors it |
| Tool execution / approvals | Trust + Tool Gateway | PA reads must not execute tools, send messages or grant permissions |
| Cognition attention | `PersonalAttentionProvider` contract in `packages/contracts` | `app/api/cognition/route.ts` injects canonical PA provider; Core does not import PA implementation |

## New implementation

- `packages/personal-assistance/src/readAuthority.ts`: `PersonalAssistanceReadAuthority` interface and small pure read-port factory, so verification can use fakes and never touch private data.
- `packages/personal-assistance/src/liveReadAuthority.ts`: binds the read port to the existing owners, without caching or new data storage.
- `packages/personal-assistance/src/index.ts`: exports the live read authority and its type as a public package boundary.
- `scripts/verify-oh6b-personal-assistance-authority.ts`: source-structure and delegation tests.
- `packages/personal-assistance/README.md`: refreshed package contract, reflecting completed OH-1L.

No existing PA write routes, event publishers, Android services, schedule or calendar code is changed by this milestone.

## Important semantics

1. The read port does **not** promise atomicity across SQLite and file-backed stores. Each method returns its own owner's current state.
2. The interface exposes no setter, creation, projection, scheduling, or execution method.
3. The factory is for isolated tests and composition. The live exported instance always delegates to accepted PA owners.
4. A PA-1A attention read can expire a time-limited explicit override and append an expiry audit record; that behaviour predates OH-6B.
5. User data may flow into backend planning through this port; **do not expose it as an unprotected public HTTP endpoint**.
6. The historical PA verifiers have four known outdated assertions from OH-6A. They are not silently changed or reclassified as passing by OH-6B.

## OH-6A findings carried forward

- **OH-6C**: Investigate invalid Android mobile bearer token (check endpoint and server registration; preserve phone Room spool and installation identity), and re-evaluate whether failed downstream processors can be acknowledged.
- **OH-6D**: Verify notification-to-responsibility handoff and retry/error propagation. The safe communication observer can return an error outcome without throwing.
- **Regression maintenance**: update historical verifiers against the live authoritative package and current approved Android Accessibility Service, without weakening permission/privacy assertions. Do not change production behaviour merely to satisfy old source-string checks.
- **Persistence**: PA owns its SQLite connection while several accepted JSON stores have separate paths; investigate uniform root overrides at a later appropriate migration, not inside OH-6B.

## OH-6B acceptance checklist

1. Source-based authority verifier passes, including pure delegation, filter forwarding, exception propagation, frozen method surface and package binding checks.
2. `npx tsc --noEmit` passes.
3. Targeted ESLint passes.
4. `node scripts/verify-oh1g-pa-v7.mjs` passes.
5. No existing PA implementation, database, schedule, calendar, token, Android companion, or Vault file modified.
6. Owner reviews diff and accepts before committing/merging.

Passing static checks is **not** live Android/Google Calendar acceptance. OH-6B cannot be claimed accepted until the local verifier output is reviewed.
