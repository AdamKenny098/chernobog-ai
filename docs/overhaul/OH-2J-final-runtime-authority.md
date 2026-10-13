# Chernobog OH-2J — Final Runtime Authority

## Final canonical runtime

```text
Ingress
  ↓
Dialogue
  ↓
Route
  ↓
Plan / Action
  ↓
Trust
  ↓
Tool
  ↓
Event
  ↓
State
  ↓
Response
```

## Canonical authorities

| Concern | Authority |
|---|---|
| Ingress | `app/api/chat/route.ts` → `runCommandPipeline` |
| Dialogue | `@chernobog/runtime DialogueRuntime` |
| Routing | `@chernobog/runtime RouterRuntime` |
| Planning / orchestration | `@chernobog/runtime PlannerRuntime` |
| Action / interruption | `@chernobog/runtime ActionRuntime` |
| Trust | `@chernobog/trust` runtime governance |
| Execution | `runExecutionTask` |
| Tool invocation | Unified Tool Gateway |
| Events | Unified Event Spine |
| Current state | `@chernobog/runtime StateRuntime` |
| Lifecycle / readiness | `@chernobog/runtime LifecycleRuntime` |
| Response | canonical command pipeline response projection |

## Final legacy-path classification

OH-2J V1/V1B initially attempted to eliminate all production references to
`lib/chernobog/llm/*`.

That was too aggressive.

The earlier OH-1E model-boundary work deliberately established:

```text
packages/models
  ↓
providerAdapter
  ↓
single accepted Ollama provider transport
  lib/chernobog/llm/ollamaClient.ts
```

The transport remained at the historical filesystem path intentionally. It is
not a second model authority.

OH-1E also preserved source-sensitive internal compatibility edges in:

```text
lib/chernobog/execution/internalExecutionHandlers.ts
  -> ../llm/ollamaClient
  -> ../llm/modelRouter
```

Those edges are therefore retained.

Their final classification is:

```text
IMPLEMENTATION-LEAF / COMPATIBILITY — KEEP
```

They do not own Dialogue, RouterRuntime, PlannerRuntime, ActionRuntime,
StateRuntime, LifecycleRuntime, Trust, Tool Gateway, Event Spine, or response
authority.

## What OH-2J removes conceptually

OH-2J removes the assumption that every historical source path is a competing
runtime.

A file is legacy runtime only if it still owns a parallel authority or bypasses
the canonical runtime contract.

The final checks therefore prove:

- one DialogueRuntime definition;
- one RouterRuntime definition;
- one PlannerRuntime definition;
- one ActionRuntime definition;
- one StateRuntime definition;
- one LifecycleRuntime definition;
- Trust remains mandatory before governed execution;
- Unified Tool Gateway remains the tool authority;
- Event Spine remains the event authority;
- StateRuntime remains the current-state projection authority;
- the `lib/chernobog/llm` tree defines no competing Runtime authority;
- low-level provider-neutral `generateWithModel` has no external production
  consumer;
- local `executeTool` naming in file-workflow is not a second gateway;
- World State detached registry replacement is not canonical mutation.

## Final completion condition

OH-2 is complete when:

- focused OH-2J verifier passes;
- OH-2A through OH-2I regressions pass;
- TypeScript passes;
- Phase 11 full-system acceptance passes;
- Golden Acceptance V2 remains `52 / 52 PASS`;
- protected runtime state is unchanged;
- bounded final commit succeeds;
- no parallel legacy runtime authority remains.
