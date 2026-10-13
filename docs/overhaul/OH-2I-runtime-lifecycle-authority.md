# Chernobog OH-2I — Runtime Lifecycle Authority

## Purpose

OH-2I gives generic runtime lifecycle coordination one explicit owner:

```text
@chernobog/runtime LifecycleRuntime
```

LifecycleRuntime owns current lifecycle state and transition semantics, not every
domain implementation detail.

## Canonical lifecycle

```text
Idle
  ↓
Starting
  ↓
Ready / Degraded
  ↓
Unavailable
  ↓
Recovering
  ↓
Ready / Degraded
  ↓
Stopping
  ↓
Stopped
```

## LifecycleRuntime owns

- startup state
- dependency lifecycle state
- temporary unavailability
- recovery transitions
- retry accounting
- shutdown state
- read-only lifecycle snapshot
- the current `runtimeHealth` projection consumed by StateRuntime

## Existing owners preserved

Provider-specific implementation remains where it was already accepted:

```text
Ollama health probe / observation
  lib/chernobog/runtime/ollamaHealth.ts

Model readiness
  @chernobog/models/runtimeReadiness

Retry taxonomy, backoff, model fallback
  @chernobog/models/reliableOllama

Runtime health Event Spine history
  lib/chernobog/runtime/runtimeHealthEvents.ts

Current aggregate state projection
  @chernobog/runtime StateRuntime
```

LifecycleRuntime coordinates those outcomes. It does not create a second
provider client, Event Spine, retry algorithm, or state database.

## Production convergence

```text
Caller
  ↓
LifecycleRuntime
  ↓
accepted reliable model execution / status operation
  ↓
provider-specific readiness + retry + fallback
  ↓
LifecycleRuntime current state
  ↓
StateRuntime runtimeHealth projection
```

The existing live Ollama observer continues to publish the accepted Event Spine
health/model-availability events and additionally records the resulting current
dependency state in LifecycleRuntime.

## Historical compatibility

`docs/overhaul/OH-2E-state-authority-map.*` remains frozen as the historical
OH-2E record. At OH-2E, `runtimeHealth` pointed directly at
`packages/models/src/runtimeReadiness.ts`.

OH-2I supersedes that current authority with LifecycleRuntime while preserving
the provider readiness implementation behind it.

The historical OH-2E verifier is not weakened or rewritten.

## Explicit non-goals

OH-2I does not centralize:

- Personal Assistance file-lock/backoff behavior
- Itch HTTP retry policy
- Character rendering provider polling loops
- UI timers/animation timers
- Trust or approval decisions
- Tool execution
- Event persistence
- World State persistence
- full OH-9 observability redesign
