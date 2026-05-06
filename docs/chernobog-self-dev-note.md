# Chernobog Self-Development Note

Target: dashboard

## Current Proposal

Development proposal for dashboard:

Proposed improvement: Add a small, visually distinct icon to the `CommandHeader` component to indicate the overall status of the command chain. This will provide a quick, at-a-glance overview of the command’s health.

Files affected:
- `components/command/CommandHeader.tsx`

New files, if any:
- None

Why this matters: Users currently rely on parsing text within the `CommandHeader` to understand the command’s status. A clear icon will dramatically improve comprehension.

Safety:
- Requires approval before project-file writes.
- Run project check after changes.

Recommended next command:
write dev note

## Validation

Run `npx tsc --noEmit` after applying project changes.

## Safety Rule

Project file writes must remain approval-gated.
