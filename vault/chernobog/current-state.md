# Chernobog Current State

## Current Working Track

Chernobog has reached the point where the Obsidian vault module is functioning as the first real external module.

The immediate working track is:

```txt
Finish vault/memory foundation
→ seed project doctrine
→ formalize module architecture
→ extract bloated infrastructure one domain at a time
```

Depending on roadmap naming, this may be referred to as:

- V4.8 memory/vault foundation closure
- V4.9 modular core preparation
- V5.3 project knowledge vault / second brain

The practical reality is the same: Chernobog now has a project knowledge vault and should use it to guide safer modular self-development.

## Confirmed Local Capabilities

The operator has confirmed that direct vault commands work.

Working command families include:

- `vault status`
- `vault search <query>`
- `vault read <note>`
- `vault find orphans`
- `read the first one` after a vault search
- `show backlinks for it` after a vault note is active

The vault module path is:

```txt
lib/modules/obsidian-vault/
```

## Current Vault Contents

The vault currently contains core doctrine notes:

- `overview.md`
- `current-state.md`
- `architecture.md`
- `file-map.md`
- `known-failures.md`
- `model-routing.md`
- `design-doctrine.md`
- `patch-safety-rules.md`
- `self-development-rules.md`
- `roadmap.md`

New doctrine should add:

- [[Module Map]]
- [[Pipeline Map]]
- [[Command Language]]
- [[Vault Module]]
- [[Refactor Targets]]
- ADR notes under `decisions/`

## Current Architectural Problem

The system works, but some infrastructure is getting bloated.

Likely bloat areas:

- central command pipeline
- hardcoded parser branches
- tool registry growth
- file workflow follow-up logic
- execution/project workspace responsibilities

The next architectural move should be modularization, not more random features.

## Current Priority

Seed the vault with modular architecture doctrine, then begin extracting the file workflow into a proper module.

Recommended next module:

```txt
lib/modules/file-workflow/
```

## Current Rule

Do not add new large features until the module system is formalized.

Prefer:

- small targeted modules
- preserved current behavior
- no UI rewrites
- no broad pipeline rewrites
- validation after every patch
