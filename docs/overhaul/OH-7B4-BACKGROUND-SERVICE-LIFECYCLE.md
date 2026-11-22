# OH-7B4 — PA, Scheduler and Background-Service Lifecycle

## Scope

Introduce one guarded headless lifecycle coordinator that can accept the **existing** PA, scheduler, worker and Android delivery implementations as injected adapters. This package does **not** create a competing SQLite connection, schedule a job, deliver a reminder, install new phone behavior, or modify production Next.js routes.

The coordinator enforces explicit permission to activate, sequential startup, no double-start, reverse-order shutdown and cleanup after startup failure. Adapters are never instantiated on import; all testing uses isolated in-memory fixtures.

## Preserved authority

- OH-6 PA read authority remains authoritative for profile, attention, responsibilities and schedule.
- OH-3 scheduler and job worker retain their original job-store and lease contracts.
- OH-6 Android reminder claim, fresh DND revalidation and phone-side acknowledgement remain authoritative. No new delivery queue.
- Next.js stays the live service host until a later explicit, tested cutover.
- The OH-7B3 experimental headless host remains fixture-restricted and is not enabled by this package.

## Validation and completion boundary

Run `npx tsx scripts/verify-oh7b4-background-services.ts`, existing OH-6G3B and OH-2D verifiers, `npx tsc --noEmit`, and targeted ESLint. Then verify the Command Center still responds HTTP 200 locally.

This verifies the **lifecycle contract**, not live PA/scheduler migration. Do not claim full OH-7B4 migration accepted until the real existing adapters are attached and run under an isolated test host, then separately accepted for live ownership transfer. No automatic cutover is authorized.
