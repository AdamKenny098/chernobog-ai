# Architecture — Project & Version Memory Profiles

## Problem

Structured memory entries are useful, but the assistant still needs a stable state layer that answers:

```txt
current project
current version
latest completed milestone
next recommended milestone
known project aliases
```

Without that layer, recall has to infer scope from each query, which is fragile.

## Design

V5.6.5 adds a small JSON-backed profile store:

```txt
ProjectMemoryProfileStore
  profiles.json
  versions.json
  current-state.json
  audit-log.json
```

The store is separate from structured memory entries because project state is operational metadata, not ordinary memory content.

## ProjectMemoryProfile

A project profile tracks canonical identity and high-level state:

```txt
projectId
displayName
description
aliases
status
currentVersion
latestCompletedVersion
nextRecommendedVersion
activeFocus
tags
createdAt
updatedAt
```

## VersionMemoryProfile

A version profile tracks version-level progress:

```txt
projectId
version
title
status
summary
previousVersion
nextVersion
startedAt
completedAt
tags
createdAt
updatedAt
```

Version status values:

```txt
planned
active
completed
paused
superseded
```

## CurrentProjectMemoryState

The current-state file gives Chernobog a default operating scope:

```txt
activeProjectId
activeVersion
latestCompletedVersion
nextRecommendedVersion
note
updatedAt
```

## Scope resolution order

The `resolveProjectMemoryScope` helper resolves project/version scope in this order:

```txt
1. explicit project/version passed by caller
2. current active project/version
3. query inference
4. no scope
```

This avoids reckless cross-project memory blending while still allowing useful defaults.

## Safety boundary

V5.6.5 does not approve memory, write code autonomously, create missions, or start agents. It only creates project/version memory state for later vault-only answering.
