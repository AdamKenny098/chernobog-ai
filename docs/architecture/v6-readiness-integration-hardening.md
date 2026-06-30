# V6 Readiness & Integration Hardening Architecture

## Overview

The V6 readiness layer is a reporting and verification subsystem.

It sits above the existing vault-brain, governance, Chernobog Inc, mission, and controlled execution planning layers. It does not execute those systems. It checks whether they are present, exported, command-routable, API-routable, and still constrained by their safety boundaries.

## Main modules

```txt
v6ReadinessTypes.ts
v6ReadinessReport.ts
v6ReadinessCommands.ts
```

## Report generation

`generateV6ReadinessReport()` performs static integration checks from the repo root.

It checks:

- required source files
- required API routes
- command bridge imports/routing
- index exports
- package scripts
- safety boundary fragments

## Why static checks?

This layer is intentionally conservative. It should not create missions, approve checkpoints, promote memory, run tools, execute shell commands, or mutate the repo.

Static checks are enough to catch the patch-stacking problems that appeared during V5.8 and V5.9:

- missing imports
- missing command routing
- unsupported API request fields
- missing exports
- drift between modules and routes

## Command surface

Supported commands:

```txt
show v6 readiness
show v6 readiness report
generate v6 readiness report
write v6 readiness report
save v6 readiness report
show integration hardening status
show v6 integration status
show v6 readiness policy
```

## API surface

```txt
GET  /api/chernobog-inc/readiness
POST /api/chernobog-inc/readiness
```

POST supports:

```json
{
  "persist": true
}
```

When persisted, the markdown report is written to:

```txt
vault/chernobog/system/reports/v6-readiness-report.md
```

## Boundary

V5.9.6 must always report:

```txt
addsNewCapabilities: false
executesTools: false
executesMissions: false
allowsAutonomy: false
readinessOnly: true
```

If any later change violates those boundaries, it belongs in V6 or later, not V5.9.6.
