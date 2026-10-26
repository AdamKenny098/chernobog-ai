# OH-5M â€” Resilience and Security Hardening

This milestone adds read-only integrity diagnostics, SQLite-consistent online backups, SHA-256 backup verification and isolated recovery rehearsal. It never automatically restores or mutates production data. The checks identify missing tables, unscoped records, broken supersession links and orphaned evidence receipts. Raw records without an ingress receipt are advisory because direct governed ingestion is supported.

Commands (from repository root):

```powershell
& .
ode_modules\.bin\tsx.cmd scripts/chernobog-oh5m-health.ts inspect
& .
ode_modules\.bin\tsx.cmd scripts/chernobog-oh5m-health.ts backup
```

Use `rehearse <backup.sqlite> <sha256>` using values printed by backup. Never commit backup files or secret-containing reports.

## OH-5N outstanding acceptance boundaries

- Ingestion currently has a two-step memory-and-receipt write across connections. This module DETECTS orphan receipts but does not make those writes atomic or automatically repair them.
- Legacy memory paths and the OH-4 live conversation/context route require end-to-end authorization/grounding acceptance.
- Test the actual review UI, project isolation, backup/restore playbook, concurrent writes, failure injection and route authorization.
- Existing OH-5K installation status should be confirmed before final signoff.