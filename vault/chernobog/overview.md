# Chernobog Overview

## Identity

Chernobog is a local-first personal AI assistant system built from the ground up as a command-oriented God Program interface.

It is not a chatbot skin. It is intended to become a highly capable personal AI system that can understand the operator, manage local workflows, use tools, inspect its own project, and eventually assist with controlled self-development.

## Core Vision

Chernobog should become the operator's local command intelligence layer.

It should be:

- conversational when needed
- tool-capable when useful
- memory-aware over time
- project-aware during development
- approval-gated for risky actions
- visually distinct and severe
- private and local-first
- modular rather than monolithic

The long-term goal is a near-autonomous assistant that runs in the operator's own environment, with clear trust boundaries and visible execution state.

## Current Product Shape

Chernobog currently exists as a Next.js / React / TypeScript local web interface with a custom dark command dashboard.

The UI identity is built around:

- the Chernobog eye/sigil
- militarized command-panel styling
- amber/orange signal accents
- dark synthetic surfaces
- subsystem rails
- directive feed
- telemetry panels
- workflow/debug state

## Current Technical Shape

Chernobog currently includes:

- Next.js app frontend
- React command UI
- TypeScript execution layer
- Ollama local LLM integration
- model routing for default/code models
- local deterministic tool execution
- approval-gated file and system operations
- execution state tracking
- trust/debug traces
- self-development alpha workflow
- Obsidian-style project knowledge vault
- first external module under `lib/modules/obsidian-vault/`

## Strategic Direction

The current architectural direction is modularization.

Chernobog core should act as the kernel. Domain capabilities should live in modules.

Current working module:

- [[Vault Module]]

Important architecture notes:

- [[Module Map]]
- [[Pipeline Map]]
- [[Command Language]]
- [[Refactor Targets]]

## Important Principle

Chernobog must be useful without being reckless.

It should be able to act, but risky actions must remain visible, approval-gated, reversible, and validated.
