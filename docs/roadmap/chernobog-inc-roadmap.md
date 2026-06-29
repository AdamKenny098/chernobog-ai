# Chernobog Inc Roadmap

## Vision

Chernobog Inc is the company-style internal architecture for Chernobog.

The user remains the CEO.

Chernobog remains the one visible assistant voice.

Internally, Chernobog gains:

```txt
Executive Core
Project Leads
Departments
Specialist Agents
Mission Control
Approval Gates
Audit Ledger
```

---

## Design Rule

Chernobog Inc should feel like one intelligence externally.

Internally it can be an organisation.

```txt
One identity.
Many specialists.
One source of truth.
One permission system.
One final voice.
```

---

## Current Starting Point

```txt
Released:
V5.6 — Vault Brain Foundation

Current:
V5.6.1 — Repo Reality Sync

Chernobog Inc implementation:
~18%
```

---

## Roadmap

### V5.6.1 — Repo Reality Sync

Purpose:

```txt
Make the repo truthful before adding more systems.
```

Deliverables:

```txt
docs/roadmap/current-state.md
docs/roadmap/versioning-policy.md
docs/architecture/active-vs-dormant-modules.md
docs/architecture/module-map.md
docs/roadmap/chernobog-inc-roadmap.md
scripts/verify-chernobog-v5-6-1.ts
```

Completion condition:

```txt
The repo clearly documents current state, active modules, dormant modules, and the path toward Chernobog Inc.
```

---

### V5.6.2 — Structured Vault Memory Hardening

Purpose:

```txt
Turn vault-brain from indexed-source search into stricter approved memory.
```

Deliverables:

```txt
VaultMemoryEntry
VaultMemorySource
VaultMemoryType
VaultMemoryStatus
VaultSourceRef
VaultMemoryCorrection
approved memory manifest
project/version metadata
```

Completion condition:

```txt
Every memory item can record source, type, status, project, version, tags, confidence, and correction history.
```

---

### V5.6.3 — Vault Brain Registry Integration

Purpose:

```txt
Make vault-brain a first-class active module in the central module registry.
```

Deliverables:

```txt
vaultBrainModule
registered memory/vault-brain domains
parser route for vault commands
module registry snapshot visibility
test commands
```

Completion condition:

```txt
Vault-brain commands flow through the same registered module path as file workflow, Discord ingest, and Obsidian vault.
```

---

### V5.6.4 — Approved Memory Review Flow

Purpose:

```txt
Prevent raw memory from becoming trusted memory automatically.
```

Deliverables:

```txt
raw -> candidate -> reviewed -> approved
reject / stale / superseded states
manual approval commands
candidate listing
source references
```

Completion condition:

```txt
Chernobog retrieves approved memory by default and treats raw/candidate memory as untrusted unless explicitly requested.
```

---

### V5.6.5 — Memory Context Packets

Purpose:

```txt
Give the reasoning model controlled context instead of raw vault chaos.
```

Deliverables:

```txt
MemoryContextPacket
retrieved entry excerpts
project scope
version scope
answer mode
missing info warnings
source refs
```

Completion condition:

```txt
The answer layer receives compact, filtered, explainable memory packets.
```

---

### V5.6.6 — Vault-Only / Vault-First Answer Modes

Purpose:

```txt
Make Chernobog honest about what it knows from its own vault.
```

Deliverables:

```txt
vault-only mode
vault-first mode
insufficient-memory response
answer source references
no silent outside-memory usage in vault-only mode
```

Completion condition:

```txt
Chernobog can answer project-state and roadmap questions from approved vault memory, or admit that the vault does not know.
```

---

### V5.7.1 — Permission Classes

Purpose:

```txt
Prepare safe autonomy.
```

Deliverables:

```txt
safe_auto
safe_with_notice
requires_approval
requires_explicit_confirmation
forbidden
```

Completion condition:

```txt
Every action can be classified by risk and permission level.
```

---

### V5.7.2 — Approval Gates

Purpose:

```txt
Make risky actions require user approval.
```

Deliverables:

```txt
approval request object
approval queue
approval result
pending action resume
```

Completion condition:

```txt
Chernobog can pause before risky actions and continue only after approval.
```

---

### V5.7.3 — Tool Audit Ledger

Purpose:

```txt
Make tool use inspectable.
```

Deliverables:

```txt
tool request log
permission decision log
execution result log
failure reason
rollback notes where possible
```

Completion condition:

```txt
You can inspect what Chernobog tried, why it tried it, and what happened.
```

---

### V5.8.1 — Mission State

Purpose:

```txt
Introduce mission-based work.
```

Deliverables:

```txt
MissionState
MissionStep
MissionStatus
MissionRisk
MissionStore
```

Completion condition:

```txt
Chernobog can create, show, update, pause, cancel, and complete missions.
```

---

### V5.8.2 — Mission Runner

Purpose:

```txt
Allow controlled multi-step execution.
```

Deliverables:

```txt
step runner
checkpoint handler
failure recovery
mission continuation
approval handoff
```

Completion condition:

```txt
Chernobog can progress through mission steps while respecting approval gates.
```

---

### V5.8.3 — Mission UI

Purpose:

```txt
Expose mission state in the command interface.
```

Deliverables:

```txt
MissionControlPanel
MissionTimeline
MissionApprovalCard
MissionRiskBadge
MissionReportList
```

Completion condition:

```txt
You can see active mission state, current step, pending approvals, and recent outputs.
```

---

## V6.0.x — Chernobog Inc

### V6.0.1 — Agent Registry

```txt
Define internal specialist roles and register read-only agents.
```

### V6.0.2 — Read-Only Departments

```txt
Add Vault, Planner, Architecture, QA, and Security departments in analysis-only mode.
```

### V6.0.3 — Report Merger

```txt
Merge department reports into one executive recommendation.
```

### V6.0.4 — Project Leads

```txt
Add project-specific leadership for Chernobog, Polar Night, SirioCraft, 098 Forge, and Omens Log.
```

### V6.0.5 — Tool Gateway

```txt
Require all agent tool access to pass through permissions and audit.
```

### V6.0.6 — Approval-Gated Execution

```txt
Allow departments to draft and execute approved work.
```

### V6.0.7 — Proactive Operations Queue

```txt
Surface unresolved work, stale memory, incomplete missions, and project next steps.
```

### V6.0.8 — Chernobog Inc UI

```txt
Expose Executive Core, Project Leads, Departments, Missions, Reports, Approvals, and Audit Ledger.
```

---

## First True Chernobog Inc Completion Condition

Chernobog Inc exists when Chernobog can:

```txt
- accept a CEO-level instruction
- create a mission
- assign specialist departments
- retrieve vault/project context
- receive structured reports
- merge reports into one executive brief
- request approval before risky actions
- draft or execute approved work
- persist mission state
- show audit trail
- resume later
```
