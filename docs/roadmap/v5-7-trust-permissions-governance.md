# Chernobog V5.7 — Trust, Permissions & Governance

## Purpose

V5.7 adds the governance layer required before Chernobog Inc, missions, departments, or controlled agentic execution.

The goal is not to make Chernobog more autonomous yet.

The goal is to define what Chernobog is allowed to do, what requires approval, what requires explicit approval, what is forbidden, and what must be audited.

## Scope

V5.7 introduces:

```txt
- action risk classes
- action type categories
- default trust policy manifest
- tool permission defaults
- trust decision evaluator
- trust audit log
- governance commands
- trust evaluation API
```

V5.7 does not introduce:

```txt
- agents
- departments
- missions
- autonomous execution
- Chernobog Inc UI
- background workers
```

## Risk Classes

```txt
safe_auto
safe_with_notice
requires_approval
dangerous_requires_explicit_approval
forbidden
```

## Completion Condition

V5.7 is complete when Chernobog can classify proposed actions into governance outcomes:

```txt
allowed
notice
approval-required
blocked
```

and record those decisions in an audit log without executing the action.

## Relationship to V5.6

V5.6 made memory reliable.

V5.7 makes future capability bounded.

Before Chernobog can become a company-style agentic organisation, it must know what work is safe, what work needs CEO approval, and what work is not allowed.
