# Chernobog File Map

## Project Root

Chernobog is a local-first personal AI assistant project built with:

- Next.js
- React
- TypeScript
- Tailwind
- Ollama
- local deterministic tools
- local execution state
- project self-development workflow
- Obsidian-style project vault
- modular capability system

## Main UI Files

### Core UI Container

```txt
components/UmbraAIConsole.tsx
```

Purpose:

- owns the main command console state
- manages session ID
- sends messages to `/api/chat`
- stores logs
- hydrates session state
- builds subsystem state
- passes data into `CommandShell`

### Command Dashboard Shell

```txt
components/command/CommandShell.tsx
```

Purpose:

- main dashboard layout
- renders header, rails, core eye, directive feed, telemetry, context, workflow inspector, planner inspector, developer controls, and command composer

### Header

```txt
components/command/CommandHeader.tsx
```

Purpose:

- top command header
- displays title, subtitle, session description, system stats, and command-chain status visuals
- uses `StatusCell`
- uses Tailwind-heavy militarized Chernobog styling

Safety note:

- should not be destructively rewritten
- large UI rewrites require explicit approval

### Core Eye

```txt
components/command/CoreEye.tsx
```

Purpose:

- displays the central Chernobog eye/sigil visual identity
- important to the God Program feeling

### Other UI Components

```txt
components/command/SubsystemRail.tsx
components/command/DirectiveFeed.tsx
components/command/CommandComposer.tsx
components/command/TelemetryPanel.tsx
components/command/ContextPanel.tsx
components/command/WorkflowInspector.tsx
components/command/PlannerInspector.tsx
```

## Core Backend Files

### Command Pipeline

```txt
lib/chernobog/pipeline/runCommand.ts
lib/chernobog/pipeline/domainHandlers.ts
```

Purpose:

- route user messages
- dispatch module/domain handlers
- maintain trust trace
- finalize responses

Refactor note:

- should become thinner over time
- should not own every domain workflow

### Command Language

```txt
lib/chernobog/command-language/
```

Purpose:

- normalize user messages into command structures
- support core and module command parsing

Related doctrine:

- [[Command Language]]

### Execution Layer

```txt
lib/chernobog/execution/buildExecutionTask.ts
lib/chernobog/execution/runExecutionTask.ts
lib/chernobog/execution/executionState.ts
lib/chernobog/execution/internalExecutionHandlers.ts
lib/chernobog/execution/toolExecutionHandlers.ts
lib/chernobog/execution/defaultExecutionHandlers.ts
```

Purpose:

- convert natural language into structured execution tasks
- track task/proposal/patch state
- bridge execution steps to tools

### Tool Layer

```txt
lib/chernobog/tools/registry.ts
lib/chernobog/tools/builtins/
```

Purpose:

- register available local tools
- expose deterministic operations

Important tools:

```txt
get_time
find_files
list_files
read_text_file
open_file
open_folder
open_app
open_url
create_folder
create_text_file
append_text_file
rename_path
copy_path
move_path
write_project_file
run_project_command
read_project_note
search_project_notes
```

Vault tools should be spread into the registry from the Obsidian vault module.

Correct pattern:

```ts
...vaultToolRegistry
```

Incorrect pattern:

```ts
vault_tool_registry: vaultToolRegistry
```

## Module Layer

### Obsidian Vault Module

```txt
lib/modules/obsidian-vault/
```

Purpose:

- vault commands
- vault tools
- vault session state
- vault follow-ups
- Markdown knowledge graph behavior

Related doctrine:

- [[Vault Module]]
- [[Module Map]]

### Future File Workflow Module

Proposed:

```txt
lib/modules/file-workflow/
```

Purpose:

- file search/read/open workflow
- file follow-ups
- active file state

## Vault Files

```txt
vault/chernobog/
```

Core notes:

```txt
overview.md
current-state.md
architecture.md
file-map.md
known-failures.md
model-routing.md
design-doctrine.md
patch-safety-rules.md
self-development-rules.md
roadmap.md
```

Recommended added notes:

```txt
module-map.md
pipeline-map.md
command-language.md
vault-module.md
refactor-targets.md
module-contract.md
decisions/*.md
checklists/*.md
```

## Non-Existent Files

The following files are not part of the current Chernobog dashboard unless explicitly created later:

```txt
components/Dashboard.jsx
src/components/Dashboard.jsx
src/components/Dashboard.tsx
styles/theme.js
components/command/StatsPanel.tsx
```

Chernobog must not propose these as existing files.
