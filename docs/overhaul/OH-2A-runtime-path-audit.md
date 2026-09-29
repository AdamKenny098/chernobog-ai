# Chernobog OH-2A — Runtime Path Audit & Lock

Generated from accepted OH-1 checkpoint `36e1d27d7d56fa4fa144ebbac0cf51063791fd7c` on branch `oh-1-repository-decomposition`.

## Scope

This stage is an architectural audit only. It does not refactor runtime behavior. It locks the observed post-OH-1 command path, identifies competing ownership candidates, and records possible bypass/mutation paths for later OH-2 slices.

## Canonical audit anchor

Command ingress: `app/api/chat/route.ts`

Files statically reachable from canonical ingress: 615

Current turn coordinator evidence: `lib/chernobog/pipeline/runCommand.ts` (definition of `runCommandPipeline`).

The primary ownership candidates below prefer files on this canonical import graph. Global keyword matches are retained only as secondary review evidence.

### Unresolved internal imports on canonical graph

- `lib/modules/vault-brain/v6ReadinessReport.ts` -> `./${moduleName}`

## Authoritative command lifecycle baseline

```text
Ingress
  -> Dialogue
  -> Route
  -> Plan / Action
  -> Trust
  -> Tool
  -> Event
  -> State
  -> Response
```

## Ten ownership questions

| Question | Observed primary candidate | Static score | Evidence |
|---|---|---:|---|
| What receives a command? | `app/api/chat/route.ts` | 167 | `2` — import { runCommandPipeline } from "@chernobog/core/pipeline/runCommand";<br>`7` — export async function POST(req: Request) {<br>`24` — const result = await runCommandPipeline( |
| What owns the conversation turn? | `lib/chernobog/personality/profile.ts` | 55 | `14` — - Dryly humorous on occasion. Humor is sparse, understated, and situational; never turn every exchange into a joke.<br>`21` — - Familiarity must come from supplied conversation or memory. Never fabricate shared history, preferences, decisions, or project state.<br>`68` — - Leave conversational space. Do not monopolize the turn with information already visible on screen. |
| What routes it? | `lib/chernobog/router.ts` | 111 | `105` — Classify the user's message into exactly one route:<br>`181` — function roleForRoute(route: RouteName): ModelRole {<br>`182` — return route === "planner"<br>`231` — export async function respondForRoute(<br>`232` — route: RouteName,<br>`239` — content: ROUTE_PROMPTS[route], |
| What plans it? | `lib/chernobog/planner/coordinator.ts` | 93 | `33` — "Execute the first concrete task",<br>`40` — "Close the plan with a final verification",<br>`83` — const plan = createPlan(<br>`91` — session.activePlan = plan;<br>`94` — "Created a persistent active plan.",<br>`96` — formatPlan(plan), |
| What decides whether an action occurs? | `lib/chernobog/cognition/initiativeDecision.ts` | 96 | `96` — return "defer";<br>`108` — return "defer";<br>`126` — "Critical attention exceeds the interrupt threshold while the user is busy.",<br>`128` — return "interrupt";<br>`136` — return "defer";<br>`148` — "Critical attention exceeds the immediate interrupt threshold.", |
| What checks trust? | `packages/trust/src/governance/runtimeGovernance.ts` | 84 | `11` — } from "@chernobog/trust/governance/policyBridge";<br>`14` — } from "@chernobog/trust/governance/policyBridge";<br>`31` — executionRisk: task.risk,<br>`42` — executionRisk: step.risk,<br>`56` — if (decision.disposition === "deny") {<br>`69` — reason.code === "high-action-risk" \|\| |
| What executes the tool? | `packages/tools/src/toolGateway.ts` | 118 | `5` — executeTool,<br>`86` — "tool.invocation.routed",<br>`91` — "tool-gateway",<br>`113` — "tool",<br>`121` — await executeTool(<br>`135` — ? "tool.invocation.completed" |
| What emits the event? | `lib/chernobog/pipeline/contextSelection.ts` | 69 | `40` — /\b(world state\|11g\|event spine\|runtime state\|runtime status\|system state\|system status\|system health\|service health\|service status\|observed state\|observation packet\|model assignment\|model assignments)\b/i; |
| What changes authoritative state? | `lib/chernobog/pipeline/runCommand.ts` | 70 | `161` — /\b(assess\|assessment\|evaluate\|evaluation\|status\|state\|health\|healthy\|attention\|facts?\|inferences?\|predictions?\|unknowns?\|recommend(?:ed\|ation)?s?\|actions?)\b/i.test(<br>`166` — /\b(current\|active\|project\|workspace\|runtime\|world state\|evidence\|known\|scope\|scoped)\b/i.test(<br>`438` — ? "State the memory you want removed."<br>`453` — reply = "State the fact you want stored.";<br>`473` — ? "I do not have any persisted memories yet."<br>`475` — "Persisted memories:", |
| What constructs the final response? | `app/api/chat/route.ts` | 95 | `1` — import { NextResponse } from "next/server";<br>`18` — return NextResponse.json(<br>`35` — return NextResponse.json(<br>`43` — return NextResponse.json( |

## Observed lifecycle path

| Stage | Primary candidate | Reachable from ingress | Static score |
|---|---|---:|---:|
| ingress | `app/api/chat/route.ts` | 0 | 167 |
| dialogue | `lib/chernobog/personality/profile.ts` | 2 | 55 |
| routing | `lib/chernobog/router.ts` | 3 | 111 |
| planning | `lib/chernobog/planner/coordinator.ts` | 3 | 93 |
| actionSelection | `lib/chernobog/cognition/initiativeDecision.ts` | 5 | 96 |
| trust | `packages/trust/src/governance/runtimeGovernance.ts` | 5 | 84 |
| tool | `packages/tools/src/toolGateway.ts` | 5 | 118 |
| event | `lib/chernobog/pipeline/contextSelection.ts` | 3 | 69 |
| state | `lib/chernobog/pipeline/runCommand.ts` | 2 | 70 |
| response | `app/api/chat/route.ts` | 0 | 95 |

## Competing ownership / parallel-path candidates

### ingress

Primary: `app/api/chat/route.ts` (score 167; basis: canonical-ingress-import-graph)

No competing candidate crossed the audit threshold.

### dialogue

Primary: `lib/chernobog/personality/profile.ts` (score 55; basis: canonical-ingress-import-graph)

- `lib/chernobog/router.ts` — score 51, ingress depth 3
- `lib/chernobog/pipeline/runCommand.ts` — score 46, ingress depth 2
- `lib/modules/vault-brain/personalIntelligenceOperatingLoop.ts` — score 45, ingress depth 5
- `app/api/chat/route.ts` — score 42, ingress depth 0
- `lib/chernobog/pipeline/contextSelection.ts` — score 42, ingress depth 3
- `lib/chernobog/pipeline/followUpRouting.ts` — score 42, ingress depth 3
- `lib/chernobog/personality/index.ts` — score 38, ingress depth 1
- `lib/chernobog/project/activeProjectContext.ts` — score 38, ingress depth 3
- `packages/core/src/pipeline/runCommand.ts` — score 38, ingress depth 1

### routing

Primary: `lib/chernobog/router.ts` (score 111; basis: canonical-ingress-import-graph)

- `lib/chernobog/pipeline/runCommand.ts` — score 98, ingress depth 2

### planning

Primary: `lib/chernobog/planner/coordinator.ts` (score 93; basis: canonical-ingress-import-graph)

- `lib/chernobog/orchestration/intent.ts` — score 89, ingress depth 4
- `lib/chernobog/planner/parser.ts` — score 89, ingress depth 3
- `lib/chernobog/planner/state.ts` — score 85, ingress depth 4
- `lib/chernobog/orchestration/orchestrator.ts` — score 83, ingress depth 3
- `lib/modules/vault-brain/controlledExecutionPlanner.ts` — score 81, ingress depth 5
- `lib/chernobog/pipeline/runCommand.ts` — score 77, ingress depth 2
- `lib/chernobog/planner/types.ts` — score 72, ingress depth 4
- `lib/chernobog/orchestration/resolver.ts` — score 71, ingress depth 4

### actionSelection

Primary: `lib/chernobog/cognition/initiativeDecision.ts` (score 96; basis: canonical-ingress-import-graph)

- `lib/chernobog/cognition/initiativePolicy.ts` — score 89, ingress depth 5
- `lib/chernobog/cognition/initiativeQueue.ts` — score 84, ingress depth 5
- `lib/chernobog/cognition/initiativeTypes.ts` — score 84, ingress depth 5
- `lib/chernobog/cognition/initiativeMemory.ts` — score 77, ingress depth 5

### trust

Primary: `packages/trust/src/governance/runtimeGovernance.ts` (score 84; basis: canonical-ingress-import-graph)

- `packages/trust/src/governance/policyBridge.ts` — score 80, ingress depth 6
- `lib/chernobog/execution/approvalCommands.ts` — score 74, ingress depth 4
- `packages/trust/src/execution/approval.ts` — score 74, ingress depth 4
- `packages/trust/src/vault/trustDecision.ts` — score 72, ingress depth 5
- `packages/trust/src/vault/trustPolicyManifest.ts` — score 72, ingress depth 5
- `lib/chernobog/execution/runExecutionTask.ts` — score 66, ingress depth 4
- `packages/trust/src/execution/riskPolicy.ts` — score 66, ingress depth 4
- `packages/trust/src/vault/toolPermissionRegistry.ts` — score 64, ingress depth 5
- `packages/trust/src/trust/trace.ts` — score 62, ingress depth 3
- `packages/trust/src/vault/trustActionTypes.ts` — score 62, ingress depth 5
- `packages/trust/src/trust/store.ts` — score 58, ingress depth 4

### tool

Primary: `packages/tools/src/toolGateway.ts` (score 118; basis: canonical-ingress-import-graph)

No competing candidate crossed the audit threshold.

### event

Primary: `lib/chernobog/pipeline/contextSelection.ts` (score 69; basis: canonical-ingress-import-graph)

- `packages/events/src/publicContracts.ts` — score 65, ingress depth 6
- `lib/chernobog/worldModel/runtimeIntegration.ts` — score 61, ingress depth 5
- `packages/events/src/corruption.ts` — score 61, ingress depth 7
- `packages/events/src/index.ts` — score 58, ingress depth 5

### state

Primary: `lib/chernobog/pipeline/runCommand.ts` (score 70; basis: canonical-ingress-import-graph)

- `lib/chernobog/pipeline/worldStateContext.ts` — score 69, ingress depth 3
- `lib/chernobog/worldState/recovery.ts` — score 66, ingress depth 5
- `lib/chernobog/pipeline/contextSelection.ts` — score 61, ingress depth 3
- `lib/chernobog/worldState/httpQuery.ts` — score 61, ingress depth 5
- `lib/chernobog/worldState/queryService.ts` — score 61, ingress depth 5
- `lib/chernobog/worldState/snapshotStore.ts` — score 61, ingress depth 5
- `lib/chernobog/worldState/eventProjection.ts` — score 52, ingress depth 5
- `lib/chernobog/worldState/projectionEngine.ts` — score 52, ingress depth 5
- `lib/chernobog/router.ts` — score 51, ingress depth 3
- `lib/chernobog/personality/profile.ts` — score 50, ingress depth 2
- `lib/chernobog/pipeline/worldModelContext.ts` — score 49, ingress depth 3

### response

Primary: `app/api/chat/route.ts` (score 95; basis: canonical-ingress-import-graph)

No competing candidate crossed the audit threshold.

### readiness

Primary: `packages/models/src/runtimeReadiness.ts` (score 83; basis: canonical-ingress-import-graph)

- `lib/chernobog/runtime/runtimeHealthEvents.ts` — score 68, ingress depth 5
- `lib/modules/vault-brain/v6ReadinessCommands.ts` — score 67, ingress depth 5
- `lib/modules/vault-brain/v6ReadinessReport.ts` — score 67, ingress depth 5
- `lib/modules/vault-brain/v6ReadinessTypes.ts` — score 67, ingress depth 5
- `lib/chernobog/runtime/ollamaHealth.ts` — score 62, ingress depth 4

## Direct tool-execution review candidates

- `lib/chernobog/execution/toolExecutionHandlers.ts` — **governed-call-candidate**; imports governed gateway: yes; trust evidence: no
- `lib/chernobog/execution/toolGateway.ts` — **governed-call-candidate**; imports governed gateway: yes; trust evidence: no
- `lib/chernobog/orchestration/orchestrator.ts` — **governed-call-candidate**; imports governed gateway: yes; trust evidence: no
- `lib/chernobog/pipeline/toolExecution.ts` — **governed-call-candidate**; imports governed gateway: yes; trust evidence: no
- `lib/chernobog/tools/executor.ts` — **governed-call-candidate**; imports governed gateway: yes; trust evidence: no
- `lib/modules/file-workflow/index.ts` — **governed-call-candidate**; imports governed gateway: yes; trust evidence: no

These are review candidates only. A call is not a bypass if it still enters the public governed Tool Gateway path.

## Direct authoritative-state mutation review candidates

- `components/UmbraAIConsole.tsx` — inspect before OH-2E/OH-2H migration.

## Runtime lifecycle / readiness

Primary readiness/lifecycle candidate: `packages/models/src/runtimeReadiness.ts` (score 83).

Competing lifecycle candidates:
- `lib/chernobog/runtime/runtimeHealthEvents.ts` — score 68
- `lib/modules/vault-brain/v6ReadinessCommands.ts` — score 67
- `lib/modules/vault-brain/v6ReadinessReport.ts` — score 67
- `lib/modules/vault-brain/v6ReadinessTypes.ts` — score 67
- `lib/chernobog/runtime/ollamaHealth.ts` — score 62

## Accepted OH-1 package boundaries observed

- `runtime` -> `@chernobog/runtime`
- `core` -> `@chernobog/core`
- `events` -> `@chernobog/events`
- `tools` -> `@chernobog/tools`
- `trust` -> `@chernobog/trust`
- `models` -> `@chernobog/models`
- `vault` -> `@chernobog/vault`
- `personal-assistance` -> `@chernobog/personal-assistance`
- `observability` -> `@chernobog/observability`
- `external-projects` -> `@chernobog/external-projects`

## OH-2A lock

The JSON companion to this report is the machine-readable baseline for later OH-2 slices. Later migrations should update authority one responsibility at a time and must not claim convergence unless the superseded path is migrated, dependency-scanned, regression-tested, and safely removable.

## Deferred work

- Dialogue authority consolidation -> OH-2B
- Router consolidation -> OH-2C
- Planner/orchestrator consolidation -> OH-2D
- State Runtime authority -> OH-2E
- Action-selection consolidation -> OH-2F
- Trust -> Tool convergence -> OH-2G
- Event -> State convergence -> OH-2H
- Runtime lifecycle/readiness consolidation -> OH-2I
- Proven superseded runtime path removal -> OH-2J

No OH-3+ work is authorized by this audit.
