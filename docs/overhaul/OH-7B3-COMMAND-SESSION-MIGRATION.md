# OH-7B3 — Consolidated Command and Session Extraction

This milestone surgically extracts the existing Next.js chat and session route bodies into Next-independent Web Request / Response handlers. Existing Next.js routes remain the active production entrypoints and delegate to the **same** handlers. The experimental headless host can exercise those handlers only with an explicitly marked isolated data directory and a 32+ character gateway secret. No production cutover is made.

## Isolation and authority
- Production Next remains the authoritative writer; do not start an experimental host pointed at owner data.
- The host binds to loopback port 3188, not Tailscale and not a public interface. It never exposes an unauthenticated chat or session route.
- No new model, trust, tool, OH-5, session or PA authority is created. Existing handlers and authorization gates are preserved structurally.
- The verifier is source-structural, not a live cross-process model/tool exercise; no automatic command execution in tests.
- Never set `CHERNOBOG_OH7B3_ISOLATED_TEST` for owner data, or copy the production DB into a public location. Use disposable fixtures only.
- OH-7B3 cannot be declared production-cutover complete until end-to-end isolated request/response parity and storage isolation tests are run and existing OH6 regressions pass.

## Install/verification
The installer backs up original chat and session routes, checks exact structure, installs two service handlers and the standalone host/verifier, and rolls back on any failing source verification. It does not alter `.env`, Android, scheduling, Tailscale or persistent state.

Run `node scripts/verify-oh7b3-command-session.mjs`, `npx tsc --noEmit`, and targeted `npx eslint` after installation. Run normal Next.js chat/session smoke tests against **non-mutating test prompts**; tests must not modify live memory or execute tools.

## Rollback
The installer prints an `.chernobog-patch-backups/OH-7B3-*` directory containing the two original route files. Stop any experimental host, restore the two backed up files, and remove the three newly installed files and documentation if necessary.
