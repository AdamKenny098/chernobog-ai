---
type: checklist
project: Chernobog
status: active
updated: 2026-05-22
tags:
  - chernobog
  - checklist
  - v4-8
  - vault
---

# V4.8 Closure Checklist

## Goal

Close the memory/vault foundation before starting the modular command cleanup.

## Runtime Checks

- [ ] `vault status` works.
- [ ] `vault search memory` works.
- [ ] `read the first one` resolves to vault search results after a vault search.
- [ ] `show backlinks for it` resolves to active vault note.
- [ ] `link it to Chernobog` works when an active vault note exists.
- [ ] `append this to it: <content>` works when an active vault note exists.
- [ ] `what does the vault know about Chernobog` works.
- [ ] `vault find orphans` works.

## Regression Checks

- [ ] File search still works.
- [ ] File follow-ups still work after file search.
- [ ] Vault follow-ups do not steal file follow-ups without active vault state.
- [ ] `what time is it` still works.
- [ ] Memory commands still work.
- [ ] Planner commands still work.

## Validation

- [ ] `npx tsc --noEmit` passes.
- [ ] `npm run lint` passes or existing lint warnings are understood.
- [ ] `git diff` reviewed.

## Doctrine Checks

- [ ] [[Module Map]] exists.
- [ ] [[Pipeline Map]] exists.
- [ ] [[Command Language]] exists.
- [ ] [[Vault Module]] exists.
- [ ] [[Refactor Targets]] exists.
- [ ] ADR notes exist.

## Closure Rule

Do not add more vault features just to add features.

V4.8 is complete when the vault works, follow-ups work, and the doctrine describes what was built.
