# Chernobog OH-2E — State Authority Map

## Rule

State Runtime is the single coordinator and read-only projection owner for current runtime state.

It does **not** replace domain persistence or create an alternative database.

| Runtime field | Authoritative source | Projection owner |
| --- | --- | --- |
| Session state | `lib/chernobog/session/store.ts` | `@chernobog/runtime StateRuntime` |
| Dialogue state | `@chernobog/runtime DialogueRuntime` | `@chernobog/runtime StateRuntime` |
| Routing state | `@chernobog/runtime RouterRuntime` | `@chernobog/runtime StateRuntime` |
| Planning state | `@chernobog/runtime PlannerRuntime` | `@chernobog/runtime StateRuntime` |
| Execution state | `lib/chernobog/execution` | `@chernobog/runtime StateRuntime` |
| Active task state | `lib/chernobog/execution` | `@chernobog/runtime StateRuntime` |
| World State | World State domain | `@chernobog/runtime StateRuntime` |
| Runtime health | `packages/models/src/runtimeReadiness.ts` | `@chernobog/runtime StateRuntime` |
| Read-only client projection | `@chernobog/runtime StateRuntime` | `@chernobog/runtime StateRuntime` |

## Runtime behavior

- Dialogue, Router, and Planner projections are read live from their accepted runtime authorities.
- Session projection is bound to the accepted session store through a reader, so State Runtime does not duplicate session persistence.
- Additional domain projections must identify the exact authority declared by `STATE_RUNTIME_AUTHORITIES`; competing owners are rejected.
- UI/API surfaces may consume `StateRuntime.snapshot()`, but they do not become state owners.
- State Runtime exposes no database write, tool execution, trust, or autonomy capability.

## OH-2E lock

For every important current runtime state field, the source authority is explicit and the projection owner is singular.

Persistence remains with the existing domain owner.
