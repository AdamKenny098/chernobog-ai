# Chernobog Project Operations V1.2

This is the focused project-workspace redesign for Project Operations V1. It is intended to be installed after the V1.1 dashboard cleanup.

## What changed

- Rebuilt an opened project as a dedicated operational dossier.
- Made the active directive and recommended next move the dominant project readout.
- Added a compact project signal strip for Doing, Urgent, Tasks, Notes, and Progress.
- Added a mission-intelligence panel for repository state, local path, updates, and blockers.
- Reworked boards into a compact execution matrix with clearer task channels and counts.
- Collapsed task creation until `Issue new task` is opened.
- Moved notes, links, command shortcuts, activity, settings, and archive controls into deliberate drawers.
- Preserved every existing server action, SQLite record, command, task, note, link, and project route.

## Install

This package requires Chernobog Project Operations V1 to be installed. V1.1 is recommended because it cleans up the `/projects` overview separately.

Extract this ZIP into:

```text
C:\Users\adamt\Documents\chernobog-ai-ui
```

Allow Windows to replace these two files:

```text
components\project-operations\ProjectWorkspace.tsx
components\project-operations\ProjectBoard.tsx
```

From PowerShell in the Chernobog project folder, run:

```powershell
if (Test-Path .next) {
    Remove-Item .next -Recurse -Force
}

npm run chernobog:project-ops:verify
npx tsc --noEmit
npm run lint
npm run build
npm run dev
```

Then open:

```text
http://localhost:3000/projects
```

Open any project workspace to see the redesigned project view.

The existing 16 unrelated lint warnings and Turbopack filesystem-tracing warnings may remain. They do not block this update.
