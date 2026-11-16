# Chernobog Overhaul — agreed completion roadmap

**Decision date:** 2026-11-16  
**Status:** Approved planning direction; implementation and acceptance tests remain pending.  
**Scope:** OH-7 through OH-10. Earlier phases are retained; this proposal does not rewrite their history.

## Endgame

Deliver a stable, modular, always-on Chernobog core hosted on the Acer Nitro, independent of the Windows development desktop, accessible from the Android companion, able to run existing approved background workflows, and capable of reporting operational health. The overhaul ends with a tested stable release—not a multi-agent workforce.

## OH-7 — Presence and UI Separation

Separate runtime intelligence, memory, scheduling and assistant services from the Next.js dashboard. Support consistent access through desktop, Android and command-line interfaces, with future Village integration possible. Preserve session/pending-work continuity where supported. **Exclude autonomous agent delegation.**

**Acceptance:** Core operations continue without an open dashboard; supported interfaces reach the same persistent backend and reflect consistent state.

## OH-8 — Minimal Core Homelab Deployment

Keep scope to **Chernobog core only**, not multi-agent infrastructure.

1. Diagnose and recover the Acer Nitro and Ubuntu connectivity; inspect and back up the old installation without merging legacy and overhaul code.
2. Cleanly deploy the current core.
3. Configure managed services with startup on boot and recovery after failures.
4. Restore secure Tailscale/Android reachability.
5. Verify a simple approved background job survives a reboot.

**Acceptance:** With the Windows desktop off, Chernobog is detectable and reliably reachable from the phone; its core service and a background job operate independently.

## OH-9 — Self-Monitoring and Operational Reporting

- Schedule basic health checks for host resources, critical services, scheduler, storage, database and connectivity.
- Produce a concise **daily Android briefing** with uptime, completed work, warnings and **recommended corrective actions**.
- Recommendations are **advisory only**: no autonomous repair or destructive changes.
- Establish independent failure detection so a complete server outage can be noticed outside Chernobog itself. The phone alone may not reliably monitor continuously; validate a separate watchdog or equivalent before claiming outage alert coverage.
- Reuse existing notification/DND policy, with explicit severity handling.

**Acceptance:** A daily report reaches the phone, recommendations are clear and non-executing, and an independently monitored outage produces a demonstrable alert.

## OH-10 — Final Integration, Validation and Stable Release

Feature freeze except changes required for correctness, security and reliability.

1. Audit integration across gateway, Vault, assistant, scheduler, interfaces and monitoring; identify legacy duplication safely.
2. Test end-to-end approved workflows, including memory, scheduled tasks and mobile notifications.
3. Test reboot, service interruption, network loss, recovery, backup and rollback procedures.
4. Document architecture and operating procedures; release a tested stable version.

**Acceptance:** Windows desktop off; Acer Nitro runs the core; phone access works; approved workflows continue; health reporting is accurate; failures recover within tested limits or yield actionable alerts.

## Separate workstreams and exclusions

- **Executive Planner:** Preserve work already completed, but track separately from OH-7 and do not make it a deployment blocker. It plans/tracks tasks; delegation belongs to a future orchestration agent.
- **Post-overhaul agentic expansion:** Overseer, specialized agents, controlled delegation and Village integration. These are **not OH-8/9/10 deliverables**.
- **Operational prerequisite:** Investigate the Acer Nitro, previously reported powered on but unreachable for approximately 40 days. Do not assume root cause until inspected.
- **Governance:** This roadmap captures the 2026-11-16 discussion. It does not assert code completion, modify running services, or replace historical roadmap records.

## Current milestone status

OH-1–OH-5 previously reported complete; OH-6 conditionally closed pending live integration verification. OH-7–OH-10 are planned/active per the above scope, not accepted as complete.
