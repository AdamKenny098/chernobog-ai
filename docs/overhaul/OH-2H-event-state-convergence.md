# OH-2H — Event → State Convergence

Baseline: `929872b4a5ab2c7071d52e54e71c965ccdacd00e`

## Accepted target

```text
Tool / Execution Result
        ↓
Unified Event Spine
        ↓
StateRuntime read-only projections
        ↓
Dialogue / Response projection
```

## Preserved authorities

- Event Spine persistence, replay, correlation, retention and diagnostics remain unchanged.
- `runExecutionTask` remains the execution/task lifecycle authority.
- Unified Tool Gateway remains the tool invocation authority.
- World State keeps its existing event projector, registry, snapshot persistence and recovery.
- Session store keeps persistence for conversational/file-workflow continuity.
- StateRuntime remains a read-only projection coordinator and does not become a persistence owner.

## OH-2H bridge

`lib/chernobog/runtime/eventStateConvergence.ts` performs four bounded jobs:

1. subscribes to Event Spine before replay, with bounded event-id deduplication;
2. reconstructs event-derived execution/active-task projections from execution lifecycle, step and approval events;
3. binds accepted World State, execution and active-task authorities into StateRuntime;
4. exposes a detached read-only World State query view built from StateRuntime's current projection.

The bridge does not execute tools, make trust decisions, write session state, or persist a second World State database.

## Response convergence

The two response-context paths that previously acquired the World State runtime directly now obtain their World State query through the StateRuntime projection:

- `lib/chernobog/pipeline/worldStateContext.ts`
- `lib/chernobog/pipeline/worldModelContext.ts`

This preserves the existing query/evidence semantics while enforcing the OH-2H authority path.

## Compatibility boundary

`updateSessionFromToolResult`, selected-file continuity, and persisted `ExecutionState` remain in the session domain because they support conversational/file-workflow continuation. They do not mutate canonical World State and are not treated as Event/State runtime authority.

## Autonomy

No autonomy, trust, approval, tool, or model authority is expanded by OH-2H.


## Phase 11 currentness compatibility

The World Model bridge retains its accepted source-visible canonical currentness
contract (`getChernobogWorldStateRuntime()` and `runtime.model.snapshot()`).

OH-2H does not use the canonical 11G registry directly for model-facing evidence.
Instead, `ChernobogWorldStateQueryService` receives a detached registry copied from
StateRuntime's `worldState` projection. The direct runtime call is retained only as
the accepted live-currentness/synchronization boundary.


## V5 routed-pipeline boundary

`runCommand.ts` is intentionally not modified by OH-2H.

Event-State convergence is initialized at the authoritative execution edge and in
the StateRuntime-derived response query helpers. This keeps routed command
composition compatible with the accepted Phase 11 conversational bridge while
avoiding lifecycle ownership in the command coordinator.


## Baseline-valid conversational integration gate

The historical standalone World Model conversational-bridge verifier contains
variable-name assertions that already fail on the accepted OH-2G baseline.
OH-2H validates the current routed-pipeline contract directly instead:
`worldStateSystemText` and `worldModelSystemText` remain built from their
canonical context builders, while Event-State lifecycle ownership stays outside
the command coordinator.
