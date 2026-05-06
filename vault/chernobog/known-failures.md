# Chernobog Known Failures

## Purpose

This note records known AI and self-development failures so Chernobog does not repeat them.

## Failure: Invented Dashboard Files

Models previously proposed dashboard files that did not exist, including:

- `components/Dashboard.jsx`
- `src/components/Dashboard.jsx`
- `src/components/Dashboard.tsx`
- `styles/theme.js`

Lesson:

Chernobog must validate all proposed file references against the actual allowed file list.

## Failure: Invented StatsPanel

A model proposed:

- `components/command/StatsPanel.tsx`

This file did not exist.

Lesson:

Do not treat invented component names as real files. New files must be explicitly marked as new and require operator approval.

## Failure: Markdown Fence Written Into Source File

A generated patch wrote a markdown fence into:

- `components/command/CommandHeader.tsx`

The file ended with a triple-backtick markdown fence.

This caused a Next.js parsing error:

```txt
Unterminated template
```

Lesson:

Generated source output must be stripped and checked for markdown fences before writing.

## Failure: Destructive CommandHeader Rewrite

A generated patch reduced `components/command/CommandHeader.tsx` from roughly 550 lines to around 180 lines.

The model damaged the original structure and replaced custom Tailwind styling with inappropriate plain style object concepts.

Lesson:

Full-file rewrite is too dangerous for large UI components without preservation validation.

Chernobog must reject patches that shrink or expand source files too much.

## Failure: Generic Web App Pattern Matching

Models sometimes behave as if Chernobog is a generic React dashboard.

Symptoms:

- inventing `Dashboard.jsx`
- proposing generic log filtering
- proposing generic theme files
- proposing unrelated dashboard patterns

Lesson:

Self-development prompts must include Chernobog-specific project doctrine, file map, and design rules.

## Failure: Broad Patch Plans

A model proposed introducing a new `StatsPanel` component for `CommandHeader`.

This was too broad for a first self-patch because `CommandHeader` already contains `StatusCell` and a stats grid.

Lesson:

First self-patches should be narrow, one-file, and minimal.

## Current Safety Position

Chernobog may attempt self-patching, but unsafe generated patches are considered successful safety outcomes if they are rejected before writing.

A patch rejection is not a failure if it protects the project.
