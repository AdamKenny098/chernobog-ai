# Current State Briefing Generator Architecture

## Position in the Vault Brain

The current-state briefing generator is a read-only composition layer.

It sits above:

```txt
structured memory store
project/version profile store
approved memory recall
vault-only answer mode
```

It produces a compact operational report, but does not write approved memory and does not execute tasks.

## Data Flow

```txt
Command / API request
  ↓
Resolve project and version scope
  ↓
Load project profile and current state
  ↓
Load approved structured memory for project/version
  ↓
Group entries by briefing section
  ↓
Format summary and source entry IDs
  ↓
Return briefing + warnings
```

## Policy

The briefing policy is strict:

```txt
approvedOnly: true
allowRawMemory: false
allowCandidateMemory: false
allowReviewedMemory: false
allowOutsideModelMemory: false
```

This is deliberate. A project briefing can easily become misleading if it includes raw imports, candidates, or old rejected ideas.

## Sections

The generator produces these sections:

```txt
Project State
Roadmap
Decisions
Tasks
Bugs / Fixes
Summaries
Code Summaries
```

Only sections with approved source entries appear in the main summary. The structured response still includes all sections so UI/API consumers can inspect empty categories.

## Project and Version Scope

Scope resolution follows the existing project memory profile layer:

```txt
explicit request
  ↓
active current state
  ↓
query inference
  ↓
unscoped warning
```

If a version scope exists, the briefing includes:

```txt
- approved entries matching that version
- approved project-level entries with no version
```

It does not pull unrelated versions into a version briefing.

## Safety Boundary

V5.6.9 is intentionally not a planning agent.

It may report:

```txt
latest completed version
active version
next recommended version
approved tasks
approved bugs
approved roadmap entries
approved code summaries
```

It must not:

```txt
approve memory
promote candidates
execute tools
invent missing state
silently use raw memory
silently use outside model memory
```

## Future Use

V5.7 can use this briefing as input for trust/governance decisions.

V5.8 and later Chernobog Inc layers can use this briefing as the Executive Core's project status packet before proposing missions.
