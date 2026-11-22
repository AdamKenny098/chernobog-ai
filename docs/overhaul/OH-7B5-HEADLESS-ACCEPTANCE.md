# OH-7B5 — Headless Core Acceptance Gate

This milestone is **not automatically accepted** when the package verifier passes. The current accepted components are OH-7B1 boot, OH-7B2 *prospective* writer lease, OH-7B3 isolated-only HTTP command/session host, OH-7B4 dependency-injected lifecycle. Production authority still resides in Next.js. They cannot together claim live headless independence.

## Automatically verified

- Presence and structure of OH-7B1 through OH-7B4.
- Passive bootstrap reports operationalCoreReady=false.
- Prospective owner lease gated behind verified stop and explicit consent.
- Isolated-only loopback host, marker and secret restrictions.
- Next.js uses extracted handlers.
- Lifecycle only uses injected adapters; no real background services auto-start.
- Existing Android outbox reserve/revalidation structure remains present.
- B2, B3, B4, Android G3B, planner 2D, TypeScript, targeted ESLint regressions through installer.

## Outstanding before acceptance

1. Execute a non-mutating request through the headless host with a disposable isolated fixture. The B3 host must not be run against real owner data.
2. Demonstrate a headless command through the accepted pipeline, persistent isolated session state across restart, and failure response semantics.
3. Attach *actual* PA and OH-3 scheduler/worker adapters under a single live writer authority. The B2 lease **does not constrain legacy Next.js**, so the process handoff must be verified, not assumed.
4. Validate real Android device authorization, reminder receipt, delivery suppression and absolute DND while the headless core owns service execution.
5. Prove Next.js can stop and restart without interrupting headless core work, then reconnect without stale sessions or duplicate events.
6. Preserve and regression-test OH-4, OH-5, Trust/Tool Gateway, event replay, session IDs, Android mobile routes and accepted DND policy.

## Safety

- This package changes **no live runtime routes or database writer authority**.
- Do not start the isolated host pointed at the production database, Vault or event log.
- No service supervisor, Tailscale, phone pairing, env files or live notification policy changed.
- A PASS below means the pre-cutover checks pass, **not** that OH-7B5 is complete.
