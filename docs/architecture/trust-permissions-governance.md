# Trust, Permissions & Governance Architecture

## Position

The governance layer sits between intent and execution.

```txt
User request / planned action
  ↓
Trust action request
  ↓
Policy manifest + tool permission defaults
  ↓
Trust decision
  ↓
Audit log
  ↓
Only later: execution layer may use the decision
```

## Core Rule

V5.7 evaluates actions. It does not execute them.

This keeps the milestone safe and prevents accidental autonomy.

## Main Files

```txt
trustActionTypes.ts
trustPolicyManifest.ts
toolPermissionRegistry.ts
trustDecision.ts
trustAuditLog.ts
governanceCommands.ts
```

## Decision Statuses

```txt
allowed
notice
approval-required
blocked
```

## Default Boundaries

Read-only approved memory recall is safe automatic.

File writes, memory writes, and external sends require approval.

Project commands and system execution require explicit approval.

Destructive deletion is forbidden by default.

Governance edits require explicit approval because changing the policy changes what Chernobog may do later.

## Audit

The audit log is stored under:

```txt
vault/chernobog/system/trust-governance/trust-audit-log.json
```

The policy manifest is stored under:

```txt
vault/chernobog/system/trust-governance/trust-policy.json
```
