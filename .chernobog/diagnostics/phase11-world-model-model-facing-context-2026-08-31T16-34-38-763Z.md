# Chernobog Phase 11 - Model-Facing World Model Context Diagnostic

Generated: 2026-08-31T16:34:38.763Z

## Runtime context summary

- status: available
- entityCount: 39
- relationshipCount: 25
- predictionCount: 31
- causalHypothesisCount: 0
- systemTextCharacters: 26910
- systemTextLines: 442
- dependencyEdgeLines: 7
- dependencyChainLines: 5
- requiresModelMentions: 25
- servedByMentions: 18
- relationalSubstantiveMarkers: 2
- noSupportedPredictionMarkers: 3
- ollamaImpactMarkers: 1

## Automated acceptance interpretation

- PASS: dependency edges are present in runtime model-facing context.
- PASS: served-by evidence reaches the runtime model-facing context.
- PASS: at least one complete model -> Ollama dependency chain is present.
- PASS: substantive relational status reaches the model-facing context.
- PASS: zero-supported-prediction contract reaches the model-facing context.


## Critical runtime World Model lines

```text
- RELATIONAL_STATUS: substantive
- explicit dependency relationships exposed: 6
- SUPPORTED_PREDICTION_STATUS: none
- Explicit dependency relationships are selected before low-information state attachments so dependency chains remain intact in the bounded packet.
- Use explicit dependency relationships for consequence reasoning. A has-state relationship alone is not a dependency path.
- PREDICTION CONTRACT: when supported predictions exposed=0, say exactly 'No supported predictions.' Do not invent a placeholder prediction, confidence, sample count, or candidate.
- RELATIONAL EVIDENCE CONTRACT: when explicit dependency relationships exposed>0, do not output the no-substantive-relational-evidence sentinel.
- DEPENDENCY BACKBONE CONTRACT: the compact dependency backbone below is the highest-priority 11J relationship evidence. Preserve every listed requires-model and served-by edge.
- CHAIN CONTRACT: when a DEPENDENCY_CHAIN includes --served-by--> model:ollama, do not claim that the Ollama relationship is missing.
- CONCLUSION CONTRACT: RELATIONAL_STATUS=substantive means the World Model is providing substantive relational evidence. The fallback sentence is forbidden.
WORLD MODEL CRITICAL DEPENDENCY BACKBONE (highest-priority canonical 11J evidence):
RELATIONAL_STATUS=substantive
SUPPORTED_PREDICTION_STATUS=none
DEPENDENCY_EDGE_COUNT=6
DEPENDENCY_CHAIN_COUNT=4
DEPENDENCY_EDGE from=model-role:repair type=requires-model to=model:deepseek-coder-v2:16b freshness=aging confidence=1.00 evidence=worldStateKeys=model.role.repair.assignment; eventIds=0ed40eca-bb94-4d48-aad6-24da13ee4ad4
DEPENDENCY_EDGE from=model:deepseek-coder-v2:16b type=served-by to=model:ollama freshness=aging confidence=1.00 evidence=worldStateKeys=model.role.repair.assignment; eventIds=0ed40eca-bb94-4d48-aad6-24da13ee4ad4
DEPENDENCY_EDGE from=model-role:planner type=requires-model to=model:deepseek-coder-v2:16b freshness=aging confidence=1.00 evidence=worldStateKeys=model.role.planner.assignment; eventIds=9961fb67-0dcd-463f-8a2e-6a2c670683ce
DEPENDENCY_EDGE from=model-role:code type=requires-model to=model:deepseek-coder-v2:16b freshness=aging confidence=1.00 evidence=worldStateKeys=model.role.code.assignment; eventIds=14085e0b-e2df-456f-a32c-f08760b49fdf
DEPENDENCY_EDGE from=model-role:default type=requires-model to=model:gemma3:latest freshness=aging confidence=1.00 evidence=worldStateKeys=model.role.default.assignment; eventIds=968e2f02-ad1f-4aa5-877f-38394da9e73a
DEPENDENCY_EDGE from=model:gemma3:latest type=served-by to=model:ollama freshness=aging confidence=1.00 evidence=worldStateKeys=model.role.default.assignment; eventIds=968e2f02-ad1f-4aa5-877f-38394da9e73a
DEPENDENCY_CHAIN model-role:repair --requires-model--> model:deepseek-coder-v2:16b --served-by--> model:ollama [requiresEvidence=worldStateKeys=model.role.repair.assignment; eventIds=0ed40eca-bb94-4d48-aad6-24da13ee4ad4; servedByEvidence=worldStateKeys=model.role.repair.assignment; eventIds=0ed40eca-bb94-4d48-aad6-24da13ee4ad4]
DEPENDENCY_CHAIN model-role:planner --requires-model--> model:deepseek-coder-v2:16b --served-by--> model:ollama [requiresEvidence=worldStateKeys=model.role.planner.assignment; eventIds=9961fb67-0dcd-463f-8a2e-6a2c670683ce; servedByEvidence=worldStateKeys=model.role.repair.assignment; eventIds=0ed40eca-bb94-4d48-aad6-24da13ee4ad4]
DEPENDENCY_CHAIN model-role:code --requires-model--> model:deepseek-coder-v2:16b --served-by--> model:ollama [requiresEvidence=worldStateKeys=model.role.code.assignment; eventIds=14085e0b-e2df-456f-a32c-f08760b49fdf; servedByEvidence=worldStateKeys=model.role.repair.assignment; eventIds=0ed40eca-bb94-4d48-aad6-24da13ee4ad4]
DEPENDENCY_CHAIN model-role:default --requires-model--> model:gemma3:latest --served-by--> model:ollama [requiresEvidence=worldStateKeys=model.role.default.assignment; eventIds=968e2f02-ad1f-4aa5-877f-38394da9e73a; servedByEvidence=worldStateKeys=model.role.default.assignment; eventIds=968e2f02-ad1f-4aa5-877f-38394da9e73a]
WORLD MODEL CRITICAL IMPACT BACKBONE (precomputed by canonical 11J impact engine):
- impactSource: model:deepseek-coder-v2:16b
  directlyDependentEntities: model-role:code,model-role:planner,model-role:repair
  transitivelyDependentEntities: none
  dependencyPaths: model-role:code->model:deepseek-coder-v2:16b depth=1 relationships=relation:requires-model:model-role:code->model:deepseek-coder-v2:16b | model-role:planner->model:deepseek-coder-v2:16b depth=1 relationships=relation:requires-model:model-role:planner->model:deepseek-coder-v2:16b | model-role:repair->model:deepseek-coder-v2:16b depth=1 relationships=relation:requires-model:model-role:repair->model:deepseek-coder-v2:16b
- impactSource: model:gemma3:latest
  directlyDependentEntities: model-role:default
  transitivelyDependentEntities: none
  dependencyPaths: model-role:default->model:gemma3:latest depth=1 relationships=relation:requires-model:model-role:default->model:gemma3:latest
- impactSource: model:ollama
  directlyDependentEntities: model:deepseek-coder-v2:16b,model:gemma3:latest
  transitivelyDependentEntities: model-role:code,model-role:default,model-role:planner,model-role:repair
  dependencyPaths: model:deepseek-coder-v2:16b->model:ollama depth=1 relationships=relation:served-by:model:deepseek-coder-v2:16b->model:ollama | model:gemma3:latest->model:ollama depth=1 relationships=relation:served-by:model:gemma3:latest->model:ollama | model-role:code->model:ollama depth=2 relationships=relation:requires-model:model-role:code->model:deepseek-coder-v2:16b>relation:served-by:model:deepseek-coder-v2:16b->model:ollama | model-role:default->model:ollama depth=2 relationships=relation:requires-model:model-role:default->model:gemma3:latest>relation:served-by:model:gemma3:latest->model:ollama | model-role:planner->model:ollama depth=2 relationships=relation:requires-model:model-role:planner->model:deepseek-coder-v2:16b>relation:served-by:model:deepseek-coder-v2:16b->model:ollama | model-role:repair->model:ollama depth=2 relationships=relation:requires-model:model-role:repair->model:deepseek-coder-v2:16b>relation:served-by:model:deepseek-coder-v2:16b->model:ollama
WORLD MODEL CRITICAL PREDICTION STATUS:
- No supported predictions.
World Model explicit dependency relationships:
- relationship: relation:requires-model:model-role:repair->model:deepseek-coder-v2:16b
  type: requires-model
- relationship: relation:served-by:model:deepseek-coder-v2:16b->model:ollama
  type: served-by
- relationship: relation:requires-model:model-role:planner->model:deepseek-coder-v2:16b
  type: requires-model
- relationship: relation:requires-model:model-role:code->model:deepseek-coder-v2:16b
  type: requires-model
- relationship: relation:requires-model:model-role:default->model:gemma3:latest
  type: requires-model
- relationship: relation:served-by:model:gemma3:latest->model:ollama
  type: served-by
- See WORLD MODEL CRITICAL IMPACT BACKBONE above; it is authoritative for consequence reasoning.
- No supported predictions.
```

## runCommand.ts World Model composition excerpts

### runCommand.ts line 52

```text
   44: import {
   45:   addTraceStep,
   46:   createTrustTrace,
   47:   setTraceRoute,
   48:   setTraceTool,
   49: } from "@/lib/chernobog/trust/trace";
   50: 
   51: import { buildChernobogWorldStateContext } from "@/lib/chernobog/pipeline/worldStateContext";
>  52: import { buildChernobogWorldModelContext } from "@/lib/chernobog/pipeline/worldModelContext";
   53: import { buildWorkflowSnapshot } from "@/lib/chernobog/trust/sessionSnapshot";
   54: import {
   55:   buildContinuityReply,
   56:   detectContinuityQuery,
   57: } from "@/lib/chernobog/session/continuity";
   58: 
   59: import { parsePlannerCommand } from "@/lib/chernobog/planner/parser";
   60: import { runPlannerCommand } from "@/lib/chernobog/planner/coordinator";
   61: import { buildUnifiedMemoryContext } from "@/lib/chernobog/memory-architecture";
   62: import {
   63:   buildProjectGroundedSystemText,
   64:   resolveActiveProjectContext,
   65: } from "@/lib/chernobog/project/activeProjectContext";
```

### runCommand.ts line 1076

```text
 1068: 
 1069:             const worldStateContext =
 1070:               await buildChernobogWorldStateContext({
 1071:                 projectId:
 1072:                   activeSession.activeProjectId ??
 1073:                   undefined,
 1074:               });
 1075: 
>1076:             const worldModelContext =
 1077:               await buildChernobogWorldModelContext();
 1078: 
 1079:             const authoritativeAssessment =
 1080:               shouldUseAuthoritativeAssessmentContext(
 1081:                 userMessage,
 1082:                 activeSession.activeProjectId
 1083:               );
 1084: 
 1085:             const modelRecentMessages =
 1086:               authoritativeAssessment
 1087:                 ? recentMessages.filter(
 1088:                     (message) =>
 1089:                       message.role !== "assistant"
```

### runCommand.ts line 1121

```text
 1113:             reply = await respondForRoute(route, userMessage, {
 1114:               memories: storedMemories,
 1115:               recentMessages: modelRecentMessages,
 1116:               sessionSummary: buildProjectGroundedSystemText(
 1117:       [
 1118:                   [memoryContext.systemText, worldStateContext.systemText]
 1119:                     .filter(Boolean)
 1120:                     .join("\n\n"),
>1121:                   worldModelContext.systemText,
 1122:                 ]
 1123:                   .filter(Boolean)
 1124:                   .join("\n\n"),
 1125:       activeSession.activeProjectId,
 1126:     ),
 1127:             });
 1128: 
 1129:             updateSessionAfterRoute(activeSession, route);
 1130:             saveSessionContext(activeSession);
 1131:           }
 1132:         }
 1133:       }
 1134:     
```


## Full runtime model-facing World Model systemText

```text
Canonical World Model (11J, derived/read-only evidence):
- generatedAt: 2026-08-31T16:34:38.733Z
- entities: 39
- relationships: 25
- predictions stored: 31
- supported predictions exposed: 0
- insufficient predictions stored: 31
- RELATIONAL_STATUS: substantive
- explicit dependency relationships exposed: 6
- complete dependency chains exposed: 4
- explicit has-role relationships exposed: 4
- impact assessments exposed: 3
- SUPPORTED_PREDICTION_STATUS: none
- causal hypotheses: 0
- unsupported/stale predictions suppressed from current evidence: 31
- Source of truth remains 11G World State. World Model entities and relationships are derived representations, not permissions or executable actions.
- sourceFreshness is derived from the canonical 11G evidence keys supporting each 11J item.
- fresh evidence may support current-state claims; aging evidence must be qualified; mixed evidence spans current and historical support.
- stale and unknown evidence is historical/uncertain only. Never describe its state value as current, pending now, waiting now, failed now, or completed now.
- Predictions and causal hypotheses are not facts. Preserve their status, confidence, samples, and evidence when reasoning.
- Predictions with status=insufficient, confidence=0, or stale-only support are not presented as supported predictions.
- Only relationships explicitly listed below may be attributed to the World Model. Plausible but absent relationships must be labelled as inference.
- Explicit dependency relationships are selected before low-information state attachments so dependency chains remain intact in the bounded packet.
- Use explicit dependency relationships for consequence reasoning. A has-state relationship alone is not a dependency path.
- If at least one explicit dependency relationship is listed, substantive relational evidence is present. Do not state that the World Model lacks substantive relational evidence.
- DEPENDENCY CONTRACT: only relationships in the explicit dependency relationship section are dependencies. Never classify has-state as a dependency.
- PREDICTION CONTRACT: when supported predictions exposed=0, say exactly 'No supported predictions.' Do not invent a placeholder prediction, confidence, sample count, or candidate.
- CONSEQUENCE CONTRACT: prefer the precomputed World Model impact assessments below. Do not replace a non-empty impact assessment with 'no dependency path'.
- RELATIONAL EVIDENCE CONTRACT: when explicit dependency relationships exposed>0, do not output the no-substantive-relational-evidence sentinel.
- DEPENDENCY BACKBONE CONTRACT: the compact dependency backbone below is the highest-priority 11J relationship evidence. Preserve every listed requires-model and served-by edge.
- CHAIN CONTRACT: when a DEPENDENCY_CHAIN includes --served-by--> model:ollama, do not claim that the Ollama relationship is missing.
- IMPACT CONTRACT: when an impact assessment for model:ollama is non-empty, report those downstream dependents instead of saying no dependency path exists.
- CONCLUSION CONTRACT: RELATIONAL_STATUS=substantive means the World Model is providing substantive relational evidence. The fallback sentence is forbidden.
- MISSING-MODEL CONTRACT: do not list an explicit edge, entity, provider relationship, or dependency chain as missing when it appears in the dependency backbone.

WORLD MODEL CRITICAL DEPENDENCY BACKBONE (highest-priority canonical 11J evidence):
RELATIONAL_STATUS=substantive
SUPPORTED_PREDICTION_STATUS=none
DEPENDENCY_EDGE_COUNT=6
DEPENDENCY_CHAIN_COUNT=4
DEPENDENCY_EDGE from=model-role:repair type=requires-model to=model:deepseek-coder-v2:16b freshness=aging confidence=1.00 evidence=worldStateKeys=model.role.repair.assignment; eventIds=0ed40eca-bb94-4d48-aad6-24da13ee4ad4
DEPENDENCY_EDGE from=model:deepseek-coder-v2:16b type=served-by to=model:ollama freshness=aging confidence=1.00 evidence=worldStateKeys=model.role.repair.assignment; eventIds=0ed40eca-bb94-4d48-aad6-24da13ee4ad4
DEPENDENCY_EDGE from=model-role:planner type=requires-model to=model:deepseek-coder-v2:16b freshness=aging confidence=1.00 evidence=worldStateKeys=model.role.planner.assignment; eventIds=9961fb67-0dcd-463f-8a2e-6a2c670683ce
DEPENDENCY_EDGE from=model-role:code type=requires-model to=model:deepseek-coder-v2:16b freshness=aging confidence=1.00 evidence=worldStateKeys=model.role.code.assignment; eventIds=14085e0b-e2df-456f-a32c-f08760b49fdf
DEPENDENCY_EDGE from=model-role:default type=requires-model to=model:gemma3:latest freshness=aging confidence=1.00 evidence=worldStateKeys=model.role.default.assignment; eventIds=968e2f02-ad1f-4aa5-877f-38394da9e73a
DEPENDENCY_EDGE from=model:gemma3:latest type=served-by to=model:ollama freshness=aging confidence=1.00 evidence=worldStateKeys=model.role.default.assignment; eventIds=968e2f02-ad1f-4aa5-877f-38394da9e73a
DEPENDENCY_CHAIN model-role:repair --requires-model--> model:deepseek-coder-v2:16b --served-by--> model:ollama [requiresEvidence=worldStateKeys=model.role.repair.assignment; eventIds=0ed40eca-bb94-4d48-aad6-24da13ee4ad4; servedByEvidence=worldStateKeys=model.role.repair.assignment; eventIds=0ed40eca-bb94-4d48-aad6-24da13ee4ad4]
DEPENDENCY_CHAIN model-role:planner --requires-model--> model:deepseek-coder-v2:16b --served-by--> model:ollama [requiresEvidence=worldStateKeys=model.role.planner.assignment; eventIds=9961fb67-0dcd-463f-8a2e-6a2c670683ce; servedByEvidence=worldStateKeys=model.role.repair.assignment; eventIds=0ed40eca-bb94-4d48-aad6-24da13ee4ad4]
DEPENDENCY_CHAIN model-role:code --requires-model--> model:deepseek-coder-v2:16b --served-by--> model:ollama [requiresEvidence=worldStateKeys=model.role.code.assignment; eventIds=14085e0b-e2df-456f-a32c-f08760b49fdf; servedByEvidence=worldStateKeys=model.role.repair.assignment; eventIds=0ed40eca-bb94-4d48-aad6-24da13ee4ad4]
DEPENDENCY_CHAIN model-role:default --requires-model--> model:gemma3:latest --served-by--> model:ollama [requiresEvidence=worldStateKeys=model.role.default.assignment; eventIds=968e2f02-ad1f-4aa5-877f-38394da9e73a; servedByEvidence=worldStateKeys=model.role.default.assignment; eventIds=968e2f02-ad1f-4aa5-877f-38394da9e73a]

WORLD MODEL CRITICAL IMPACT BACKBONE (precomputed by canonical 11J impact engine):
- impactSource: model:deepseek-coder-v2:16b
  directlyDependentEntities: model-role:code,model-role:planner,model-role:repair
  transitivelyDependentEntities: none
  dependencyPaths: model-role:code->model:deepseek-coder-v2:16b depth=1 relationships=relation:requires-model:model-role:code->model:deepseek-coder-v2:16b | model-role:planner->model:deepseek-coder-v2:16b depth=1 relationships=relation:requires-model:model-role:planner->model:deepseek-coder-v2:16b | model-role:repair->model:deepseek-coder-v2:16b depth=1 relationships=relation:requires-model:model-role:repair->model:deepseek-coder-v2:16b
- impactSource: model:gemma3:latest
  directlyDependentEntities: model-role:default
  transitivelyDependentEntities: none
  dependencyPaths: model-role:default->model:gemma3:latest depth=1 relationships=relation:requires-model:model-role:default->model:gemma3:latest
- impactSource: model:ollama
  directlyDependentEntities: model:deepseek-coder-v2:16b,model:gemma3:latest
  transitivelyDependentEntities: model-role:code,model-role:default,model-role:planner,model-role:repair
  dependencyPaths: model:deepseek-coder-v2:16b->model:ollama depth=1 relationships=relation:served-by:model:deepseek-coder-v2:16b->model:ollama | model:gemma3:latest->model:ollama depth=1 relationships=relation:served-by:model:gemma3:latest->model:ollama | model-role:code->model:ollama depth=2 relationships=relation:requires-model:model-role:code->model:deepseek-coder-v2:16b>relation:served-by:model:deepseek-coder-v2:16b->model:ollama | model-role:default->model:ollama depth=2 relationships=relation:requires-model:model-role:default->model:gemma3:latest>relation:served-by:model:gemma3:latest->model:ollama | model-role:planner->model:ollama depth=2 relationships=relation:requires-model:model-role:planner->model:deepseek-coder-v2:16b>relation:served-by:model:deepseek-coder-v2:16b->model:ollama | model-role:repair->model:ollama depth=2 relationships=relation:requires-model:model-role:repair->model:deepseek-coder-v2:16b>relation:served-by:model:deepseek-coder-v2:16b->model:ollama

WORLD MODEL CRITICAL PREDICTION STATUS:
- No supported predictions.
- stored predictions: 31
- insufficient predictions: 31

World Model entities (current evidence first; historical tail explicitly labelled):
- entity: model-role:repair
  kind: model
  label: repair role
  observedAt: 2026-08-31T16:29:42.664Z
  sourceFreshness: aging
  confidence: 1.00
  attributes: {}
  evidence: worldStateKeys=model.role.repair.assignment; eventIds=0ed40eca-bb94-4d48-aad6-24da13ee4ad4
- entity: model:deepseek-coder-v2:16b
  kind: model
  label: deepseek-coder-v2:16b
  observedAt: 2026-08-31T16:29:42.664Z
  sourceFreshness: aging
  confidence: 1.00
  attributes: {}
  evidence: worldStateKeys=model.role.repair.assignment; eventIds=0ed40eca-bb94-4d48-aad6-24da13ee4ad4
- entity: model:ollama
  kind: model
  label: ollama
  observedAt: 2026-08-31T16:29:42.628Z
  sourceFreshness: aging
  confidence: 1.00
  attributes: {}
  evidence: worldStateKeys=model.ollama.observation; eventIds=542305a5-3d7f-47b6-849e-8444108df783
- entity: model-role:planner
  kind: model
  label: planner role
  observedAt: 2026-08-31T16:29:42.654Z
  sourceFreshness: aging
  confidence: 1.00
  attributes: {}
  evidence: worldStateKeys=model.role.planner.assignment; eventIds=9961fb67-0dcd-463f-8a2e-6a2c670683ce
- entity: model-role:code
  kind: model
  label: code role
  observedAt: 2026-08-31T16:29:42.646Z
  sourceFreshness: aging
  confidence: 1.00
  attributes: {}
  evidence: worldStateKeys=model.role.code.assignment; eventIds=14085e0b-e2df-456f-a32c-f08760b49fdf
- entity: model-role:default
  kind: model
  label: default role
  observedAt: 2026-08-31T16:29:42.636Z
  sourceFreshness: aging
  confidence: 1.00
  attributes: {}
  evidence: worldStateKeys=model.role.default.assignment; eventIds=968e2f02-ad1f-4aa5-877f-38394da9e73a
- entity: model:gemma3:latest
  kind: model
  label: gemma3:latest
  observedAt: 2026-08-31T16:29:42.636Z
  sourceFreshness: aging
  confidence: 1.00
  attributes: {}
  evidence: worldStateKeys=model.role.default.assignment; eventIds=968e2f02-ad1f-4aa5-877f-38394da9e73a
- entity: model:role
  kind: model
  label: role
  observedAt: 2026-08-31T16:29:42.664Z
  sourceFreshness: aging
  confidence: 1.00
  attributes: {}
  evidence: worldStateKeys=model.role.repair.available; eventIds=0ed40eca-bb94-4d48-aad6-24da13ee4ad4
- entity: world-state:model.role.repair.assignment
  kind: model
  label: model.role.repair.assignment
  observedAt: 2026-08-31T16:29:42.664Z
  sourceFreshness: aging
  confidence: 1.00
  attributes: {"value":{"providerId":"ollama","role":"repair","configuredModel":"deepseek-coder-v2:16b","source":"env","available":true,"matchedInstalledModel":"deepseek-coder-v2:16b"},"freshness":{"status":"aging","basis":"ttl","expiresAt":"2026-08-31T16:34:42.664Z","ttlMs":300000,"evaluatedAt":"2026-08-31T16:34:38.722Z"}}
  evidence: worldStateKeys=model.role.repair.assignment; eventIds=0ed40eca-bb94-4d48-aad6-24da13ee4ad4
- entity: world-state:model.role.repair.available
  kind: model
  label: model.role.repair.available
  observedAt: 2026-08-31T16:29:42.664Z
  sourceFreshness: aging
  confidence: 1.00
  attributes: {"value":true,"freshness":{"status":"aging","basis":"ttl","expiresAt":"2026-08-31T16:34:42.664Z","ttlMs":300000,"evaluatedAt":"2026-08-31T16:34:38.722Z"}}
  evidence: worldStateKeys=model.role.repair.available; eventIds=0ed40eca-bb94-4d48-aad6-24da13ee4ad4
- entity: world-state:model.role.planner.assignment
  kind: model
  label: model.role.planner.assignment
  observedAt: 2026-08-31T16:29:42.654Z
  sourceFreshness: aging
  confidence: 1.00
  attributes: {"value":{"providerId":"ollama","role":"planner","configuredModel":"deepseek-coder-v2:16b","source":"env","available":true,"matchedInstalledModel":"deepseek-coder-v2:16b"},"freshness":{"status":"aging","basis":"ttl","expiresAt":"2026-08-31T16:34:42.654Z","ttlMs":300000,"evaluatedAt":"2026-08-31T16:34:38.722Z"}}
  evidence: worldStateKeys=model.role.planner.assignment; eventIds=9961fb67-0dcd-463f-8a2e-6a2c670683ce
- entity: world-state:model.role.planner.available
  kind: model
  label: model.role.planner.available
  observedAt: 2026-08-31T16:29:42.654Z
  sourceFreshness: aging
  confidence: 1.00
  attributes: {"value":true,"freshness":{"status":"aging","basis":"ttl","expiresAt":"2026-08-31T16:34:42.654Z","ttlMs":300000,"evaluatedAt":"2026-08-31T16:34:38.722Z"}}
  evidence: worldStateKeys=model.role.planner.available; eventIds=9961fb67-0dcd-463f-8a2e-6a2c670683ce
- entity: world-state:model.role.code.assignment
  kind: model
  label: model.role.code.assignment
  observedAt: 2026-08-31T16:29:42.646Z
  sourceFreshness: aging
  confidence: 1.00
  attributes: {"value":{"providerId":"ollama","role":"code","configuredModel":"deepseek-coder-v2:16b","source":"env","available":true,"matchedInstalledModel":"deepseek-coder-v2:16b"},"freshness":{"status":"aging","basis":"ttl","expiresAt":"2026-08-31T16:34:42.646Z","ttlMs":300000,"evaluatedAt":"2026-08-31T16:34:38.722Z"}}
  evidence: worldStateKeys=model.role.code.assignment; eventIds=14085e0b-e2df-456f-a32c-f08760b49fdf
- entity: world-state:model.role.code.available
  kind: model
  label: model.role.code.available
  observedAt: 2026-08-31T16:29:42.646Z
  sourceFreshness: aging
  confidence: 1.00
  attributes: {"value":true,"freshness":{"status":"aging","basis":"ttl","expiresAt":"2026-08-31T16:34:42.646Z","ttlMs":300000,"evaluatedAt":"2026-08-31T16:34:38.722Z"}}
  evidence: worldStateKeys=model.role.code.available; eventIds=14085e0b-e2df-456f-a32c-f08760b49fdf
- entity: world-state:model.role.default.assignment
  kind: model
  label: model.role.default.assignment
  observedAt: 2026-08-31T16:29:42.636Z
  sourceFreshness: aging
  confidence: 1.00
  attributes: {"value":{"providerId":"ollama","role":"default","configuredModel":"gemma3","source":"env","available":true,"matchedInstalledModel":"gemma3:latest"},"freshness":{"status":"aging","basis":"ttl","expiresAt":"2026-08-31T16:34:42.636Z","ttlMs":300000,"evaluatedAt":"2026-08-31T16:34:38.722Z"}}
  evidence: worldStateKeys=model.role.default.assignment; eventIds=968e2f02-ad1f-4aa5-877f-38394da9e73a
- entity: world-state:model.role.default.available
  kind: model
  label: model.role.default.available
  observedAt: 2026-08-31T16:29:42.636Z
  sourceFreshness: aging
  confidence: 1.00
  attributes: {"value":true,"freshness":{"status":"aging","basis":"ttl","expiresAt":"2026-08-31T16:34:42.636Z","ttlMs":300000,"evaluatedAt":"2026-08-31T16:34:38.722Z"}}
  evidence: worldStateKeys=model.role.default.available; eventIds=968e2f02-ad1f-4aa5-877f-38394da9e73a
- entity: world-state:model.ollama.available
  kind: model
  label: model.ollama.available
  observedAt: 2026-08-31T16:29:42.628Z
  sourceFreshness: aging
  confidence: 1.00
  attributes: {"value":true,"freshness":{"status":"aging","basis":"ttl","expiresAt":"2026-08-31T16:34:42.628Z","ttlMs":300000,"evaluatedAt":"2026-08-31T16:34:38.722Z"}}
  evidence: worldStateKeys=model.ollama.available; eventIds=542305a5-3d7f-47b6-849e-8444108df783
- entity: world-state:model.ollama.observation
  kind: model
  label: model.ollama.observation
  observedAt: 2026-08-31T16:29:42.628Z
  sourceFreshness: aging
  confidence: 1.00
  attributes: {"value":{"id":"ollama","kind":"model-provider","status":"healthy","nodeId":null,"platform":"win32","latencyMs":6,"capabilities":["generate","model-discovery"],"observedAt":"2026-08-31T16:29:42.617Z"},"freshness":{"status":"aging","basis":"ttl","expiresAt":"2026-08-31T16:34:42.628Z","ttlMs":300000,"evaluatedAt":"2026-08-31T16:34:38.722Z"}}
  evidence: worldStateKeys=model.ollama.observation; eventIds=542305a5-3d7f-47b6-849e-8444108df783
- entity: world-state:model.ollama.health
  kind: model
  label: model.ollama.health
  observedAt: 2026-08-31T16:29:42.617Z
  sourceFreshness: aging
  confidence: 1.00
  attributes: {"value":"healthy","freshness":{"status":"aging","basis":"ttl","expiresAt":"2026-08-31T16:34:42.617Z","ttlMs":300000,"evaluatedAt":"2026-08-31T16:34:38.722Z"}}
  evidence: worldStateKeys=model.ollama.health; eventIds=ef0ab106-b7bf-495a-999d-781837e4b4e8
- entity: world-state:execution.11d-c-task-3.failed
  kind: fact
  label: execution.11d-c-task-3.failed
  observedAt: 2026-08-28T13:06:54.825Z
  sourceFreshness: stale
  confidence: 1.00
  attributes: {"value":{"eventType":"execution.failed","severity":"warning","subject":"11d-c-task-3","scope":"execution:system_operation","payload":{"taskId":"11d-c-task-3","category":"system_operation","risk":"safe","status":"failed","stepCount":1,"currentStepId":"step-1","error":"Cognitive governance denies this action capability."}},"freshness":{"status":"stale","basis":"ttl","expiresAt":"2026-08-28T13:11:54.825Z","ttlMs":300000,"evaluatedAt":"2026-08-31T16:34:38.722Z"}}
  evidence: worldStateKeys=execution.11d-c-task-3.failed; eventIds=1024437e-7f3a-4271-b97a-f5edfc6a2386
- entity: world-state:execution.11d-c-task-3.started
  kind: fact
  label: execution.11d-c-task-3.started
  observedAt: 2026-08-28T13:06:54.823Z
  sourceFreshness: stale
  confidence: 1.00
  attributes: {"value":{"eventType":"execution.started","severity":"info","subject":"11d-c-task-3","scope":"execution:system_operation","payload":{"taskId":"11d-c-task-3","category":"system_operation","risk":"safe","status":"pending","stepCount":1,"currentStepId":"step-1"}},"freshness":{"status":"stale","basis":"ttl","expiresAt":"2026-08-28T13:11:54.823Z","ttlMs":300000,"evaluatedAt":"2026-08-31T16:34:38.722Z"}}
  evidence: worldStateKeys=execution.11d-c-task-3.started; eventIds=74f3ce54-2522-4178-8e42-950ed9d785d0
- entity: world-state:execution.11d-c-task-1.completed
  kind: fact
  label: execution.11d-c-task-1.completed
  observedAt: 2026-08-28T13:06:54.821Z
  sourceFreshness: stale
  confidence: 1.00
  attributes: {"value":{"eventType":"execution.completed","severity":"info","subject":"11d-c-task-1","scope":"execution:system_operation","payload":{"taskId":"11d-c-task-1","category":"system_operation","risk":"safe","status":"completed","stepCount":1,"currentStepId":"step-1"}},"freshness":{"status":"stale","basis":"ttl","expiresAt":"2026-08-28T13:11:54.821Z","ttlMs":300000,"evaluatedAt":"2026-08-31T16:34:38.722Z"}}
  evidence: worldStateKeys=execution.11d-c-task-1.completed; eventIds=757c328b-2de1-4e85-88f0-68e63197a02f
- entity: world-state:execution.11d-c-task-1.started
  kind: fact
  label: execution.11d-c-task-1.started
  observedAt: 2026-08-28T13:06:54.817Z
  sourceFreshness: stale
  confidence: 1.00
  attributes: {"value":{"eventType":"execution.started","severity":"info","subject":"11d-c-task-1","scope":"execution:system_operation","payload":{"taskId":"11d-c-task-1","category":"system_operation","risk":"safe","status":"pending","stepCount":1,"currentStepId":"step-1"}},"freshness":{"status":"stale","basis":"ttl","expiresAt":"2026-08-28T13:11:54.817Z","ttlMs":300000,"evaluatedAt":"2026-08-31T16:34:38.722Z"}}
  evidence: worldStateKeys=execution.11d-c-task-1.started; eventIds=4677d1b2-e820-4641-9b4c-f26ec2fccff6
- entity: world-state:execution.11d-b-8.waiting-for-approval
  kind: fact
  label: execution.11d-b-8.waiting-for-approval
  observedAt: 2026-08-28T13:06:53.168Z
  sourceFreshness: stale
  confidence: 1.00
  attributes: {"value":{"eventType":"execution.waiting_for_approval","severity":"notice","subject":"11d-b-8","scope":"execution:system_operation","payload":{"taskId":"11d-b-8","category":"system_operation","risk":"safe","status":"waiting_for_approval","stepCount":1,"currentStepId":"step-1","error":"This action requires approval before execution."}},"freshness":{"status":"stale","basis":"ttl","expiresAt":"2026-08-28T13:11:53.168Z","ttlMs":300000,"evaluatedAt":"2026-08-31T16:34:38.722Z"}}
  evidence: worldStateKeys=execution.11d-b-8.waiting-for-approval; eventIds=51eb77a3-ca59-47a0-bda3-761a6627af0f

World Model explicit dependency relationships:
- count: 6
- ONLY the relationships in this section are dependency edges.
- relationship: relation:requires-model:model-role:repair->model:deepseek-coder-v2:16b
  type: requires-model
  from: model-role:repair
  to: model:deepseek-coder-v2:16b
  directed: true
  observedAt: 2026-08-31T16:29:42.664Z
  sourceFreshness: aging
  confidence: 1.00
  attributes: {}
  evidence: worldStateKeys=model.role.repair.assignment; eventIds=0ed40eca-bb94-4d48-aad6-24da13ee4ad4
- relationship: relation:served-by:model:deepseek-coder-v2:16b->model:ollama
  type: served-by
  from: model:deepseek-coder-v2:16b
  to: model:ollama
  directed: true
  observedAt: 2026-08-31T16:29:42.664Z
  sourceFreshness: aging
  confidence: 1.00
  attributes: {}
  evidence: worldStateKeys=model.role.repair.assignment; eventIds=0ed40eca-bb94-4d48-aad6-24da13ee4ad4
- relationship: relation:requires-model:model-role:planner->model:deepseek-coder-v2:16b
  type: requires-model
  from: model-role:planner
  to: model:deepseek-coder-v2:16b
  directed: true
  observedAt: 2026-08-31T16:29:42.654Z
  sourceFreshness: aging
  confidence: 1.00
  attributes: {}
  evidence: worldStateKeys=model.role.planner.assignment; eventIds=9961fb67-0dcd-463f-8a2e-6a2c670683ce
- relationship: relation:requires-model:model-role:code->model:deepseek-coder-v2:16b
  type: requires-model
  from: model-role:code
  to: model:deepseek-coder-v2:16b
  directed: true
  observedAt: 2026-08-31T16:29:42.646Z
  sourceFreshness: aging
  confidence: 1.00
  attributes: {}
  evidence: worldStateKeys=model.role.code.assignment; eventIds=14085e0b-e2df-456f-a32c-f08760b49fdf
- relationship: relation:requires-model:model-role:default->model:gemma3:latest
  type: requires-model
  from: model-role:default
  to: model:gemma3:latest
  directed: true
  observedAt: 2026-08-31T16:29:42.636Z
  sourceFreshness: aging
  confidence: 1.00
  attributes: {}
  evidence: worldStateKeys=model.role.default.assignment; eventIds=968e2f02-ad1f-4aa5-877f-38394da9e73a
- relationship: relation:served-by:model:gemma3:latest->model:ollama
  type: served-by
  from: model:gemma3:latest
  to: model:ollama
  directed: true
  observedAt: 2026-08-31T16:29:42.636Z
  sourceFreshness: aging
  confidence: 1.00
  attributes: {}
  evidence: worldStateKeys=model.role.default.assignment; eventIds=968e2f02-ad1f-4aa5-877f-38394da9e73a

World Model other relationships (role/state/structural evidence; not dependency edges):
- explicit has-role count: 4
- state attachment count: 6

World Model explicit role relationships (count=4; structural, not dependency edges):
- relationship: relation:has-role:model:role->model-role:repair
  type: has-role
  from: model:role
  to: model-role:repair
  directed: true
  observedAt: 2026-08-31T16:29:42.664Z
  sourceFreshness: aging
  confidence: 1.00
  attributes: {}
  evidence: worldStateKeys=model.role.repair.assignment; eventIds=0ed40eca-bb94-4d48-aad6-24da13ee4ad4
- relationship: relation:has-role:model:role->model-role:planner
  type: has-role
  from: model:role
  to: model-role:planner
  directed: true
  observedAt: 2026-08-31T16:29:42.654Z
  sourceFreshness: aging
  confidence: 1.00
  attributes: {}
  evidence: worldStateKeys=model.role.planner.assignment; eventIds=9961fb67-0dcd-463f-8a2e-6a2c670683ce
- relationship: relation:has-role:model:role->model-role:code
  type: has-role
  from: model:role
  to: model-role:code
  directed: true
  observedAt: 2026-08-31T16:29:42.646Z
  sourceFreshness: aging
  confidence: 1.00
  attributes: {}
  evidence: worldStateKeys=model.role.code.assignment; eventIds=14085e0b-e2df-456f-a32c-f08760b49fdf
- relationship: relation:has-role:model:role->model-role:default
  type: has-role
  from: model:role
  to: model-role:default
  directed: true
  observedAt: 2026-08-31T16:29:42.636Z
  sourceFreshness: aging
  confidence: 1.00
  attributes: {}
  evidence: worldStateKeys=model.role.default.assignment; eventIds=968e2f02-ad1f-4aa5-877f-38394da9e73a

World Model state attachments (count=6; NOT dependency edges):
- relationship: relation:has-state:model-role:repair->world-state:model.role.repair.assignment
  type: has-state
  from: model-role:repair
  to: world-state:model.role.repair.assignment
  directed: true
  observedAt: 2026-08-31T16:29:42.664Z
  sourceFreshness: aging
  confidence: 1.00
  attributes: {}
  evidence: worldStateKeys=model.role.repair.assignment; eventIds=0ed40eca-bb94-4d48-aad6-24da13ee4ad4
- relationship: relation:has-state:model:role->world-state:model.role.repair.assignment
  type: has-state
  from: model:role
  to: world-state:model.role.repair.assignment
  directed: true
  observedAt: 2026-08-31T16:29:42.664Z
  sourceFreshness: aging
  confidence: 1.00
  attributes: {}
  evidence: worldStateKeys=model.role.repair.assignment; eventIds=0ed40eca-bb94-4d48-aad6-24da13ee4ad4
- relationship: relation:has-state:model:role->world-state:model.role.repair.available
  type: has-state
  from: model:role
  to: world-state:model.role.repair.available
  directed: true
  observedAt: 2026-08-31T16:29:42.664Z
  sourceFreshness: aging
  confidence: 1.00
  attributes: {}
  evidence: worldStateKeys=model.role.repair.available; eventIds=0ed40eca-bb94-4d48-aad6-24da13ee4ad4
- relationship: relation:has-state:model-role:planner->world-state:model.role.planner.assignment
  type: has-state
  from: model-role:planner
  to: world-state:model.role.planner.assignment
  directed: true
  observedAt: 2026-08-31T16:29:42.654Z
  sourceFreshness: aging
  confidence: 1.00
  attributes: {}
  evidence: worldStateKeys=model.role.planner.assignment; eventIds=9961fb67-0dcd-463f-8a2e-6a2c670683ce
- relationship: relation:has-state:model:role->world-state:model.role.planner.assignment
  type: has-state
  from: model:role
  to: world-state:model.role.planner.assignment
  directed: true
  observedAt: 2026-08-31T16:29:42.654Z
  sourceFreshness: aging
  confidence: 1.00
  attributes: {}
  evidence: worldStateKeys=model.role.planner.assignment; eventIds=9961fb67-0dcd-463f-8a2e-6a2c670683ce
- relationship: relation:has-state:model:role->world-state:model.role.planner.available
  type: has-state
  from: model:role
  to: world-state:model.role.planner.available
  directed: true
  observedAt: 2026-08-31T16:29:42.654Z
  sourceFreshness: aging
  confidence: 1.00
  attributes: {}
  evidence: worldStateKeys=model.role.planner.available; eventIds=9961fb67-0dcd-463f-8a2e-6a2c670683ce

World Model precomputed downstream impact assessments:
- See WORLD MODEL CRITICAL IMPACT BACKBONE above; it is authoritative for consequence reasoning.

World Model supported predictions:
- No supported predictions.
- Canonical stored predictions may exist internally, but none satisfy the support/currentness contract.
```