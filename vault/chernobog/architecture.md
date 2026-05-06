# Chernobog Architecture

## High-Level Architecture

Chernobog is structured around several cooperating layers:

1. User Interface Layer
2. API / Command Pipeline Layer
3. Execution Task Layer
4. Tool Layer
5. LLM / Model Routing Layer
6. Memory / Project Knowledge Layer
7. Trust and Approval Layer

## User Interface Layer

Main UI entry points:

- `app/page.tsx`
- `components/UmbraAIConsole.tsx`
- `components/command/CommandShell.tsx`

The UI displays:

- command feed
- command composer
- current session state
- subsystem status
- workflow state
- context state
- telemetry panels
- developer/debug panels

## API / Pipeline Layer

The chat API receives user directives and routes them into the command system.

Important files:

- `app/api/chat/route.ts`
- `app/api/session/route.ts`
- `lib/chernobog/pipeline/runCommand.ts`
- `lib/chernobog/pipeline/types.ts`

The pipeline is responsible for deciding whether a message is handled as normal chat, memory, tool workflow, execution task, or internal system action.

## Execution Task Layer

The execution layer converts natural-language commands into structured execution tasks.

Important files:

- `lib/chernobog/execution/buildExecutionTask.ts`
- `lib/chernobog/execution/runExecutionTask.ts`
- `lib/chernobog/execution/executionState.ts`
- `lib/chernobog/execution/internalExecutionHandlers.ts`
- `lib/chernobog/execution/toolExecutionHandlers.ts`
- `lib/chernobog/execution/defaultExecutionHandlers.ts`

The execution layer tracks:

- active task
- last task
- selected files/folders
- last read/opened/written files
- self-development target
- active development files
- last proposal
- prepared patch plan
- rejected patch information

## Tool Layer

The tool layer exposes local actions to Chernobog.

Examples:

- open app
- open file
- open folder
- create folder
- create text file
- append text to file
- rename path
- copy path
- move path
- list directory
- get path info
- write project file
- run approved project command

Project writes and project commands must remain approval-gated.

## LLM / Model Routing Layer

The model layer routes different types of work to different local Ollama models.

Important files:

- `lib/chernobog/llm/modelRouter.ts`
- `lib/chernobog/llm/ollamaClient.ts`

Current routing:

- default role: `gemma3`
- code role: `deepseek-coder-v2:16b`
- planner role: code model
- repair role: code model

The default brain handles ordinary interaction. The code brain handles self-development, proposal generation, patch generation, and patch repair.

## Project Knowledge Layer

V5.3 introduces a local markdown vault:

- `vault/chernobog/`

This vault stores durable project doctrine:

- current state
- file map
- patch safety rules
- known failures
- architecture
- model routing
- roadmap
- design doctrine

This layer should be read before Chernobog proposes or applies self-development changes.

## Trust and Approval Layer

Chernobog must distinguish safe, notice-level, and approval-required actions.

Approval-required actions include:

- writing project files
- creating/modifying local files
- running project commands
- applying generated patches

Trust rules:

- inspect safely
- propose safely
- plan safely
- write only with approval
- validate after writes
- reject unsafe model output
- preserve operator control
