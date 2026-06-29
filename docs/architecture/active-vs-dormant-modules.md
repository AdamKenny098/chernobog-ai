# Active vs Dormant Modules

## Purpose

This document records the difference between modules that exist in the repository and modules that are currently active in the central module registry.

This matters because Chernobog has accumulated several strong feature modules, but not every feature folder is necessarily wired into the live command pipeline.

---

## Active Modules

As of V5.6.1 planning, the known active module registry should be checked against:

```txt
lib/modules/registry.ts
```

Expected currently active modules:

```txt
obsidianVaultModule
fileWorkflowModule
discordIngestModule
```

These are the modules directly visible in the central registered module array at the time of this sync package.

---

## Present Module Folders

The repository contains module folders such as:

```txt
lib/modules/adapters
lib/modules/content-ingest-ui
lib/modules/content-ingest
lib/modules/content-review
lib/modules/content-watch
lib/modules/discord-ingest
lib/modules/file-workflow
lib/modules/obsidian-vault
lib/modules/saved-content-reliability
lib/modules/saved-content
lib/modules/tiktok-archive-ingest
lib/modules/vault-brain
lib/modules/youtube-archive-ingest
lib/modules/youtube-ingest
lib/modules/youtube-oauth
```

---

## Classification

### Active Core Modules

```txt
discord-ingest
file-workflow
obsidian-vault / adapters
```

### Implemented or Prototype Capability Modules

```txt
vault-brain
content-ingest
content-review
content-watch
saved-content
saved-content-reliability
tiktok-archive-ingest
youtube-archive-ingest
youtube-ingest
youtube-oauth
```

### External/Side System

```txt
Game Radar
```

Game Radar has many package scripts and runtime support, but it should be treated as a capability surface rather than part of the Chernobog Inc core until explicitly folded into the company model.

---

## Rule

Do not assume a module is live because its folder exists.

A module becomes live when it has:

```txt
- a registered Chernobog module entry
- parser or command handling route
- command pipeline visibility
- test commands
- user-facing completion criteria
```

---

## Next Action

Before building V6 agent departments, the vault-brain module should become a first-class active system through the registry and command path.

That belongs to:

```txt
V5.6.3 — Vault Brain Registry Integration
```
