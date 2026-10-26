# OH-5C â€” One-Vault Storage Foundation

Versioned OH-5 Markdown projection rooted inside the existing `vault/chernobog` Obsidian vault.

- Records remain authoritative ONLY in the OH-5B governed SQLite store.
- `_chernobog-oh5/projects/<registered-id>/memories/*.md` are Markdown projections, not new authorities.
- The registry must be explicitly populated by an owner-authorized call; there are no implicit shared or default projects.
- `_shared` is reserved and unsupported for implicit writes.
- Atomic rename is used for individual files; lock prevents concurrent writes.
- Interrupted two-file projection can leave a metadata/Markdown mismatch: consumers MUST verify hashes and revision against the governed DB before trusting projections. Full crash reconciliation is deferred to migration/recovery work.
- Untrusted legacy notes are available through a read-only adapter and never treated as confirmed.
- No migrations or user vault data modifications are performed by installation.
- Project-aware ingestion, UI approval, integration, recovery and final acceptance remain future milestones.
