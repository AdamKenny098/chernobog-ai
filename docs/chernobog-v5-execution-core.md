# Chernobog V5.0 — Autonomous Execution Core

## Purpose

V5.0 introduces Chernobog's autonomous execution core.

The goal is to move beyond one-off command handling and allow Chernobog to create, run, track, pause, resume, and summarize structured execution tasks.

This does not mean uncontrolled autonomy. V5.0 is a controlled execution layer with task state, risk classification, approval handling, diagnostics, and continuity.

---

## Core Flow

```txt
User message
→ runCommand.ts
→ executeFromMessage()
→ buildExecutionTaskFromMessage()
→ runExecutionTask()
→ execution handlers
→ tool executor / internal workflow handler
→ deriveExecutionStateFromTask()
→ formatExecutionResponse()
→ session.executionState saved
→ trust trace diagnostics emitted
```

---

## Pipeline Position

The V5.0 execution layer is inserted inside `runCommand.ts` after planner handling and before older follow-up/tool/orchestration fallback.

Current order:

```txt
memory commands
→ continuity checks
→ command help
→ unified memory commands
→ memory architecture commands
→ planner commands
→ V5.0 execution layer
→ legacy follow-up handling
→ unified tool commands
→ V4.4 orchestration
→ parsed tool fallback
→ LLM tool intent fallback
→ vague file fallback
→ chat fallback
```

This keeps explicit memory and planner commands protected while allowing V5 to handle multi-step operational workflows first.

---

## Key Files

```txt
lib/chernobog/execution/types.ts
```

Defines execution task, step, status, risk, and category types.

```txt
lib/chernobog/execution/createExecutionTask.ts
```

Creates structured execution tasks with generated IDs, step setup, and initial risk status.

```txt
lib/chernobog/execution/buildExecutionTask.ts
```

Turns supported user messages into execution tasks.

```txt
lib/chernobog/execution/runExecutionTask.ts
```

Runs task steps, applies risk policy, calls handlers, moves between steps, and fails/finishes tasks.

```txt
lib/chernobog/execution/toolExecutionHandlers.ts
```

Bridges execution actions into the real Chernobog tool executor.

```txt
lib/chernobog/execution/defaultExecutionHandlers.ts
```

Provides the default real tool-backed execution handlers.

```txt
lib/chernobog/execution/internalExecutionHandlers.ts
```

Provides internal workflow handlers such as execution state summary, approval test, and summarize-last-read.

```txt
lib/chernobog/execution/executionState.ts
```

Stores derived execution continuity state such as selected file, last read file, last read text, active task, and last task.

```txt
lib/chernobog/execution/approval.ts
```

Provides approval/denial task state helpers.

```txt
lib/chernobog/execution/approvalCommands.ts
```

Handles commands such as `approve`, `deny`, `continue`, and `cancel task`.

```txt
lib/chernobog/execution/riskPolicy.ts
```

Defines how safe, notice, approval-required, and blocked actions behave.

```txt
lib/chernobog/execution/formatExecutionResponse.ts
```

Turns completed/failed/waiting execution tasks into user-facing responses.

```txt
lib/chernobog/execution/diagnostics.ts
```

Builds compact diagnostics for the trust trace and future UI panels.

```txt
lib/chernobog/execution/executeFromMessage.ts
```

Main V5 execution entry point.

---

## Execution Task Categories

Current categories:

```txt
file_workflow
follow_up
approval_flow
execution_summary
summarization
system_operation
unknown
```

### file_workflow

Used for direct file actions such as:

```txt
find notes and read it
open roadmap
read notes
find roadmap and open it
```

### follow_up

Used when the command relies on previous execution state:

```txt
open it
read it again
open the folder
```

### approval_flow

Used for approval-gated execution flows:

```txt
test approval
```

### execution_summary

Used for execution state inspection:

```txt
what did you just do
show execution state
show last task
```

### summarization

Used for follow-up summarization:

```txt
summarize it
summarize the last file
summarize what you read
```

---

## Risk Levels

Current risk levels:

```txt
safe
notice
approval_required
blocked
```

### safe

Runs automatically.

Used for read-only actions such as searching, reading, summarizing, and execution summaries.

### notice

Runs automatically for now, but is classified as a higher-awareness action.

Used for actions such as opening files and folders.

### approval_required

Pauses execution until the user approves.

Used for actions that should not run without explicit confirmation.

### blocked

Fails immediately.

Used for actions that should not be allowed.

---

## Approval Commands

Supported approval commands:

```txt
approve
approved
yes
yes continue
continue
continue task
resume
resume task
go ahead
```

Supported denial/cancel commands:

```txt
deny
denied
no
cancel
cancel task
stop
stop task
```

Approval works against `session.executionState.activeTask`.

---

## Supported V5.0 Commands

### File workflows

```txt
find notes and read it
search for notes and read it
find notes then read it
search notes then read it
find notes and open it
search for notes and open it
read notes
open notes
```

### Follow-ups

```txt
open it
open that
read it
read that
read it again
open it again
open the folder
open containing folder
open the containing folder
```

### Summaries

```txt
summarize it
summarise it
summarize that
summarise that
summarize the file
summarise the file
summarize the last file
summarise the last file
summarize what you read
summarise what you read
```

### State inspection

```txt
what did you just do
what did you do
show execution state
show task state
show last task
```

### Approval testing

```txt
test approval
test approval flow
test execution approval
```

---

## Session State

V5 execution state is stored on the session as:

```ts
session.executionState
```

This allows later commands to resolve against previous work.

Example:

```txt
find notes and read it
```

stores:

```txt
selectedFilePath
lastReadFilePath
lastReadText
lastTask
```

Then:

```txt
open it
```

can use the saved selected file path.

---

## Diagnostics

Each handled V5 task emits compact diagnostics into the trust trace.

Diagnostics include:

```txt
taskId
category
goal
status
risk
totalSteps
completedSteps
failedSteps
blockedSteps
currentStepId
selectedFilePath
lastReadFilePath
hasLastReadText
error
```

This is intended for debugging now and future UI display later.

---

## Known Limitations

- Task building is still deterministic and pattern-based.
- There is no model-generated execution plan yet.
- Approval persistence works through active session state, not long-term storage.
- Notice-level actions currently run automatically.
- Summarization is simple and extractive, not LLM-powered yet.
- The execution queue is not implemented yet.
- Retry and rollback logic are not implemented yet.
- Only file and internal workflow actions are currently supported.

---

## V5.0 Completion Criteria

V5.0 should be considered complete when the following are stable:

```txt
file workflow tasks
follow-up execution state
approval pause/resume/deny
task diagnostics
session execution state persistence
clean trace visibility
documentation
```

After that, the next roadmap stage can begin with stronger execution planning, queues, retry handling, rollback strategy, and eventually broader system actions.
