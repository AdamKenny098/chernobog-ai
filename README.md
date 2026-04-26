# Chernobog AI

Chernobog is a local personal AI assistant interface built from the ground up.

It is designed as a command-oriented AI shell rather than a simple chatbot. The system can route user messages, execute deterministic tools, manage file workflows, preserve session state, maintain active plans, expose debug traces, and use layered memory context.

The long-term goal is to evolve Chernobog into a highly functioning near-autonomous personal AI assistant that can plan, coordinate, execute, recover, and interact with local system tools safely.

---

## Current Version

```txt
V4.10 — Repository Cleanup and Stabilization
```

The V4 line focuses on stabilizing the core assistant framework before moving into V5 autonomous execution.

Completed V4 milestones:

```txt
V4.1 — Command Core Stabilization
V4.2 — Operational Console
V4.3 — Tool Expansion
V4.4 — Smarter Orchestration
V4.5 — Developer Trust Layer
V4.6 — Persistence and Continuity
V4.7 — Planner and Task Coordination
V4.8 — Memory Architecture Upgrade
V4.9 — Unified Command Language
V4.10 — Repository Cleanup and Stabilization
```

---

## Core Features

### Command Pipeline

All user input flows through a central command pipeline.

The pipeline prioritizes deterministic handling before falling back to model-based routing.

```txt
User input
→ API route
→ command pipeline
→ memory commands
→ continuity checks
→ unified command language
→ planner commands
→ tool commands
→ file follow-ups
→ orchestration layer
→ legacy parser/classifier fallback
→ routed model response
→ session update
→ trust trace
→ UI payload
```

Main file:

```txt
lib/chernobog/pipeline/runCommand.ts
```

---

## Unified Command Language

Chernobog uses a unified command language to classify commands into a consistent structure.

```txt
domain    → memory | planner | file | app | workflow | context | chat | guardian
action    → create | show | continue | revise | clear | search | read | open | remember | forget | complete | block
target    → memory | plan | file | app | workflow | context
reference → current | active | first_result | selected | last_read | last_opened | same
```

Examples:

```txt
command help
make a plan for finishing V4.10
show current plan
complete step 1
show working memory
find roadmap
open the first one
read it
remember that Chernobog has layered memory
open spotify
```

Main directory:

```txt
lib/chernobog/command-language/
```

---

## Planner System

Chernobog includes a persistent active planner.

The planner can:

```txt
create plans
show the active plan
continue the active plan
track the next step
complete steps
block steps
revise plans
clear plans
```

Example commands:

```txt
make a plan for testing final V4
show current plan
next step
complete step 1
block step 3
clear current plan
```

Main directory:

```txt
lib/chernobog/planner/
```

UI component:

```txt
components/command/PlannerInspector.tsx
```

---

## Memory Architecture

Chernobog uses layered memory instead of a single flat memory list.

### Short-Term Memory

Recent conversation flow.

### Working Memory

Current active context, including:

```txt
active route
active tool
active plan
file workflow
selected file
last read file
workflow candidates
```

### Long-Term Memory

Explicitly persisted user/project facts.

Example commands:

```txt
remember that I prefer compact technical answers
what do you remember?
show memory layers
show working memory
show long term memory
forget that I prefer compact technical answers
wipe memories
```

Main files:

```txt
lib/chernobog/memory.ts
lib/chernobog/memory-architecture/
```

UI panel:

```txt
components/MemoryArchitecturePanel.tsx
```

---

## Tool System

Chernobog supports deterministic tools for local/system actions.

Current tool areas:

```txt
time
files
file search
app opening
URL opening
```

Important built-in tools:

```txt
get_time
find_files
list_files
read_text_file
open_file
open_folder
open_app
open_url
```

Main directory:

```txt
lib/chernobog/tools/
```

---

## Session Persistence

Chernobog persists session context so follow-up commands survive refreshes.

Examples:

```txt
find roadmap
open the first one
read it
what file did you just read?
what are we working on right now?
```

Main directory:

```txt
lib/chernobog/session/
```

Key features:

```txt
persistent session ID
active workflow state
file candidates
selected file
last read file
active plan
pending disambiguation
continuity queries
```

---

## Developer Trust Layer

The trust layer records how Chernobog handled each command.

It tracks:

```txt
input
route
tool
workflow state
planner state
memory handling
command-language parse
failure category
trace steps
```

Main directory:

```txt
lib/chernobog/trust/
```

Developer UI panels:

```txt
components/chernobog/TrustDebugPanel.tsx
components/chernobog/TrustTraceHistory.tsx
components/chernobog/ChernobogDebugStatePanel.tsx
components/CommandLanguagePanel.tsx
components/MemoryArchitecturePanel.tsx
```

---

## UI Overview

Main UI entry:

```txt
components/UmbraAIConsole.tsx
```

Main shell:

```txt
components/command/CommandShell.tsx
```

Core UI components:

```txt
components/command/CommandHeader.tsx
components/command/SubsystemRail.tsx
components/command/CoreEye.tsx
components/command/TelemetryPanel.tsx
components/command/ContextPanel.tsx
components/command/DirectiveFeed.tsx
components/command/WorkflowInspector.tsx
components/command/PlannerInspector.tsx
components/command/CommandComposer.tsx
```

The visual direction is a dark command-interface aesthetic centered around the Chernobog “God Program” identity.

---

## API Routes

```txt
/api/chat
/api/session
/api/session/reset
/api/debug/state
/api/debug/traces
/api/debug/memory
/api/debug/command-language
```

### `/api/chat`

Main command input route.

### `/api/session`

Hydrates persisted session state.

### `/api/session/reset`

Clears/reset session context.

### `/api/debug/state`

Returns recent messages, memories, and tool calls.

### `/api/debug/traces`

Returns trust trace history.

### `/api/debug/memory`

Returns layered memory context.

### `/api/debug/command-language`

Parses a message into the unified command structure.

---

## Database

Chernobog uses a local SQLite database.

Runtime location:

```txt
data/chernobog.db
```

Expected runtime tables include:

```txt
messages
memories
tool_calls
session_state
trust traces
```

Runtime DB files should not be committed:

```txt
data/*.db
data/*.db-shm
data/*.db-wal
data/*.sqlite
data/*.sqlite3
```

---

## Tech Stack

```txt
Next.js
React
TypeScript
Tailwind CSS
SQLite
Ollama
Local deterministic tools
```

Default local model configuration is handled through environment variables.

Relevant environment variables:

```env
OLLAMA_URL=http://localhost:11434/api/chat
OLLAMA_MODEL=gemma3
```

---

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

Run TypeScript check:

```bash
npx tsc --noEmit
```

Run lint:

```bash
npm run lint
```

Run production build:

```bash
npm run build
```

---

## Useful Test Commands

### Command Language

```txt
command help
show commands
```

### Planner

```txt
make a plan for testing final V4
show current plan
next step
complete step 1
block step 3
clear current plan
```

### Memory

```txt
remember that Chernobog V4.10 is repo stabilization
what do you remember?
show memory layers
show working memory
show long term memory
forget that Chernobog V4.10 is repo stabilization
```

### File Workflow

```txt
find roadmap
open the first one
read it
what file did you just read?
what are we working on right now?
```

### Tools

```txt
open spotify
open browser
open https://example.com
```

---

## Development Notes

The system is intentionally layered.

High-confidence deterministic commands should be handled before slow model routing.

The current route priority is roughly:

```txt
hard memory routes
continuity queries
command help
unified memory actions
memory architecture commands
planner commands
unified explicit tool calls
file follow-ups
orchestration
legacy tool parser
tool intent classifier
vague file fallback
normal model router
```

This route order protects the assistant from hallucinating state that already exists locally.

---

## V5 Direction

The next major milestone is:

```txt
V5.0 — Autonomous Execution Core
```

V5 should build on the stabilized V4 base.

Planned V5 focus:

```txt
multi-step autonomous task execution
task lifecycle state
confirmation gates
tool failure recovery
execution queues
stronger filesystem safety
workflow-level rollback/retry logic
clearer subsystem separation
```

The V4 system now provides the foundation needed for that jump.

---

## Project Status

```txt
Current status:
V4.10 repository stabilization in progress / near complete.

Next major milestone:
V5.0 autonomous execution core.
```
