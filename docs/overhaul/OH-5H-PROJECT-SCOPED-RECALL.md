# OH-5H â€” Project-Scoped Search and Recall

This milestone adds `OH5RecallService` and the owner-authenticated `POST /api/oh5/recall` endpoint.

Operations: `search` (one registered project, confirmed-only, keyword AND matching); `history` (owner-only exact record with governance audit trail); `cross-project` (owner-only, explicitly enumerated project scopes and substantive reason; audited); and `cross-project-audit` (owner-only audit log). Return objects retain their original sourceRef, channel, revision, and update timestamp. No source body is interpreted as an instruction.

Ordinary recall excludes unreviewed, rejected, and superseded data. Exact historical recall may show older records for a specific project. No automatic merging of project memories occurs. No search over existing legacy vault files takes place, because legacy data has not been promoted through governance.

The initial search implementation uses a project-filtered SQLite read and in-process case-insensitive keyword ranking. It is intentionally conservative, with query and result limits; future milestones can add FTS and context packets without relaxing scope or approval guarantees. Owner bearer authentication is required by the API. OH-5N is reserved for complete system acceptance and production-path review.
