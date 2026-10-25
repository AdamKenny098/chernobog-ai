# OH-5N integration / acceptance tracking

- ControlledEvidenceIngress now inserts the RAW governed record, audit event and evidence receipt in a **single SQLite transaction**. A failure-injection regression test verifies rollback.
- Legacy default OH-4 chat route remains intact. An explicit `oh5Memory: { mode: "vault-first", projectId: "..." }` opt-in with owner bearer token retrieves only scoped confirmed memories. This is a guarded integration, **not** full provenance enforcement for all generative replies.
- Final acceptance **must** include manual UI exercise (OH-5K), endpoint authentication and permission checks, all legacy writers/approval and unscoped readers, conflict flows, runtime conversation behavior, and recovery rehearsal on representative data.
- Until all blockers are resolved and owner gives final approval, do **not** mark OH-5 complete.