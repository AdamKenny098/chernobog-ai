# Chernobog Module Map

## Purpose

This document maps current repository systems to the future Chernobog Inc architecture.

---

## Current Core

```txt
lib/chernobog/pipeline
lib/chernobog/command-language
lib/chernobog/planner
lib/chernobog/memory-architecture
lib/chernobog/session
lib/chernobog/trust
lib/chernobog/tools
lib/modules
```

This is the foundation that allows Chernobog to act as a coherent single assistant.

---

## Current Feature Modules

```txt
discord-ingest
file-workflow
obsidian-vault
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

---

## Future Chernobog Inc Mapping

### Executive Core

Future location:

```txt
lib/chernobog/executive
```

Responsibilities:

```txt
- receive user objective
- decide whether mission mode is needed
- assign agents/departments
- merge reports
- enforce final response voice
```

---

### Mission System

Future location:

```txt
lib/chernobog/missions
```

Responsibilities:

```txt
- create mission
- persist mission state
- run mission steps
- pause/resume/cancel missions
- checkpoint before risky execution
```

---

### Agent Registry

Future location:

```txt
lib/chernobog/agents
```

Responsibilities:

```txt
- define agent roles
- register agents
- run read-only specialist analysis
- return structured AgentReport objects
```

---

### Project Leads

Future location:

```txt
lib/chernobog/projects
```

Responsibilities:

```txt
- hold project profile
- know current version/milestone
- route project-specific work
- maintain current-state summary
```

---

### Departments

Future location:

```txt
lib/chernobog/departments
```

Initial departments:

```txt
vault-memory
planning
architecture
coding
qa
security
research
design
narrative
operations
```

---

### Tool Gateway

Future location:

```txt
lib/chernobog/tool-gateway
```

Responsibilities:

```txt
- receive requested tool action
- classify risk
- check permissions
- request approval when needed
- execute approved actions
- log audit event
```

---

## Inc Architecture Rule

The future company model must not bypass the existing command/trust/tool systems.

Correct:

```txt
Agent -> Tool Gateway -> Permission Policy -> Tool Execution -> Audit Log
```

Incorrect:

```txt
Agent -> filesystem directly
```

---

## Current-to-Future Bridge

The next useful bridge is:

```txt
vault-brain -> approved memory -> memory context packets -> mission planning -> agent reports
```

That means the vault brain must be hardened before departments become powerful.
