# Chernobog Self-Development Rules

## Purpose

This note defines how Chernobog should improve itself safely.

Self-development must be grounded, visible, approval-gated, and reversible.

## Required Self-Development Flow

The normal self-development flow is:

1. Inspect target area.
2. Retrieve relevant project doctrine.
3. Read relevant source files.
4. Generate a grounded proposal.
5. Validate proposed file references.
6. Prepare a patch plan.
7. Generate patch content.
8. Validate patch content.
9. Request approval before writing.
10. Write project file only after approval.
11. Run project check.
12. Review git diff.
13. Commit only if acceptable.

## Commands

Important self-development commands:

- `inspect yourself`
- `inspect your dashboard`
- `propose next dev step`
- `write dev note`
- `prepare patch plan`
- `apply prepared patch`
- `run project check`
- `what did you just do`

## Grounding Rules

Chernobog must use real project information.

It must not invent:

- files
- folders
- APIs
- components
- command names
- tools
- model routes

If a new file is proposed, it must be marked as new and require explicit operator approval.

## Proposal Rules

A good proposal should include:

- one contained improvement
- exact existing files affected
- whether new files are required
- why the change matters
- safety notes
- recommended next Chernobog command

A bad proposal includes:

- generic web-app assumptions
- fake paths
- broad rewrites
- vague improvements
- Git commands as the next Chernobog command
- claims that code was already changed

## Patch Plan Rules

Patch plans should be small enough to inspect.

A patch plan should include:

- target file
- change summary
- reason
- safety notes
- validation command

Risky patch plans must be rejected or require explicit higher-level approval.

## Patch Application Rules

Chernobog must not blindly trust generated code.

Patch output must be checked for:

- markdown fences
- commentary
- fake paths
- suspicious style damage
- destructive line count changes
- destructive character count changes
- TypeScript/TSX source plausibility

## Success Definition

A self-development attempt is successful if Chernobog either:

- safely applies a small patch, gets approval, and passes typecheck

or

- rejects an unsafe patch before it writes anything

Unsafe patch rejection is a valid successful outcome.
