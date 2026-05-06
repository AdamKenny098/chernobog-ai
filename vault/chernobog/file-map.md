# Chernobog File Map

## Project Root

Chernobog is a local-first personal AI assistant project built with:

- Next.js
- React
- TypeScript
- Tailwind
- Ollama
- local tools
- local execution state
- project self-development workflow

## Main UI Files

### Core UI Container

- `components/UmbraAIConsole.tsx`

Purpose:

- Owns the main command console state.
- Manages session ID.
- Sends messages to `/api/chat`.
- Stores logs.
- Hydrates session state.
- Builds subsystem state.
- Passes data into `CommandShell`.

### Command Dashboard Shell

- `components/command/CommandShell.tsx`

Purpose:

- Main dashboard layout.
- Renders header, rails, core eye, directive feed, telemetry, context, workflow inspector, planner inspector, developer controls, and command composer.

### Header

- `components/command/CommandHeader.tsx`

Purpose:

- Top command header.
- Displays title, subtitle, session description, system stats, and command-chain status visuals.
- Uses `StatusCell`.
- Uses Tailwind-heavy militarized Chernobog styling.
- Should not be destructively rewritten.

### Left Rail

- `components/command/SubsystemRail.tsx`

Purpose:

- Displays subsystem statuses such as override, optic, combat, relay, memory, and guardian.

### Core Eye

- `components/command/CoreEye.tsx`

Purpose:

- Displays the central Chernobog eye/sigil visual identity.
- Important to the "God Program" feeling.

### Directive Feed

- `components/command/DirectiveFeed.tsx`

Purpose:

- Displays user/system/router/Chernobog message feed.

### Command Composer

- `components/command/CommandComposer.tsx`

Purpose:

- Handles command input UI.

### Telemetry Panel

- `components/command/TelemetryPanel.tsx`

Purpose:

- Displays derived telemetry metrics and streams.

### Context Panel

- `components/command/ContextPanel.tsx`

Purpose:

- Displays current route, workflow state, last tool, active plan, search query, selected/read files, and summary state.

### Workflow Inspector

- `components/command/WorkflowInspector.tsx`

Purpose:

- Displays current workflow state and file-operation context.

### Planner Inspector

- `components/command/PlannerInspector.tsx`

Purpose:

- Displays active plan state.

## Execution Layer

### Task Builder

- `lib/chernobog/execution/buildExecutionTask.ts`

Purpose:

- Converts natural-language commands into execution tasks.
- Recognizes commands such as:
  - inspect yourself
  - inspect your dashboard
  - propose next dev step
  - prepare patch plan
  - apply prepared patch
  - run project check

### Task Runner

- `lib/chernobog/execution/runExecutionTask.ts`

Purpose:

- Runs execution task steps.
- Handles approval-gated steps.

### Execution State

- `lib/chernobog/execution/executionState.ts`

Purpose:

- Tracks selected files/folders.
- Tracks last read/opened/written files.
- Tracks self-development state.
- Tracks prepared patch state.
- Tracks rejected patch state.

### Internal Handlers

- `lib/chernobog/execution/internalExecutionHandlers.ts`

Purpose:

- Handles internal workflow actions such as:
  - execution summary
  - system status
  - self inspection
  - self proposal
  - prepared patch planning
  - patch generation

### Tool Handlers

- `lib/chernobog/execution/toolExecutionHandlers.ts`

Purpose:

- Bridges execution actions to registered tools.

### Default Mappers

- `lib/chernobog/execution/defaultExecutionHandlers.ts`

Purpose:

- Maps execution step input/context into tool input.

## LLM Layer

### Model Router

- `lib/chernobog/llm/modelRouter.ts`

Purpose:

- Resolves model role to Ollama model.
- Default model: normal assistant brain.
- Code/repair/planner model: coding/self-development brain.

### Ollama Client

- `lib/chernobog/llm/ollamaClient.ts`

Purpose:

- Shared Ollama generation client.
- Handles model resolution, timeout, request, and text extraction.

## Tool Layer

### Tool Registry

- `lib/chernobog/tools/index.ts`

Purpose:

- Registers available local tools.

### Project File Writer

- `lib/chernobog/tools/builtins/write-project-file.ts`

Purpose:

- Writes project files inside the project root only.
- Must remain approval-gated.

### Project Command Runner

- `lib/chernobog/tools/builtins/run-project-command.ts`

Purpose:

- Runs approved project commands.
- Current allowed validation command:
  - `npx tsc --noEmit`

## Non-existent Files

The following files are not part of the current Chernobog dashboard unless explicitly created later:

- `components/Dashboard.jsx`
- `src/components/Dashboard.jsx`
- `src/components/Dashboard.tsx`
- `styles/theme.js`
- `components/command/StatsPanel.tsx`

Chernobog must not propose these as existing files.
