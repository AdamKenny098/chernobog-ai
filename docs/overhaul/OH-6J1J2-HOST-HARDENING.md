# OH-6J1/J2 — Windows Logon Fallback and Next Startup Deduplication

## Reason
The 15 November 2026 acceptance run found the existing R3A task `Ready` after a reboot even though its logon trigger was configured, and `LastTaskResult=0xC000013A` (an interrupted prior run). A manual `Start-ScheduledTask` succeeded. During the crash test, HTTP stayed unready briefly while a Next.js listener had already started, and the supervisor logged a second launch request.

## J1 owner sign-in fallback
`HostLoginKickstart.ps1` is a short, unprivileged fallback invoked from the **current user's Startup folder**. It waits 20 seconds after login and starts the existing Task Scheduler job only if it is `Ready`, has the expected supervisor command and is not disabled. It never directly starts Next.js, touches the credentials or changes Tailscale.

`Enable-LoginFallback.ps1` is **opt-in** and creates exactly one current-user shortcut; `Disable-LoginFallback.ps1` removes only that known shortcut. The file installer never enables it or interrupts active processes. This is an additional best-effort sign-in trigger, **not** a Windows service, pre-logon guarantee or proof that the primary trigger itself was repaired. Both paths can be disabled in user policy. A live Windows sign-out/sign-in or restart test must be observed.

## J2 conservative startup deduplication
`HostSupervisor.ps1` now waits for two consecutive `down` samples, checks existing repository-bound Next.js node processes, requires a 240-second cooldown after its own launch, and performs a last-second listener/process check. When the port is occupied but HTTP is still warming, it does not replace or kill the listener. When process inventory cannot be verified, it fails closed instead of guessing that another Next instance should start. An already-running but unresponsive Next process is a diagnostic condition requiring owner review, not force-killed by this patch.

`HostStatus.ps1` now reports whether the task is actually running **and** the heartbeat is fresh. A stale `ready` snapshot no longer implies active supervision.

## Safety
- Existing scheduled task, node, Ollama, Tailscale and PA database remain untouched during file installation.
- The installer backs up known R3A source files and rolls back on failure. Unknown local changes fail closed.
- The running PowerShell job may hold the old supervisor definition in memory; confirm the new version after next task start or reboot.
- The new current-user Startup shortcut is disabled by running `Disable-LoginFallback.ps1`.
- Backup of modified original files is at `.chernobog-patch-backups/OH-6J1J2-<UTC timestamp>`.

## Live acceptance
1. Install files, run verifier, optionally enable login fallback (explicit owner action).
2. Check that the task is Running and `Supervisor actively reporting: True`.
3. Save work, reboot Windows, sign in. Within 2–3 minutes the supervisor should show Running/active and Command Center HTTP 200.
4. During subsequent controlled crash recovery, do not expect immediate HTTP success; verify a single stable Next server process, eventual HTTP 200, and no repeat `next-start-requested` during warmup.
5. Do not close J1 solely from installer/static tests; only the post-login live test establishes success.
