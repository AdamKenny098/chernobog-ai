# V5.9.5 — Controlled Agentic Execution

## Purpose

V5.9.5 introduces controlled execution planning for Chernobog Inc missions.

This is not free-roaming agency. It is a gated planning layer that prepares execution plans, evaluates risk, records approval checkpoints, stores rollback notes, and creates dry-run records.

## What this milestone adds

- controlled execution plan schema
- execution step schema
- governance evaluation per planned step
- CEO and security execution checkpoints
- step-level checkpoints for risky actions
- rollback notes
- dry-run records
- controlled execution audit log
- command bridge support
- API routes for plans, checkpoints, and dry runs

## What this milestone does not add

- autonomous agents
- shell execution
- repo writes
- tool execution
- background work
- automatic approval
- permission bypasses

## Completion condition

V5.9.5 is complete when Chernobog can create a controlled execution plan from an approved mission, evaluate every planned step through trust governance, require approval checkpoints, create a dry run, and prove that no actual tool execution occurs.
