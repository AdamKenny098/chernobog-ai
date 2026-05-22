---
type: checklist
project: Chernobog
status: draft
updated: 2026-05-22
tags:
  - chernobog
  - checklist
  - v4-9
  - modularization
---

# V4.9 Modularization Checklist

## Goal

Turn the module pattern into a first-class architecture and start extracting bloated infrastructure safely.

## Phase A — Module System Formalization

- [ ] Create or document a shared module contract.
- [ ] Add a module registry.
- [ ] Add parser registration through module registry.
- [ ] Add follow-up handler registration through module registry.
- [ ] Add domain handler registration through module registry.
- [ ] Add tool registry composition through module registry.
- [ ] Ensure trace output shows module routing.

## Phase B — File Workflow Extraction

- [ ] Document current file workflow behavior.
- [ ] Create `lib/modules/file-workflow/`.
- [ ] Move file command parser logic into module.
- [ ] Move file follow-up logic into module.
- [ ] Move file session state adapter into module.
- [ ] Keep old commands working.
- [ ] Test file/vault follow-up priority.

## Phase C — Command Language Cleanup

- [ ] Normalize command grammar across vault and file search.
- [ ] Normalize read/open/follow-up references.
- [ ] Update command help.
- [ ] Ensure debug command parser output includes module commands.

## Phase D — Project Workspace Prep

- [ ] Identify project doctrine retrieval flow.
- [ ] Create project workspace module plan.
- [ ] Decide whether `read_project_note` and `search_project_notes` stay as core built-ins or move into a module.

## Non-Goals

- Do not rewrite the UI.
- Do not rewrite the whole pipeline.
- Do not add web/email/calendar yet.
- Do not change self-development patching until module routing is stable.

## Completion Rule

V4.9 is successful when adding a module requires minimal core changes and command behavior is more predictable across domains.
