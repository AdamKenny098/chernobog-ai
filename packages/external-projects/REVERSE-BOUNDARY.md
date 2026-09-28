# OH-1K2 — Reverse Project Boundary Closure

The accepted OH-1K boundary remains closed after **OH-1L — Persistence Ownership**.

Tracked/live project code under `lib/modules/**` contains **zero private Core implementation imports**. Project capabilities continue to use public package boundaries such as `@chernobog/tools` and `@chernobog/models`.

## OH-1L persistence ownership refinement

The Project Operations persistence debt recorded when OH-1K2 originally closed is now resolved at the logical ownership boundary:

- Project Operations owns a **domain-owned** SQLite client in `lib/modules/project-operations/persistence.ts`.
- Project Operations no longer imports Core's database implementation.
- The existing `data/chernobog.db` remains the **physical compatibility** file so stored project data is not migrated or lost.
- Itch / Game Radar retains its independent SQLite ownership.

This refresh updates K2's dependency inventory to the post-OH-1L architecture. It does not reopen OH-1K and does not change project behavior.

## Later handoff

Explicit registration/composition remains **OH-1N**. Transitional adapter cleanup remains **OH-1O**.
