# OH-7B14 deployment acceptance / B15 handover requirements

**State: NOT APPROVED FOR PRODUCTION ACTIVATION.**
This is an operator review sheet, not a deployment script. It must not
stop, disable, mask, enable or restart any service. All acceptance runs in
B14 must use disposable test data or read-only service inspection.

## B14 acceptance evidence

- `node --import tsx --test tests/oh7b14*.test.ts`
- `node --test tests/oh7b14*.test.mjs`
- `npm run typecheck`
- `npx eslint lib/chernobog/coreHost/oh7b14*.ts scripts/oh7b14*.mjs tests/oh7b14*.ts tests/oh7b14*.mjs --max-warnings 0`
- `node scripts/oh7b14-writer-exclusion.mjs` (read-only; expected *not*
  to authorize activation while legacy runs)
- `node scripts/oh7b14-deployment-preflight.mjs` (read-only; always
  denies activation)
- `systemd-analyze verify deploy/oh7/chernobog-core-candidate.service`
  (static syntax check, not activation)
- `git status --short` (clean checkout expected)

## Production handover blockers: B15 must resolve each explicitly

1. **OS-level exclusion.** The core must not be able to start as an
   operational writer while `chernobog.service` is running or can
   automatically restart. B13's cooperative PID/lease file is not a
   substitute. A proposed production unit must have separately reviewed
   start restrictions and operator-controlled rollback.
2. **Operational entrypoint.** B14 has a nonoperational candidate
   (`oh7b14-candidate-host.mjs`) and an injected supervisor class.
   Neither is an executable production bootstrap. Never point systemd at
   the isolated `oh7b3-core-host.ts` test fixture.
3. **Actual job handlers.** The OH3 scheduler and worker adapters require
   an explicit reviewed registry of all enabled production job kinds.
   Never configure an empty handler map and assume existing jobs are safe.
   Preserve the existing job store; do not reset or migrate automatically.
4. **Shared write permissions.** The candidate systemd template is
   intentionally read-only, without production storage privileges. Any
   proposed production service identity, write paths and secrets require
   separate review. The live vault and SQLite database must not be opened
   by a second writer before cutover.
5. **Configuration and secrets.** Map the real environment file and
   secrets without printing them. Validate that session, PA, OH5 memory,
   event log, Android outbox and OH3 store paths match accepted production
   locations. The externally supplied gateway secret must be protected.
6. **Service isolation.** Check Chernobog Village, Agent Host and passive
   headless units independently. Neither site availability nor service
   ordering proves writer separation.
7. **Recovery and rollback.** Preserve a verified backup and record the
   production release symlink target. Define restoration of the old
   writer, rollback health checks, and a way to release the new lock
   **only after** the operational host is fully stopped and all in-flight
   requests/jobs have drained.
8. **Smoke and soak.** Validate authentication, live/ready split,
   chat/session, PA, Android, scheduler, worker, ownership revocation,
   restart, process crash, service alerts and mobile client behavior in
   an isolated or rehearsed host environment before authorizing B15.

## Explicitly forbidden at this stage

- No `systemctl stop/mask/disable chernobog.service`.
- No `systemctl enable/start` of a new operational unit.
- No changes to production user/group ownership or storage ACLs.
- No `CHERNOBOG_STORAGE_ROLE=core` while the legacy writer is live.
- No modification to Village / Agent Host service units.
- No claim that a passing B14 test authorizes a B15 production cutover.
