# OH-5D â€” Controlled Evidence Ingestion

This incremental build adds a **project-bound evidence intake** service; imported text is always stored as **raw evidence**. It cannot confirm, supersede or archive memories. The existing OH-5B SQLite store is authoritative and OH-5C project registry is required for each ingest.

The optional `POST /api/oh5/ingest` route is **owner-token gated even for external-sourced envelopes**; this does not yet expose a public webhook. OH-5E will add classification/candidate review, and subsequent milestones will build owner confirmation and UI.

Safety: payload 64 KiB, sourceRef 512 bytes, project registration mandatory, supported source channel whitelist. Fingerprint deduplication uses scope/channel/reference/body digest; receipt rows do not expose memory bodies. All source text is data, never executable instructions.

**Known limitations deferred to OH-5M:** receipt and memory-row commits use two SQLite connections, so a process crash between commits can leave an orphan raw memory record. Full transactional idempotency, per-source connector verification, retention/erasure, auth/session integration and secure external ingress are not yet implemented. No claim of full acceptance before OH-5N. No legacy notes are migrated and the installer does not ingest real messages.