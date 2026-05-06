# Chernobog Model Routing

## Purpose

Chernobog uses multiple local Ollama models so the right brain handles the right type of work.

The default model should not be forced to perform all code-generation tasks.

## Current Roles

### Default Model

Environment variable:

```env
OLLAMA_MODEL=gemma3
```

Purpose:

- normal conversation
- simple command responses
- general assistant behavior
- lightweight local reasoning

### Code Model

Environment variable:

```env
OLLAMA_CODE_MODEL=deepseek-coder-v2:16b
```

Purpose:

- code-aware proposals
- self-development planning
- patch generation
- patch repair
- file-aware reasoning

## Current Hardware Reality

Machine:

- NVIDIA RTX 3080 10GB VRAM
- 64GB system RAM
- AMD Ryzen 3 3100
- Windows 10

DeepSeek-Coder-V2 16B runs, but it is heavy.

Observed behavior:

- around 10GB model size
- about 83% GPU / 17% CPU offload
- near full VRAM usage
- proposal generation may take around 80 seconds with reduced prompt size

## Prompt Size Rule

For self-development proposal generation, keep the source prompt limited.

Current preferred limits:

```ts
const MAX_DEV_FILES_TO_READ = 3;
const MAX_CHARS_PER_DEV_FILE = 2500;
```

Large prompts cause slow generation and timeouts.

## Timeout Rule

The Ollama client should allow longer generation time for local coder models.

Suggested defaults:

- proposal generation: 300 seconds
- patch generation: 420 seconds
- patch repair: 420 seconds

## Routing Files

Model routing is implemented in:

- `lib/chernobog/llm/modelRouter.ts`
- `lib/chernobog/llm/ollamaClient.ts`

## Status Visibility

`system status` should display the active routing:

- default model
- code model
- planner model
- repair model

## Future Model Ideas

Possible future roles:

- fast model for quick command classification
- code model for source proposals
- patch model for final code generation
- vision model for UI/screenshot interpretation
- research model for long reasoning

Do not add too many roles until the two-model system is stable.
