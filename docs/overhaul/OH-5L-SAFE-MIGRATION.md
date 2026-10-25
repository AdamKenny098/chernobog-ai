# OH-5L â€” Explicit Legacy Migration & Seeding

This milestone installs an **opt-in, dry-run-first** legacy Obsidian note migration utility. Installation **never migrates** any existing note. A local human selects exact Markdown paths under the existing vault and supplies a previously registered project ID.

Preview: `npx tsx scripts/chernobog-oh5l-migrate.ts preview malware overview.md` (produces an `OH5L-preview-*.json` manifest in the current directory, with paths and SHA-256 hashes but not note bodies).

Apply **only after reviewing the plan**: `npx tsx scripts/chernobog-oh5l-migrate.ts apply OH5L-preview-<id>.json <digest> --owner-confirmed`.

The apply operation verifies the complete batch is unchanged, then imports via OH-5D ingestion as **RAW** evidence, never confirmed. It is idempotent on replay and preserves original legacy files. If an individual ingest fails, previously imported items in the same batch may remain raw; replay safely resumes by deduplication. For actual multi-file atomicity and crash-safe journaling, see OH-5M.

This CLI is local/owner-operated; do not expose it to web requests, AI agents, third parties or scheduled automation. Migration manifests contain file paths and hashes and should be kept private. Projects must already be registered via the governed OH-5C owner flow; no silent project creation occurs. There is no bulk automatic scanning, categorization, memory promotion, or authority transfer. Existing vault notes and confirmed memories are not modified.