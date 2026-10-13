# Chernobog OH-2G — Trust → Tool Execution Convergence

## Authoritative execution chain

```text
Action Intent
   ↓
runExecutionTask / Trust & Governance
   ↓
ALLOW / DENY / APPROVAL REQUIRED
   ↓
Unified Tool Gateway
   ↓
Tool / Adapter
```

## Legacy convergence

OH-2G migrates the two legacy gateway families identified by the live topology
audit:

- pipeline `executeAndTrackTool`
- orchestration `orchestrateMessage`

Both now create a single-step ExecutionTask and enter the accepted
`runExecutionTask` lifecycle before their original gateway wrapper can run.

The original gateway origins remain preserved:

- pipeline → `executePipelineTool`
- orchestration → `executeOrchestrationTool`

## Approval continuation

If governance pauses a migrated action for approval, the resulting task is
projected into the existing session ExecutionState. The existing approval
command path resumes that task through `runExecutionTask` and installs the
origin-preserving continuation handler before handler dispatch.

## Preserved boundaries

- no second Trust Engine;
- no second Tool Gateway;
- no direct tool authority in RouterRuntime, PlannerRuntime, or ActionRuntime;
- no low-level executor bypass;
- no new autonomous capability.
