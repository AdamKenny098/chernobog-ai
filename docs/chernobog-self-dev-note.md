# Chernobog Self-Development Note

Target: dashboard

## Current Proposal

Proposed improvement:
Implement a more dynamic and user-friendly dashboard mode switching mechanism that allows users to seamlessly toggle between different modes (operation, workflow, planner, developer) without manually changing settings each time they want to switch views. This will enhance the usability of the application by providing an intuitive interface for navigating through various functionalities.

Files affected:
- components/command/CommandShell.tsx
- components/command/DashboardModes.tsx (if a new file is necessary, mark it as NEW FILE)

Why this matters:
Implementing a dynamic dashboard mode switching feature will greatly improve the user experience by allowing for quick and effortless navigation between different modes without requiring additional steps or changes to settings. This will make the application more accessible and easier to use for users who need to switch views frequently.

Safety:
- Requires approval before project-file writes.
- Run project check after changes to ensure compatibility with existing functionalities and to avoid any potential conflicts or regressions in performance or user interface.

## Validation

Run `npx tsc --noEmit` after applying project changes.

## Safety Rule

Project file writes must remain approval-gated.
