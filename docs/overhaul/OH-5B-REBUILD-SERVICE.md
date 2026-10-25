# OH-5B fresh rebuild â€” integrated guarded service

Fresh implementation based on the approved OH-5B governance policy (20 checks).

- Local transactional SQLite journal; private runtime path `.chernobog/runtime/oh5/memory.sqlite`, not vault data.
- Scoped ingest, candidate promotion, authenticated owner confirmation, reject, supersede, archive, and recall.
- Source provenance, immutable event history and consumed approval IDs; stale revision checks.
- A new `POST /api/oh5/memory` entry point demands the local `CHERNOBOG_OH5_OWNER_TOKEN` bearer secret for **every** operation. It does not trust owner metadata from source body.
- Existing OH-4 and old memory endpoints remain unchanged during migration. **OH-5B cannot be called system-wide accepted until legacy write paths are explicitly routed through governance or disabled.**
- Do not paste local token, environment files, or memory contents into chat. The created API is intentionally closed to external sources until trusted ingress adapters are implemented.
- This milestone does not yet migrate Obsidian notes, build review UI, or integrate with the OH-4 prompt gate. Those follow in OH-5C+.

Acceptance executed by installer: 20 governance checks, durable store verifier, TypeScript, scoped ESLint. The global ESLint baseline was known failing on OH-4 at start. Manual live API checks require starting the server, and are not falsely represented by the offline test suite.