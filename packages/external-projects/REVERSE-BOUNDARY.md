# OH-1K2 — Reverse Project Boundary Closure

The accepted OH-1K1 checkpoint was scanned live before this closure. It contains **zero private Core imports** from tracked project code under `lib/modules/**`.

No project implementation source is rewritten in OH-1K2. Earlier accepted slices already removed the reverse coupling this sub-slice was intended to address:

- OH-1C moved generic project tool dependencies onto `@chernobog/tools`.
- OH-1E moved project model generation onto `@chernobog/models`.
- OH-1H established `@chernobog/core` as the public general-runtime boundary.

OH-1K1 separately removed the opposite Core → project implementation coupling behind `@chernobog/external-projects/*`. Together, K1 + K2 close the bidirectional implementation-coupling requirement for OH-1K.

## Remaining persistence debt

Project Operations still stores project state in the shared `chernobog.db`. This is not hidden or migrated here. Ownership separation belongs to **OH-1L — Persistence Ownership**. Game Radar / Itch keeps its own SQLite ownership.

## Later handoff

Explicit registration/composition belongs to **OH-1N**. Transitional adapter cleanup belongs to **OH-1O**.
