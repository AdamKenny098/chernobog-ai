# Chernobog OH-6C-R3A — Windows Host Supervisor and Observability

## Observed host baseline (owner report, 2026-11-15)

- Node/npm, Ollama and Tailscale executables installed.
- TCP 3000 listening (Next.js web host, not yet process-attributed); Ollama TCP 11434 listening.
- Tailscale Windows service Running / Automatic.
- Tailscale Serve shows an HTTPS reverse proxy to `http://127.0.0.1:3000`, plus an existing TCP 8190 forwarding rule. Preserve both; do not call `tailscale serve off` or reconfigure them.
- No name-matching Task Scheduler task found for Chernobog, Ollama or Node. This does not rule out Registry Run keys, Startup folder, or other third-party launchers.

## R3A scope and safety

- Windows PowerShell 5.1 owner-session supervisor for Next.js and Ollama.
- Never kill an existing process, steal an occupied port, change Tailscale/Windows networking, modify security settings, call Ollama model-pull, re-pair Android, change DND, clear `.next` or edit Chernobog state.
- If port 3000 or 11434 is occupied but its API does not respond, label `degraded-port-occupied` and **do not** launch a competing server. Investigate the owner process.
- If both port and health probe are absent, start only the local executable under the logged-in user's account, with a two-minute restart cooldown.
- Next mode defaults to `dev` matching the repository's `npm run dev`; production `start` requires a prebuilt `.next/BUILD_ID`. Both bind Next to `127.0.0.1:3000`, preserving Serve forwarding.
- Readiness probes are read-only: `http://127.0.0.1:3000/api/personal-assistance/attention` and `http://127.0.0.1:11434/api/version`. Serve mapping is inspected with `tailscale serve status`, but HTTPS reachability **from another device** is not inferred.
- All outputs are written under `%LOCALAPPDATA%\Chernobog\OH6CR3`, never in `data/personal-assistance/`. `health.json` is the current snapshot; `supervisor.jsonl` rotates after 5 MiB; process stdout/stderr go to timestamped files (up to 10 of each per role, and redact logs before sharing).
- Register-HostAtLogon.ps1 is **opt-in** and runs at *current user's interactive logon*, with no admin/system/service-account access and no stored Windows password. Task Scheduler uses IgnoreNew and bounded restarts. The installer does **not** register or start anything.
- An existing manual `npm run dev` or Ollama tray service is left alone. Running one such process before registration is fine; the supervisor observes and does not launch duplicates.
- Unregister-HostAtLogon.ps1 does not explicitly kill Next or Ollama, but Windows may terminate children associated with the scheduled task when it stops. Check their state afterward.

## Install

From repository root, extract the package, run its `Install-OH-6C-R3A.ps1 -Repo (Get-Location).Path`. It adds six new files and runs a static verifier. No tasks registered.

To take a live observation (creates only local diagnostic files; no process starts):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\ops\windows\oh6cr3\HostSupervisor.ps1 -Repo (Get-Location).Path -ObserveOnly -Once
powershell -NoProfile -ExecutionPolicy Bypass -File .\ops\windows\oh6cr3\HostStatus.ps1
```

To **opt in** to automatic restart at current-user logon:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\ops\windows\oh6cr3\Register-HostAtLogon.ps1 -Repo (Get-Location).Path -Mode dev -StartNow
```

After registration, let manual apps continue running; the task will only start an app when its port is absent. The two-minute cooldown prevents rapid restart loops. To remove the registration:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\ops\windows\oh6cr3\Unregister-HostAtLogon.ps1
```

## Important remaining R3 acceptance

1. Confirm installed task uses `Interactive` for the intended user, not SYSTEM. Verify `HostStatus.ps1` and local health logs show both web host and Ollama ready.
2. Deliberately stop an owner-controlled development process at a safe time; verify supervisor restarts it after the listener closes (do **not** kill unrelated PID or clear app data).
3. After Windows reboot *and signing in*, confirm the logon task starts Next and Ollama and the existing Tailscale Serve HTTPS endpoint reaches the app from the enrolled phone.
4. **Pre-login / unattended host** is NOT delivered by this R3A package. Windows Scheduled Tasks with `Interactive` require a signed-in owner. If truly 24/7 even when no user logs in, design a separately reviewed limited-privilege service account/Windows service and confirm its access to data and model paths. Do not switch to SYSTEM or store an account password without an explicit owner decision.
5. Confirm Windows Tailscale unattended mode is enabled and Serve was configured persistently (`tailscale serve --bg` or equivalent); a Running/Automatic Tailscale service and the current `tailscale serve status` alone do not prove it persists after logout/reboot.
6. Host and phone offline-spool recovery and duplicate suppression remain for the OH-6 final integrated acceptance. Never claim R3 closure solely from static source checks.

## Rollback

Run `Unregister-HostAtLogon.ps1` first if task enabled. Stop the supervisor task, then remove the new OH-6C-R3A files if desired. Don't touch existing Tailscale Serve, Next/Ollama processes, PA data or mobile pairing.
