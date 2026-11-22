# OH-7B2 — Storage Ownership and Process Isolation

One consolidated package. No production state migration, no DB opens, no worker start.

## Verified baseline
- `lib/chernobog/db.ts` and `packages/personal-assistance/src/persistence.ts` resolve to `CHERNOBOG_DATA_DIR/chernobog.db` (default `process.cwd()/data/chernobog.db`) but instantiate separate SQLite connections.
- `lib/chernobog/session/store.ts` has a process-local session cache.
- `packages/events/src/index.ts` uses process-local global singleton and in-memory subscriptions/dedupe; `packages/events/src/store.ts` uses a JSONL path relative to `process.cwd()`.
- Existing Next.js is the active production authority; B1 bootstrap is read-only.

## B2 boundaries
- Paths are resolved against the repository directory in the new core, regardless of the launch working directory. Explicit overrides are retained and normalized.
- `inspectStorageBoundary` does not open, create, mutate or migrate stores. Bootstrap still reports `operationalCoreReady: false`.
- `acquireProspectiveCoreLease` is opt-in, exclusive, and fail-closed. It is NOT called from bootstrap. It only coordinates cooperating future processes; it CANNOT block old Next.js writers.
- No automatic lock reclaim. A stale lock requires separate reviewed recovery.
- Production cutover and cross-process event ownership are deliberately deferred to OH-7B3/B4; no parallel writers permitted before then.

## Acceptance
1. Stop B1 bootstrap; do not stop or reconfigure Next.js, Android, Ollama, or Tailscale.
2. Install with `powershell -NoProfile -ExecutionPolicy Bypass -File .\Install-OH7B2.ps1 -Repo <repo path>` from extracted package.
3. Run `node scripts/verify-oh7b2-storage-boundary.mjs`, `npx eslint scripts/oh7b1-core-bootstrap.mjs scripts/oh7b2-storage-boundary.mjs scripts/verify-oh7b2-storage-boundary.mjs`, and `npx tsc --noEmit`.
4. Start `node scripts/oh7b1-core-bootstrap.mjs`; `/health/ready` should show `storageBoundary.mode=passive-observer`, `operationalOwner=false`, `operationalCoreReady=false`; existing Next.js should still return HTTP 200.
5. SIGINT shutdown should remain clean; no live database or event log changes.

## Rollback
Restore backed-up `scripts/oh7b1-core-bootstrap.mjs` from the printed backup path, and remove the three new package files. Do not touch `data`, `.chernobog/runtime/events`, or live database files.
