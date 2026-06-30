# Chernobog V5.6.5 — Project & Version Memory Profiles

## Purpose

V5.6.5 adds the project/version state layer above structured vault memory.

V5.6.2 created structured memory.
V5.6.3 created approved memory recall.
V5.6.4 created review and approval commands.

V5.6.5 now gives Chernobog a reliable answer to:

```txt
What project are we in?
What version are we working on?
What did we finish last?
What is next?
What aliases refer to this project?
```

This is still not an agent system, mission system, or autonomous execution layer.

## Deliverables

```txt
lib/modules/vault-brain/projectProfileStore.ts
lib/modules/vault-brain/projectMemoryScope.ts
lib/modules/vault-brain/projectMemoryProfileCommands.ts
scripts/apply-v5-6-5-project-profiles.mjs
scripts/verify-chernobog-v5-6-5.ts
```

## New command surface

```txt
show project memory profiles
show project aliases
show project profile <project>
show version profile <project> <version>
show current project state
show memory scope <query>
set active project <project>
set active version <version>
mark latest completed <version>
set next milestone <version>
```

## Store path

Project/version profile data is stored separately from structured memory entries:

```txt
vault/chernobog/system/vault-brain/project-profiles/
  profiles.json
  versions.json
  current-state.json
  audit-log.json
```

## Completion condition

V5.6.5 is complete when Chernobog can persist and retrieve:

```txt
activeProjectId
activeVersion
latestCompletedVersion
nextRecommendedVersion
project aliases
version profiles
```

and the verifier, TypeScript, and lint checks pass.

## Next milestone

Recommended next milestone:

```txt
V5.6.6 — Vault-Only Answer Mode
```

V5.6.6 should wire approved recall and project/version scope into the answer layer so Chernobog can produce stricter vault-only answers.
