# Chernobog Current State

## Current Version

Chernobog is currently entering V5.3: Project Knowledge Vault / Second Brain.

V5.2 Self-Development Layer Alpha is functionally implemented as an alpha system.

## What V5.2 Added

Chernobog can now:

- Inspect its own project areas.
- Map high-level targets such as dashboard, execution layer, tool layer, memory, and command core to real project files.
- Use Ollama to propose self-development steps.
- Validate proposed file references against known allowed files.
- Reject hallucinated file paths.
- Prepare patch plans from accepted proposals.
- Attempt guarded patch generation.
- Require approval before writing project files.
- Run project validation through an approved `npx tsc --noEmit` command.
- Use multi-model routing:
  - default model for normal command behavior
  - code model for self-development and patching

## Current Model Routing

Default conversational model:

- `gemma3`

Code/self-development model:

- `deepseek-coder-v2:16b`

The model router is implemented through:

- `lib/chernobog/llm/modelRouter.ts`
- `lib/chernobog/llm/ollamaClient.ts`

## Current Problem

Chernobog can attempt self-development, but source patching is still risky.

The main failure mode is full-file rewriting. A previous AI-generated patch damaged `components/command/CommandHeader.tsx` by shrinking it from roughly 550 lines to around 180 lines and damaging the Tailwind-based visual structure.

## Current Priority

V5.3 should give Chernobog persistent project knowledge so it stops behaving like a generic coding assistant.

The priority is to make self-development doctrine-aware before allowing more patch attempts.

## Current Rule

Chernobog should not apply large source-code rewrites unless the operator explicitly approves that risk.

Prefer:

- small targeted changes
- grounded file references
- existing files only
- preserving the current UI design language
- validation before and after patching
