# OH-5E â€” Classification and Working Memory

This milestone introduces deterministic, non-authoritative triage of already ingested OH-5D **raw evidence**, and a bounded project-scoped SQLite scratchpad (24-hour default TTL, 7-day maximum). Categories: project-update, task, preference, decision, reference, conversation, uncertain. Handling: candidate, temporary or ignore.

A candidate is **not** confirmed. Explicit `proposeForReview` promotes eligible raw evidence to the governed store's `candidate` tier; only the later OH-5F owner-approved workflow may confirm it. External text such as "lock that in" can generate a review suggestion, but never a trusted owner approval. No external notification automatically creates a calendar item or a task.

Scratchpad entries retain excerpts of source content for owner review and should be treated as potentially sensitive. They remain local in the ignored OH-5 SQLite database. Expiration excludes items from reads; `purgeExpired` physically deletes expired scratchpad rows without deleting original evidence. Classification is rules-based and intentionally conservative; no external model calls or untrusted command execution.

This installs a service and verifier, not an automatic inbox integration or interactive UI. OH-5F/5K will supply owner confirmation and review experience. The complete integration/security exercise remains OH-5N.