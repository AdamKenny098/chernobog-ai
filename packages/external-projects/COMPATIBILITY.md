# OH-1K1 compatibility boundary

This package is **transitional**. It isolates existing project implementations from Core without rewriting or deleting them.

- `lib/modules/**` remains the accepted implementation estate during OH-1K.
- Core imports `@chernobog/external-projects/*`, never `@/lib/modules/*`.
- Project → private Core dependencies are handled in the next OH-1K sub-slice.
- OH-1N composition should replace direct runtime construction with explicit registration/injection where practical.
- OH-1O removes adapters proven unnecessary after migration.

No persistence migration belongs here; ownership cleanup is OH-1L.
