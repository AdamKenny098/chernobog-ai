# V5.9A — TypeScript Bridge Hotfix

## Purpose

Fix TypeScript fallout after V5.9 mission system verification passed.

## Scope

This patch only repairs bridge imports and a stale recall API request field.

## Changes

- Restore original vault-brain command imports in `commands.ts`.
- Type the skipped-file diagnostic formatter callback.
- Remove unsupported `tags` from `StructuredVaultRecallRequest` object construction.

## Non-goals

- No mission system changes.
- No autonomous execution.
- No new command surface.
