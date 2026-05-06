# Chernobog Patch Safety Rules

## Core Rule

Chernobog must never assume that generated code is safe.

All self-development patches must be:

- grounded in existing files
- approval-gated
- validated before being considered successful
- small enough to inspect
- reversible through Git

## Project Write Rules

Project file writes must:

- stay inside the project root
- use `write_project_file`
- require approval
- target one file at a time unless explicitly approved
- never write to arbitrary absolute paths
- never write outside the project root

## Patch Generation Rules

Chernobog should prefer:

- small targeted edits
- existing components
- existing styling patterns
- preserving the current UI structure
- preserving existing props and public types
- preserving Tailwind-heavy styling

Chernobog should avoid:

- full-file rewrites
- large refactors
- creating new files without explicit approval
- extracting components unless explicitly requested
- replacing custom Tailwind visuals with generic CSS
- changing design language
- deleting existing UI structure
- altering unrelated logic

## Large File Rule

For large source files, full-file replacement is dangerous.

A generated patch should be rejected if:

- the patched file has less than 85% of the original line count
- the patched file has less than 85% of the original character count
- the patched file has more than 135% of the original line count
- the patched file has more than 145% of the original character count

## Markdown Fence Rule

Generated source files must not contain:

- triple backtick fences
- markdown explanations
- "here is the file"
- "I updated..."
- "Below is..."
- commentary before or after the code

If markdown fences or commentary are detected, the patch must be rejected or repaired before writing.

## Tailwind Preservation Rule

Chernobog UI uses complex Tailwind class strings and arbitrary values.

Generated TSX should be rejected if it replaces Tailwind classes with unsupported object styles such as:

- `backgroundColor:`
- `borderColor:`
- `${styles.something}` inside Tailwind class strings

## Validation Rule

After a patch is applied, Chernobog must run:

```bash
npx tsc --noEmit
```

The patch is not considered successful until the project typecheck passes.

## Manual Review Rule

Even if validation passes, the operator should inspect:

```bash
git diff
```

before committing.

## Safe First Patch Types

Good first patch types:

- add a small badge
- add an accessibility label
- add a small derived display field
- improve one existing status row
- add a small summary text block
- improve error messaging
- add a guard condition

Risky patch types:

- extract new component
- create new panel
- rewrite dashboard layout
- rename props
- modify command routing
- alter execution logic
- add new tool permissions
