# Source Code Summary Memory Architecture

## Problem

Chernobog needs to remember what its own source files and modules do, but raw code should not be treated as approved vault truth.

Raw source can change quickly and can contain too much implementation detail for normal project-state answers. The vault brain needs a smaller structured layer that says what a file appears to be for.

## Design

V5.6.8 introduces deterministic `code-summary` memory candidates.

Pipeline:

```txt
repo source file
  -> safe scanner
  -> deterministic file-shape analysis
  -> code-summary candidate memory
  -> review / approval flow
  -> approved recall / vault-only answers later
```

## Scanner policy

Supported source extensions:

```txt
.ts
.tsx
.js
.jsx
.mjs
.cjs
```

Default excluded folders:

```txt
.git
.next
.turbo
coverage
dist
build
out
node_modules
vault
imports
```

Large files are skipped by default.

## Memory policy

Generated entries use:

```txt
source: code
memoryType: code-summary
status: candidate
sourceRef.type: code-file
sourceRef.path: <relative repo path>
```

The entry body records file shape:

- file path
- file kind
- detected imports
- detected exports
- detected functions
- detected React components
- detected API route methods

It does not store raw function bodies as approved memory.

## Approval boundary

V5.6.8 must not promote code summaries to approved memory automatically.

Approval remains manual through the structured memory review flow:

```txt
review memory entry <id>
approve memory entry <id>
```

If an existing code-summary entry is already reviewed or approved, regeneration skips it instead of downgrading it back to candidate.

## Why this matters

This gives Chernobog a safer foundation for later questions such as:

```txt
What does vault-brain do?
Where is the vault-only answer route?
Which files handle memory correction?
What modules are involved in structured memory?
```

The answer layer should eventually prefer approved `code-summary` memory over raw source dumps.
