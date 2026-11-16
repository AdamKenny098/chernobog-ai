# OH-6C-R1 — Android companion reliability diagnostics and permission recovery

## Scope
First stage of OH-6C-R / GitHub Issue #5. Read-only mobile reliability panel appended to the existing companion (no extra application, endpoint, database, token store or reminder path). Existing mobile scheduler/notification listener/Alkimii service remain authoritative.

### Signals
- Last successfully accepted heartbeat: unknown / recent (<=45 min) / stale / degraded (recorded transport failure); age reported from existing HeartbeatStatusStore. Android WorkManager is best-effort, not a hard real-time schedule.
- Notification listener grant, Android app notification presentation permission and battery-optimization exemption.
- Alkimii Accessibility permission separately from **actual in-process service binding**; connection tracker starts false each process and records last bound timestamp solely as history.
- Last successful Alkimii capture upload age from existing local SharedPreferences. This does **not** prove roster source freshness unless Alkimii has been opened and a capture recognized.
- Network type is *last observed by heartbeat*; VPN/Tailscale status is not guessed.
- On-resume refresh, manual refresh, and explicit owner-directed settings links. No permission is granted automatically.

### Trust boundaries
- Existing secure credential store and offline spool are untouched; panel never reads or logs tokens.
- No background accessibility capture is started and no configuration is changed by opening the panel.
- An explicit owner button can enqueue existing WorkManager heartbeat/spool/reminder jobs; each retains existing server gates, DND and receipt logic.
- Force-stop cannot be autonomously recovered on Android; user must relaunch. Actual reboot, mobile handoff and Doze testing remains necessary.

## Installation acceptance
1. Run the scoped installer; all sources added, service and screen patched, verification + existing PA mobile regressions + TypeScript + Gradle Kotlin build pass.
2. `adb install -r .../app-debug.apk` (only if Android signing key matches; never uninstall to bypass mismatch).
3. Open Chernobog companion, scroll to **Mobile Reliability / OH-6C-R1**. Inspect grants and recent heartbeat.
4. Expand recovery details. Open the Alkimii Accessibility settings (do not revoke unless conducting a controlled test). Return to app: status refreshes.
5. Compare known grant status and last heartbeat against current phone state. Capture app settings should not change automatically; no re-pairing.
6. Live negative tests (explicit permission revocation, network loss/reconnect) should be scheduled after code acceptance; restore permissions manually.

## Remaining OH-6C-R milestones
- **R2**: boot / Wi-Fi↔LTE / Tailscale reconnect, offline spool deduplication, durable retries and observer hardening, with real-device acceptance. Honor Android force-stop boundary.
- **R3**: Windows host Next.js + Ollama managed startup/recovery/logging, Tailscale Serve readiness, cold-boot acceptance.
- Final OH-6 integration audit after adaptive PA-8 scope review.

Do not mark GitHub Issue #5 complete on the R1 build alone.
