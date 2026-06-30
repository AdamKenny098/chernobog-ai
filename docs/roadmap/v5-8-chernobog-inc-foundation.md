# V5.8 — Chernobog Inc Foundation

## Purpose

V5.8 introduces the company-style organizational skeleton for Chernobog Inc.

The user remains the CEO. Chernobog becomes the Executive Core. Departments exist as planning and reporting structures only.

This milestone does not introduce autonomous agents, missions, background workers, or execution authority.

## Scope

V5.8 adds:

- Executive Core definition
- department definitions
- role definitions
- report format
- approval-gated work proposal records
- Chernobog Inc command helpers
- Chernobog Inc structure/proposal API routes
- verification proving the layer is non-agentic and non-executing

## Departments

Initial departments:

- Engineering
- Design
- Narrative
- Research
- Operations
- Security

## Roles

Initial role catalog:

- Executive Core
- Project Lead
- Planner
- Designer
- Creator
- Reviewer
- Security Analyst

All roles have `mayExecuteTools: false` in V5.8.

## Work proposal rule

V5.8 work proposals are planning artifacts.

They begin with:

```txt
status: proposed
approvalGate.required: true
executionAllowed: false
```

A proposal may describe work, but it cannot execute work.

## Completion condition

V5.8 is complete when Chernobog can display its Inc foundation, departments, roles, report format, and create approval-gated work proposals without introducing autonomous execution.

## Next milestone

V5.9 should introduce the Mission System and Department Workers, but only after V5.8 passes and governance boundaries remain intact.
