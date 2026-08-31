# Chernobog Phase 11 - UI Runtime Entry / Freshness Trace

Generated: 2026-08-31T00:57:44.9146493+01:00

Repository: `C:\Users\adamt\Documents\chernobog-ai`

Purpose: determine why the live UI response differs from the proven direct/routed model response.


## Key finding from prior runtime probe

- Active project resolved to `chernobog`.
- Grounded system context contained canonical Chernobog Project Operations state.
- Direct `chat` response used that state correctly.
- Model-selected route was also `chat` and used that state correctly.
- Therefore the remaining defect is UI/API entry-path or stale-runtime related.

## runCommandPipeline callers

Pattern: `runCommandPipeline\s*\(`

### `app\api\chat\route.ts` line 19

```text
    7:   try {
    8:     const body = await req.json();
    9:     const userMessage = String(body?.message ?? "").trim();
   10:     const sessionId = String(body?.sessionId ?? "").trim();
   11: 
   12:     if (!userMessage) {
   13:       return NextResponse.json(
   14:         { error: "Message is required." },
   15:         { status: 400 }
   16:       );
   17:     }
   18: 
>  19:     const result = await runCommandPipeline(userMessage, sessionId);
   20: 
   21:     return NextResponse.json(result.payload);
   22:   } catch (error) {
   23:     console.error("Chat route error:", error);
   24: 
   25:     return NextResponse.json(
   26:       {
   27:         error: "Failed to process directive.",
   28:         details: error instanceof Error ? error.message : String(error),
   29:       },
   30:       { status: 500 }
   31:     );
```

### `lib\chernobog\pipeline\runCommand.ts` line 129

```text
  117: } from "@/lib/modules/content-ingest";
  118: 
  119: import {
  120:   executeYouTubeIngestCommand,
  121:   isYouTubeIngestCommand,
  122: } from "@/lib/modules/youtube-ingest";
  123: 
  124: 
  125: type SessionWithExecutionState = ReturnType<typeof getSessionContext> & {
  126:   executionState?: ExecutionState;
  127: };
  128: 
> 129: export async function runCommandPipeline(
  130:   userMessage: string,
  131:   sessionId: string
  132: ): Promise<CommandPipelineResult> {
  133:   let route: RouteName = "chat";
  134:   let reply = "";
  135:   const trace = createTrustTrace(userMessage, sessionId);
  136: 
  137:   const startingSession = getSessionContext(sessionId);
  138: 
  139: 
  140:   const activeProjectResolution = resolveActiveProjectContext({
  141:     userMessage,
```


## Command UI network requests

Pattern: `fetch\s*\(|axios|/api/|EventSource|WebSocket`

### `components\UmbraAIConsole.tsx` line 305

```text
  295:   }, []);
  296: 
  297:   useEffect(() => {
  298:     if (!sessionId) return;
  299:   
  300:     const activeSessionId = sessionId;
  301:     let cancelled = false;
  302:   
  303:     async function hydrateSession() {
  304:       try {
> 305:         const response = await fetch(
  306:           `/api/session?sessionId=${encodeURIComponent(activeSessionId)}`,
  307:           {
  308:             method: "GET",
  309:             cache: "no-store",
  310:           }
  311:         );
  312: 
  313:         if (!response.ok) {
  314:           return;
  315:         }
```

### `components\UmbraAIConsole.tsx` line 306

```text
  296: 
  297:   useEffect(() => {
  298:     if (!sessionId) return;
  299:   
  300:     const activeSessionId = sessionId;
  301:     let cancelled = false;
  302:   
  303:     async function hydrateSession() {
  304:       try {
  305:         const response = await fetch(
> 306:           `/api/session?sessionId=${encodeURIComponent(activeSessionId)}`,
  307:           {
  308:             method: "GET",
  309:             cache: "no-store",
  310:           }
  311:         );
  312: 
  313:         if (!response.ok) {
  314:           return;
  315:         }
  316: 
```

### `components\UmbraAIConsole.tsx` line 490

```text
  480:       pendingState: "processing",
  481:     }));
  482: 
  483:     try {
  484:       const controller = new AbortController();
  485:       const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  486: 
  487:       let response: Response;
  488: 
  489:       try {
> 490:         response = await fetch("/api/chat", {
  491:           method: "POST",
  492:           headers: {
  493:             "Content-Type": "application/json",
  494:           },
  495:           signal: controller.signal,
  496:           body: JSON.stringify({
  497:             message: value,
  498:             sessionId: activeSessionId,
  499:           }),
  500:         });
```

### `components\UmbraAIConsole.tsx` line 574

```text
  564:       }));
  565:     } finally {
  566:       setIsBusy(false);
  567:     }
  568:   }
  569: 
  570:   async function resetCurrentSession() {
  571:     if (!sessionId) return;
  572: 
  573:     try {
> 574:       await fetch("/api/session/reset", {
  575:         method: "POST",
  576:         headers: {
  577:           "Content-Type": "application/json",
  578:         },
  579:         body: JSON.stringify({
  580:           sessionId,
  581:         }),
  582:       });
  583:     } finally {
  584:       const nextSessionId = crypto.randomUUID();
```


## API routes importing pipeline/router

Pattern: `runCommandPipeline|respondForRoute|routeMessage|chernobog/pipeline|chernobog/router`

### `app\api\chat\route.ts` line 2

```text
    1: import { NextResponse } from "next/server";
>   2: import { runCommandPipeline } from "@/lib/chernobog/pipeline/runCommand";
    3: 
    4: export const runtime = "nodejs";
    5: 
    6: export async function POST(req: Request) {
    7:   try {
    8:     const body = await req.json();
    9:     const userMessage = String(body?.message ?? "").trim();
   10:     const sessionId = String(body?.sessionId ?? "").trim();
   11: 
   12:     if (!userMessage) {
   13:       return NextResponse.json(
   14:         { error: "Message is required." },
```

### `app\api\chat\route.ts` line 19

```text
    7:   try {
    8:     const body = await req.json();
    9:     const userMessage = String(body?.message ?? "").trim();
   10:     const sessionId = String(body?.sessionId ?? "").trim();
   11: 
   12:     if (!userMessage) {
   13:       return NextResponse.json(
   14:         { error: "Message is required." },
   15:         { status: 400 }
   16:       );
   17:     }
   18: 
>  19:     const result = await runCommandPipeline(userMessage, sessionId);
   20: 
   21:     return NextResponse.json(result.payload);
   22:   } catch (error) {
   23:     console.error("Chat route error:", error);
   24: 
   25:     return NextResponse.json(
   26:       {
   27:         error: "Failed to process directive.",
   28:         details: error instanceof Error ? error.message : String(error),
   29:       },
   30:       { status: 500 }
   31:     );
```


## Alternative response generation paths

Pattern: `generateWithReliableOllama|generateWithOllama|respondForRoute|reply\s*=|NextResponse\.json|No data exists|Assessment incomplete`

### `app\api\ai-runtime\route.ts` line 16

```text
    9: export const runtime = "nodejs";
   10: 
   11: export async function GET() {
   12:   try {
   13:     const status =
   14:       await getAiRuntimeStatus();
   15: 
>  16:     return NextResponse.json({
   17:       ok: true,
   18:       runtime:
   19:         status,
   20:       boundaries: {
   21:         readOnlyEndpoint:
   22:           true,
   23:         provider:
```

### `app\api\ai-runtime\route.ts` line 34

```text
   27:         grantsPermissions:
   28:           false,
   29:         selectsActions:
   30:           false,
   31:       },
   32:     });
   33:   } catch (error) {
>  34:     return NextResponse.json(
   35:       {
   36:         ok: false,
   37:         error:
   38:           "ai_runtime_status_failed",
   39:         message:
   40:           error instanceof Error
   41:             ? error.message
```

### `app\api\character-generator\projects\[projectId]\brief\route.ts` line 35

```text
   28:   context: CharacterBriefRouteContext
   29: ): Promise<string> {
   30:   const { projectId } = await context.params;
   31:   return decodeURIComponent(projectId);
   32: }
   33: 
   34: function notFound(projectId: string) {
>  35:   return NextResponse.json(
   36:     {
   37:       ok: false,
   38:       error: `Character Forge project not found: ${projectId}.`,
   39:     },
   40:     { status: 404, headers: NO_STORE_HEADERS }
   41:   );
   42: }
```

### `app\api\character-generator\projects\[projectId]\brief\route.ts` line 45

```text
   38:       error: `Character Forge project not found: ${projectId}.`,
   39:     },
   40:     { status: 404, headers: NO_STORE_HEADERS }
   41:   );
   42: }
   43: 
   44: function validationError(error: Error) {
>  45:   return NextResponse.json(
   46:     {
   47:       ok: false,
   48:       error: error.message,
   49:     },
   50:     { status: 400, headers: NO_STORE_HEADERS }
   51:   );
   52: }
```

### `app\api\character-generator\projects\[projectId]\brief\route.ts` line 55

```text
   48:       error: error.message,
   49:     },
   50:     { status: 400, headers: NO_STORE_HEADERS }
   51:   );
   52: }
   53: 
   54: function stateError(error: CharacterProjectStateError) {
>  55:   return NextResponse.json(
   56:     {
   57:       ok: false,
   58:       error: error.message,
   59:     },
   60:     { status: 409, headers: NO_STORE_HEADERS }
   61:   );
   62: }
```

### `app\api\character-generator\projects\[projectId]\brief\route.ts` line 67

```text
   60:     { status: 409, headers: NO_STORE_HEADERS }
   61:   );
   62: }
   63: 
   64: function internalError(error: unknown) {
   65:   console.error("Character Forge brief error:", error);
   66: 
>  67:   return NextResponse.json(
   68:     {
   69:       ok: false,
   70:       error: "Failed to process the Character Forge brief.",
   71:     },
   72:     { status: 500, headers: NO_STORE_HEADERS }
   73:   );
   74: }
```

### `app\api\character-generator\projects\[projectId]\brief\route.ts` line 88

```text
   81:     const projectId = await readProjectId(context);
   82:     const result = await generateCharacterProjectBrief(projectId);
   83: 
   84:     if (!result) {
   85:       return notFound(projectId);
   86:     }
   87: 
>  88:     return NextResponse.json(
   89:       {
   90:         ok: true,
   91:         project: result.project,
   92:         generation: result.generation,
   93:       },
   94:       { status: 201, headers: NO_STORE_HEADERS }
   95:     );
```

### `app\api\character-generator\projects\[projectId]\brief\route.ts` line 123

```text
  116:     const brief = parseCharacterBriefUpdateRequest(body);
  117:     const project = await saveCharacterProjectBrief(projectId, brief);
  118: 
  119:     if (!project) {
  120:       return notFound(projectId);
  121:     }
  122: 
> 123:     return NextResponse.json(
  124:       {
  125:         ok: true,
  126:         project,
  127:       },
  128:       { headers: NO_STORE_HEADERS }
  129:     );
  130:   } catch (error) {
```

### `app\api\character-generator\projects\[projectId]\brief\route.ts` line 168

```text
  161:         ? await approveCharacterProjectBrief(projectId, input.brief)
  162:         : await reopenCharacterProjectBrief(projectId);
  163: 
  164:     if (!project) {
  165:       return notFound(projectId);
  166:     }
  167: 
> 168:     return NextResponse.json(
  169:       {
  170:         ok: true,
  171:         project,
  172:       },
  173:       { headers: NO_STORE_HEADERS }
  174:     );
  175:   } catch (error) {
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\image\route.ts` line 17

```text
   10: export const dynamic = "force-dynamic";
   11: 
   12: type RouteContext = {
   13:   params: Promise<{ projectId: string }>;
   14: };
   15: 
   16: function notFound() {
>  17:   return NextResponse.json(
   18:     { ok: false, error: "Character Forge canonical A-pose image not found." },
   19:     { status: 404, headers: { "Cache-Control": "no-store" } }
   20:   );
   21: }
   22: 
   23: export async function GET(_request: Request, context: RouteContext) {
   24:   try {
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\image\route.ts` line 67

```text
   60:       },
   61:     });
   62:   } catch (error) {
   63:     if (
   64:       error instanceof CharacterProjectValidationError ||
   65:       error instanceof URIError
   66:     ) {
>  67:       return NextResponse.json(
   68:         { ok: false, error: error.message },
   69:         { status: 400, headers: { "Cache-Control": "no-store" } }
   70:       );
   71:     }
   72: 
   73:     console.error("Character Forge canonical pose image error:", error);
   74:     return NextResponse.json(
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\image\route.ts` line 74

```text
   67:       return NextResponse.json(
   68:         { ok: false, error: error.message },
   69:         { status: 400, headers: { "Cache-Control": "no-store" } }
   70:       );
   71:     }
   72: 
   73:     console.error("Character Forge canonical pose image error:", error);
>  74:     return NextResponse.json(
   75:       { ok: false, error: "Failed to read the canonical A-pose image." },
   76:       { status: 500, headers: { "Cache-Control": "no-store" } }
   77:     );
   78:   }
   79: }
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\route.ts` line 31

```text
   24: };
   25: 
   26: async function projectIdFrom(context: RouteContext): Promise<string> {
   27:   return decodeURIComponent((await context.params).projectId);
   28: }
   29: 
   30: function notFound(projectId: string) {
>  31:   return NextResponse.json(
   32:     { ok: false, error: `Character Forge project not found: ${projectId}.` },
   33:     { status: 404, headers: HEADERS },
   34:   );
   35: }
   36: 
   37: function errorResponse(error: unknown) {
   38:   if (
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\route.ts` line 43

```text
   36: 
   37: function errorResponse(error: unknown) {
   38:   if (
   39:     error instanceof CharacterProjectValidationError ||
   40:     error instanceof URIError ||
   41:     error instanceof SyntaxError
   42:   ) {
>  43:     return NextResponse.json(
   44:       {
   45:         ok: false,
   46:         error:
   47:           error instanceof SyntaxError
   48:             ? "Request body must contain valid JSON."
   49:             : error.message,
   50:       },
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\route.ts` line 56

```text
   49:             : error.message,
   50:       },
   51:       { status: 400, headers: HEADERS },
   52:     );
   53:   }
   54: 
   55:   if (error instanceof CharacterProjectStateError) {
>  56:     return NextResponse.json(
   57:       { ok: false, error: error.message },
   58:       { status: 409, headers: HEADERS },
   59:     );
   60:   }
   61: 
   62:   if (error instanceof CharacterCanonicalPoseGenerationError) {
   63:     return NextResponse.json(
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\route.ts` line 63

```text
   56:     return NextResponse.json(
   57:       { ok: false, error: error.message },
   58:       { status: 409, headers: HEADERS },
   59:     );
   60:   }
   61: 
   62:   if (error instanceof CharacterCanonicalPoseGenerationError) {
>  63:     return NextResponse.json(
   64:       { ok: false, error: error.message },
   65:       { status: 502, headers: HEADERS },
   66:     );
   67:   }
   68: 
   69:   console.error("Character Forge canonical pose error:", error);
   70:   return NextResponse.json(
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\route.ts` line 70

```text
   63:     return NextResponse.json(
   64:       { ok: false, error: error.message },
   65:       { status: 502, headers: HEADERS },
   66:     );
   67:   }
   68: 
   69:   console.error("Character Forge canonical pose error:", error);
>  70:   return NextResponse.json(
   71:     { ok: false, error: "Failed to process the canonical A-pose gate." },
   72:     { status: 500, headers: HEADERS },
   73:   );
   74: }
   75: 
   76: export async function GET(_request: Request, context: RouteContext) {
   77:   try {
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\route.ts` line 86

```text
   79:     const project = await readCharacterProject(projectId);
   80: 
   81:     if (!project) {
   82:       return notFound(projectId);
   83:     }
   84: 
   85:     const provider = await getCharacterCanonicalPoseProviderStatus();
>  86:     return NextResponse.json({ ok: true, provider }, { headers: HEADERS });
   87:   } catch (error) {
   88:     return errorResponse(error);
   89:   }
   90: }
   91: 
   92: export async function POST(request: Request, context: RouteContext) {
   93:   try {
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\route.ts` line 104

```text
   97:     );
   98:     const project = await generateCharacterCanonicalPose(projectId);
   99: 
  100:     if (!project) {
  101:       return notFound(projectId);
  102:     }
  103: 
> 104:     return NextResponse.json({ ok: true, project }, { headers: HEADERS });
  105:   } catch (error) {
  106:     return errorResponse(error);
  107:   }
  108: }
  109: 
  110: export async function PATCH(request: Request, context: RouteContext) {
  111:   try {
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\route.ts` line 127

```text
  120:           ? await rejectCharacterCanonicalPose(projectId)
  121:           : await resetInterruptedCharacterCanonicalPoseGeneration(projectId);
  122: 
  123:     if (!project) {
  124:       return notFound(projectId);
  125:     }
  126: 
> 127:     return NextResponse.json({ ok: true, project }, { headers: HEADERS });
  128:   } catch (error) {
  129:     return errorResponse(error);
  130:   }
  131: }
```

### `app\api\character-generator\projects\[projectId]\concepts\[conceptId]\image\route.ts` line 20

```text
   13:   params: Promise<{
   14:     projectId: string;
   15:     conceptId: string;
   16:   }>;
   17: };
   18: 
   19: function imageNotFound() {
>  20:   return NextResponse.json(
   21:     {
   22:       ok: false,
   23:       error: "Character Forge concept image not found.",
   24:     },
   25:     { status: 404, headers: { "Cache-Control": "no-store" } }
   26:   );
   27: }
```

### `app\api\character-generator\projects\[projectId]\concepts\[conceptId]\image\route.ts` line 71

```text
   64:         "Content-Type": concept.imageMimeType,
   65:         "Content-Length": String(bytes.length),
   66:         "X-Content-Type-Options": "nosniff",
   67:       },
   68:     });
   69:   } catch (error) {
   70:     if (error instanceof CharacterProjectValidationError || error instanceof URIError) {
>  71:       return NextResponse.json(
   72:         {
   73:           ok: false,
   74:           error: error.message,
   75:         },
   76:         { status: 400, headers: { "Cache-Control": "no-store" } }
   77:       );
   78:     }
```

### `app\api\character-generator\projects\[projectId]\concepts\[conceptId]\image\route.ts` line 82

```text
   75:         },
   76:         { status: 400, headers: { "Cache-Control": "no-store" } }
   77:       );
   78:     }
   79: 
   80:     console.error("Character Forge concept image error:", error);
   81: 
>  82:     return NextResponse.json(
   83:       {
   84:         ok: false,
   85:         error: "Failed to read the Character Forge concept image.",
   86:       },
   87:       { status: 500, headers: { "Cache-Control": "no-store" } }
   88:     );
   89:   }
```

### `app\api\character-generator\projects\[projectId]\concepts\route.ts` line 38

```text
   31:   context: CharacterConceptRouteContext
   32: ): Promise<string> {
   33:   const { projectId } = await context.params;
   34:   return decodeURIComponent(projectId);
   35: }
   36: 
   37: function notFound(projectId: string) {
>  38:   return NextResponse.json(
   39:     {
   40:       ok: false,
   41:       error: `Character Forge project not found: ${projectId}.`,
   42:     },
   43:     { status: 404, headers: NO_STORE_HEADERS }
   44:   );
   45: }
```

### `app\api\character-generator\projects\[projectId]\concepts\route.ts` line 48

```text
   41:       error: `Character Forge project not found: ${projectId}.`,
   42:     },
   43:     { status: 404, headers: NO_STORE_HEADERS }
   44:   );
   45: }
   46: 
   47: function validationError(error: Error) {
>  48:   return NextResponse.json(
   49:     {
   50:       ok: false,
   51:       error: error.message,
   52:     },
   53:     { status: 400, headers: NO_STORE_HEADERS }
   54:   );
   55: }
```

### `app\api\character-generator\projects\[projectId]\concepts\route.ts` line 58

```text
   51:       error: error.message,
   52:     },
   53:     { status: 400, headers: NO_STORE_HEADERS }
   54:   );
   55: }
   56: 
   57: function stateError(error: CharacterProjectStateError) {
>  58:   return NextResponse.json(
   59:     {
   60:       ok: false,
   61:       error: error.message,
   62:     },
   63:     { status: 409, headers: NO_STORE_HEADERS }
   64:   );
   65: }
```

### `app\api\character-generator\projects\[projectId]\concepts\route.ts` line 68

```text
   61:       error: error.message,
   62:     },
   63:     { status: 409, headers: NO_STORE_HEADERS }
   64:   );
   65: }
   66: 
   67: function providerError(error: CharacterConceptGenerationError) {
>  68:   return NextResponse.json(
   69:     {
   70:       ok: false,
   71:       error: error.message,
   72:     },
   73:     { status: 502, headers: NO_STORE_HEADERS }
   74:   );
   75: }
```

### `app\api\character-generator\projects\[projectId]\concepts\route.ts` line 80

```text
   73:     { status: 502, headers: NO_STORE_HEADERS }
   74:   );
   75: }
   76: 
   77: function internalError(error: unknown) {
   78:   console.error("Character Forge concept error:", error);
   79: 
>  80:   return NextResponse.json(
   81:     {
   82:       ok: false,
   83:       error: "Failed to process Character Forge concepts.",
   84:     },
   85:     { status: 500, headers: NO_STORE_HEADERS }
   86:   );
   87: }
```

### `app\api\character-generator\projects\[projectId]\concepts\route.ts` line 103

```text
   96: 
   97:     if (!project) {
   98:       return notFound(projectId);
   99:     }
  100: 
  101:     const provider = await getCharacterConceptProviderStatus();
  102: 
> 103:     return NextResponse.json(
  104:       {
  105:         ok: true,
  106:         provider,
  107:       },
  108:       { headers: NO_STORE_HEADERS }
  109:     );
  110:   } catch (error) {
```

### `app\api\character-generator\projects\[projectId]\concepts\route.ts` line 131

```text
  124:     const projectId = await readProjectId(context);
  125:     const result = await generateCharacterProjectConcepts(projectId);
  126: 
  127:     if (!result) {
  128:       return notFound(projectId);
  129:     }
  130: 
> 131:     return NextResponse.json(
  132:       {
  133:         ok: true,
  134:         project: result.project,
  135:         provider: result.provider,
  136:       },
  137:       { status: 201, headers: NO_STORE_HEADERS }
  138:     );
```

### `app\api\character-generator\projects\[projectId]\concepts\route.ts` line 188

```text
  181:         break;
  182:     }
  183: 
  184:     if (!project) {
  185:       return notFound(projectId);
  186:     }
  187: 
> 188:     return NextResponse.json(
  189:       {
  190:         ok: true,
  191:         project,
  192:       },
  193:       { headers: NO_STORE_HEADERS }
  194:     );
  195:   } catch (error) {
```

### `app\api\character-generator\projects\[projectId]\identity-anchor\image\route.ts` line 17

```text
   10: export const dynamic = "force-dynamic";
   11: 
   12: type RouteContext = {
   13:   params: Promise<{ projectId: string }>;
   14: };
   15: 
   16: function notFound() {
>  17:   return NextResponse.json(
   18:     { ok: false, error: "Character Forge identity anchor image not found." },
   19:     { status: 404, headers: { "Cache-Control": "no-store" } }
   20:   );
   21: }
   22: 
   23: export async function GET(_request: Request, context: RouteContext) {
   24:   try {
```

### `app\api\character-generator\projects\[projectId]\identity-anchor\image\route.ts` line 55

```text
   48:       },
   49:     });
   50:   } catch (error) {
   51:     if (
   52:       error instanceof CharacterProjectValidationError ||
   53:       error instanceof URIError
   54:     ) {
>  55:       return NextResponse.json(
   56:         { ok: false, error: error.message },
   57:         { status: 400, headers: { "Cache-Control": "no-store" } }
   58:       );
   59:     }
   60: 
   61:     console.error("Character Forge identity anchor image error:", error);
   62:     return NextResponse.json(
```

### `app\api\character-generator\projects\[projectId]\identity-anchor\image\route.ts` line 62

```text
   55:       return NextResponse.json(
   56:         { ok: false, error: error.message },
   57:         { status: 400, headers: { "Cache-Control": "no-store" } }
   58:       );
   59:     }
   60: 
   61:     console.error("Character Forge identity anchor image error:", error);
>  62:     return NextResponse.json(
   63:       { ok: false, error: "Failed to read the identity anchor image." },
   64:       { status: 500, headers: { "Cache-Control": "no-store" } }
   65:     );
   66:   }
   67: }
```

### `app\api\character-generator\projects\[projectId]\identity-anchor\route.ts` line 34

```text
   27: };
   28: 
   29: async function projectIdFrom(context: RouteContext): Promise<string> {
   30:   return decodeURIComponent((await context.params).projectId);
   31: }
   32: 
   33: function notFound(projectId: string) {
>  34:   return NextResponse.json(
   35:     { ok: false, error: `Character Forge project not found: ${projectId}.` },
   36:     { status: 404, headers: HEADERS }
   37:   );
   38: }
   39: 
   40: function errorResponse(error: unknown) {
   41:   if (
```

### `app\api\character-generator\projects\[projectId]\identity-anchor\route.ts` line 46

```text
   39: 
   40: function errorResponse(error: unknown) {
   41:   if (
   42:     error instanceof CharacterProjectValidationError ||
   43:     error instanceof URIError ||
   44:     error instanceof SyntaxError
   45:   ) {
>  46:     return NextResponse.json(
   47:       {
   48:         ok: false,
   49:         error:
   50:           error instanceof SyntaxError
   51:             ? "Request body must contain valid JSON."
   52:             : error.message,
   53:       },
```

### `app\api\character-generator\projects\[projectId]\identity-anchor\route.ts` line 59

```text
   52:             : error.message,
   53:       },
   54:       { status: 400, headers: HEADERS }
   55:     );
   56:   }
   57: 
   58:   if (error instanceof CharacterProjectStateError) {
>  59:     return NextResponse.json(
   60:       { ok: false, error: error.message },
   61:       { status: 409, headers: HEADERS }
   62:     );
   63:   }
   64: 
   65:   console.error("Character Forge identity anchor error:", error);
   66:   return NextResponse.json(
```

### `app\api\character-generator\projects\[projectId]\identity-anchor\route.ts` line 66

```text
   59:     return NextResponse.json(
   60:       { ok: false, error: error.message },
   61:       { status: 409, headers: HEADERS }
   62:     );
   63:   }
   64: 
   65:   console.error("Character Forge identity anchor error:", error);
>  66:   return NextResponse.json(
   67:     { ok: false, error: "Failed to process the character identity anchor." },
   68:     { status: 500, headers: HEADERS }
   69:   );
   70: }
   71: 
   72: export async function POST(request: Request, context: RouteContext) {
   73:   try {
```

### `app\api\character-generator\projects\[projectId]\identity-anchor\route.ts` line 116

```text
  109:       crop: metadata.crop,
  110:     });
  111: 
  112:     if (!project) {
  113:       return notFound(projectId);
  114:     }
  115: 
> 116:     return NextResponse.json(
  117:       { ok: true, project },
  118:       { status: 201, headers: HEADERS }
  119:     );
  120:   } catch (error) {
  121:     return errorResponse(error);
  122:   }
  123: }
```

### `app\api\character-generator\projects\[projectId]\identity-anchor\route.ts` line 142

```text
  135:           ? await clearCharacterIdentityAnchor(projectId)
  136:           : await retireLegacyCharacterReferenceSet(projectId);
  137: 
  138:     if (!project) {
  139:       return notFound(projectId);
  140:     }
  141: 
> 142:     return NextResponse.json({ ok: true, project }, { headers: HEADERS });
  143:   } catch (error) {
  144:     return errorResponse(error);
  145:   }
  146: }
```

### `app\api\character-generator\projects\[projectId]\model\file\route.ts` line 26

```text
   19: ]);
   20: 
   21: type RouteContext = {
   22:   params: Promise<{ projectId: string }>;
   23: };
   24: 
   25: function notFound() {
>  26:   return NextResponse.json(
   27:     { ok: false, error: "Character Forge model artifact not found." },
   28:     { status: 404, headers: { "Cache-Control": "no-store" } },
   29:   );
   30: }
   31: 
   32: export async function GET(_request: Request, context: RouteContext) {
   33:   try {
```

### `app\api\character-generator\projects\[projectId]\model\file\route.ts` line 66

```text
   59:       },
   60:     });
   61:   } catch (error) {
   62:     if (
   63:       error instanceof CharacterProjectValidationError ||
   64:       error instanceof URIError
   65:     ) {
>  66:       return NextResponse.json(
   67:         { ok: false, error: error.message },
   68:         { status: 400, headers: { "Cache-Control": "no-store" } },
   69:       );
   70:     }
   71: 
   72:     console.error("Character Forge model artifact error:", error);
   73:     return NextResponse.json(
```

### `app\api\character-generator\projects\[projectId]\model\file\route.ts` line 73

```text
   66:       return NextResponse.json(
   67:         { ok: false, error: error.message },
   68:         { status: 400, headers: { "Cache-Control": "no-store" } },
   69:       );
   70:     }
   71: 
   72:     console.error("Character Forge model artifact error:", error);
>  73:     return NextResponse.json(
   74:       { ok: false, error: "Failed to read the character model artifact." },
   75:       { status: 500, headers: { "Cache-Control": "no-store" } },
   76:     );
   77:   }
   78: }
```

### `app\api\character-generator\projects\[projectId]\model\route.ts` line 34

```text
   27: };
   28: 
   29: async function projectIdFrom(context: RouteContext): Promise<string> {
   30:   return decodeURIComponent((await context.params).projectId);
   31: }
   32: 
   33: function notFound(projectId: string) {
>  34:   return NextResponse.json(
   35:     { ok: false, error: `Character Forge project not found: ${projectId}.` },
   36:     { status: 404, headers: HEADERS },
   37:   );
   38: }
   39: 
   40: function errorResponse(error: unknown) {
   41:   if (
```

### `app\api\character-generator\projects\[projectId]\model\route.ts` line 46

```text
   39: 
   40: function errorResponse(error: unknown) {
   41:   if (
   42:     error instanceof CharacterProjectValidationError ||
   43:     error instanceof URIError ||
   44:     error instanceof SyntaxError
   45:   ) {
>  46:     return NextResponse.json(
   47:       {
   48:         ok: false,
   49:         error:
   50:           error instanceof SyntaxError
   51:             ? "Request body must contain valid JSON."
   52:             : error.message,
   53:       },
```

### `app\api\character-generator\projects\[projectId]\model\route.ts` line 59

```text
   52:             : error.message,
   53:       },
   54:       { status: 400, headers: HEADERS },
   55:     );
   56:   }
   57: 
   58:   if (error instanceof CharacterProjectStateError) {
>  59:     return NextResponse.json(
   60:       { ok: false, error: error.message },
   61:       { status: 409, headers: HEADERS },
   62:     );
   63:   }
   64: 
   65:   if (error instanceof CharacterModelGenerationError) {
   66:     return NextResponse.json(
```

### `app\api\character-generator\projects\[projectId]\model\route.ts` line 66

```text
   59:     return NextResponse.json(
   60:       { ok: false, error: error.message },
   61:       { status: 409, headers: HEADERS },
   62:     );
   63:   }
   64: 
   65:   if (error instanceof CharacterModelGenerationError) {
>  66:     return NextResponse.json(
   67:       { ok: false, error: error.message },
   68:       { status: 502, headers: HEADERS },
   69:     );
   70:   }
   71: 
   72:   console.error("Character Forge model error:", error);
   73:   return NextResponse.json(
```

### `app\api\character-generator\projects\[projectId]\model\route.ts` line 73

```text
   66:     return NextResponse.json(
   67:       { ok: false, error: error.message },
   68:       { status: 502, headers: HEADERS },
   69:     );
   70:   }
   71: 
   72:   console.error("Character Forge model error:", error);
>  73:   return NextResponse.json(
   74:     { ok: false, error: "Failed to process the local image-to-3D stage." },
   75:     { status: 500, headers: HEADERS },
   76:   );
   77: }
   78: 
   79: export async function GET(_request: Request, context: RouteContext) {
   80:   try {
```

### `app\api\character-generator\projects\[projectId]\model\route.ts` line 88

```text
   81:     const projectId = await projectIdFrom(context);
   82:     const result = await getCharacterModelReadiness(projectId);
   83: 
   84:     if (!result) {
   85:       return notFound(projectId);
   86:     }
   87: 
>  88:     return NextResponse.json(
   89:       { ok: true, project: result.project, provider: result.provider },
   90:       { headers: HEADERS },
   91:     );
   92:   } catch (error) {
   93:     return errorResponse(error);
   94:   }
   95: }
```

### `app\api\character-generator\projects\[projectId]\model\route.ts` line 107

```text
  100:     parseCharacterModelGenerateRequest((await request.json()) as unknown);
  101:     const project = await generateCharacterModel(projectId);
  102: 
  103:     if (!project) {
  104:       return notFound(projectId);
  105:     }
  106: 
> 107:     return NextResponse.json({ ok: true, project }, { headers: HEADERS });
  108:   } catch (error) {
  109:     return errorResponse(error);
  110:   }
  111: }
  112: 
  113: export async function PATCH(request: Request, context: RouteContext) {
  114:   try {
```

### `app\api\character-generator\projects\[projectId]\model\route.ts` line 130

```text
  123:           ? await rejectCharacterModel(projectId)
  124:           : await resetInterruptedCharacterModelGeneration(projectId);
  125: 
  126:     if (!project) {
  127:       return notFound(projectId);
  128:     }
  129: 
> 130:     return NextResponse.json({ ok: true, project }, { headers: HEADERS });
  131:   } catch (error) {
  132:     return errorResponse(error);
  133:   }
  134: }
```

### `app\api\character-generator\projects\[projectId]\reference-sheet\[viewId]\image\route.ts` line 17

```text
   10: export const dynamic = "force-dynamic";
   11: 
   12: type RouteContext = {
   13:   params: Promise<{ projectId: string; viewId: string }>;
   14: };
   15: 
   16: function notFound() {
>  17:   return NextResponse.json(
   18:     { ok: false, error: "Character Forge reference image not found." },
   19:     { status: 404, headers: { "Cache-Control": "no-store" } }
   20:   );
   21: }
   22: 
   23: export async function GET(_request: Request, context: RouteContext) {
   24:   try {
```

### `app\api\character-generator\projects\[projectId]\reference-sheet\[viewId]\image\route.ts` line 60

```text
   53:       },
   54:     });
   55:   } catch (error) {
   56:     if (
   57:       error instanceof CharacterProjectValidationError ||
   58:       error instanceof URIError
   59:     ) {
>  60:       return NextResponse.json(
   61:         { ok: false, error: error.message },
   62:         { status: 400, headers: { "Cache-Control": "no-store" } }
   63:       );
   64:     }
   65: 
   66:     console.error("Character Forge reference image error:", error);
   67:     return NextResponse.json(
```

### `app\api\character-generator\projects\[projectId]\reference-sheet\[viewId]\image\route.ts` line 67

```text
   60:       return NextResponse.json(
   61:         { ok: false, error: error.message },
   62:         { status: 400, headers: { "Cache-Control": "no-store" } }
   63:       );
   64:     }
   65: 
   66:     console.error("Character Forge reference image error:", error);
>  67:     return NextResponse.json(
   68:       { ok: false, error: "Failed to read the reference image." },
   69:       { status: 500, headers: { "Cache-Control": "no-store" } }
   70:     );
   71:   }
   72: }
```

### `app\api\character-generator\projects\[projectId]\reference-sheet\route.ts` line 9

```text
    2: 
    3: export const runtime = "nodejs";
    4: export const dynamic = "force-dynamic";
    5: 
    6: const HEADERS = { "Cache-Control": "no-store" };
    7: 
    8: function retiredResponse() {
>   9:   return NextResponse.json(
   10:     {
   11:       ok: false,
   12:       error:
   13:         "Legacy turnaround generation is retired. Use the identity-anchor gate instead.",
   14:     },
   15:     { status: 410, headers: HEADERS }
   16:   );
```

### `app\api\character-generator\projects\[projectId]\route.ts` line 32

```text
   25:   context: CharacterProjectRouteContext
   26: ): Promise<string> {
   27:   const { projectId } = await context.params;
   28:   return decodeURIComponent(projectId);
   29: }
   30: 
   31: function notFound(projectId: string) {
>  32:   return NextResponse.json(
   33:     {
   34:       ok: false,
   35:       error: `Character Forge project not found: ${projectId}.`,
   36:     },
   37:     { status: 404, headers: NO_STORE_HEADERS }
   38:   );
   39: }
```

### `app\api\character-generator\projects\[projectId]\route.ts` line 53

```text
   46:     const projectId = await readProjectId(context);
   47:     const project = await readCharacterProject(projectId);
   48: 
   49:     if (!project) {
   50:       return notFound(projectId);
   51:     }
   52: 
>  53:     return NextResponse.json(
   54:       {
   55:         ok: true,
   56:         project,
   57:       },
   58:       { headers: NO_STORE_HEADERS }
   59:     );
   60:   } catch (error) {
```

### `app\api\character-generator\projects\[projectId]\route.ts` line 62

```text
   55:         ok: true,
   56:         project,
   57:       },
   58:       { headers: NO_STORE_HEADERS }
   59:     );
   60:   } catch (error) {
   61:     if (error instanceof CharacterProjectValidationError || error instanceof URIError) {
>  62:       return NextResponse.json(
   63:         {
   64:           ok: false,
   65:           error: error.message,
   66:         },
   67:         { status: 400, headers: NO_STORE_HEADERS }
   68:       );
   69:     }
```

### `app\api\character-generator\projects\[projectId]\route.ts` line 73

```text
   66:         },
   67:         { status: 400, headers: NO_STORE_HEADERS }
   68:       );
   69:     }
   70: 
   71:     console.error("Character Forge project read error:", error);
   72: 
>  73:     return NextResponse.json(
   74:       {
   75:         ok: false,
   76:         error: "Failed to read Character Forge project.",
   77:       },
   78:       { status: 500, headers: NO_STORE_HEADERS }
   79:     );
   80:   }
```

### `app\api\character-generator\projects\[projectId]\route.ts` line 97

```text
   90:     const input = parseUpdateCharacterProjectRequest(body);
   91:     const project = await updateCharacterProject(projectId, input);
   92: 
   93:     if (!project) {
   94:       return notFound(projectId);
   95:     }
   96: 
>  97:     return NextResponse.json(
   98:       {
   99:         ok: true,
  100:         project,
  101:       },
  102:       { headers: NO_STORE_HEADERS }
  103:     );
  104:   } catch (error) {
```

### `app\api\character-generator\projects\[projectId]\route.ts` line 110

```text
  103:     );
  104:   } catch (error) {
  105:     if (
  106:       error instanceof CharacterProjectValidationError ||
  107:       error instanceof URIError ||
  108:       error instanceof SyntaxError
  109:     ) {
> 110:       return NextResponse.json(
  111:         {
  112:           ok: false,
  113:           error:
  114:             error instanceof SyntaxError
  115:               ? "Request body must contain valid JSON."
  116:               : error.message,
  117:         },
```

### `app\api\character-generator\projects\[projectId]\route.ts` line 123

```text
  116:               : error.message,
  117:         },
  118:         { status: 400, headers: NO_STORE_HEADERS }
  119:       );
  120:     }
  121: 
  122:     if (error instanceof CharacterProjectStateError) {
> 123:       return NextResponse.json(
  124:         {
  125:           ok: false,
  126:           error: error.message,
  127:         },
  128:         { status: 409, headers: NO_STORE_HEADERS }
  129:       );
  130:     }
```

### `app\api\character-generator\projects\[projectId]\route.ts` line 134

```text
  127:         },
  128:         { status: 409, headers: NO_STORE_HEADERS }
  129:       );
  130:     }
  131: 
  132:     console.error("Character Forge project update error:", error);
  133: 
> 134:     return NextResponse.json(
  135:       {
  136:         ok: false,
  137:         error: "Failed to update Character Forge project.",
  138:       },
  139:       { status: 500, headers: NO_STORE_HEADERS }
  140:     );
  141:   }
```

### `app\api\character-generator\projects\route.ts` line 21

```text
   14:   "Cache-Control": "no-store",
   15: };
   16: 
   17: export async function GET() {
   18:   try {
   19:     const projects = await listCharacterProjects();
   20: 
>  21:     return NextResponse.json(
   22:       {
   23:         ok: true,
   24:         count: projects.length,
   25:         projects,
   26:       },
   27:       { headers: NO_STORE_HEADERS }
   28:     );
```

### `app\api\character-generator\projects\route.ts` line 32

```text
   25:         projects,
   26:       },
   27:       { headers: NO_STORE_HEADERS }
   28:     );
   29:   } catch (error) {
   30:     console.error("Character Forge project list error:", error);
   31: 
>  32:     return NextResponse.json(
   33:       {
   34:         ok: false,
   35:         error: "Failed to read Character Forge projects.",
   36:       },
   37:       { status: 500, headers: NO_STORE_HEADERS }
   38:     );
   39:   }
```

### `app\api\character-generator\projects\route.ts` line 48

```text
   41: 
   42: export async function POST(request: Request) {
   43:   try {
   44:     const body = (await request.json()) as unknown;
   45:     const input = parseCreateCharacterProjectRequest(body);
   46:     const project = await createCharacterProject(input);
   47: 
>  48:     return NextResponse.json(
   49:       {
   50:         ok: true,
   51:         project,
   52:       },
   53:       { status: 201, headers: NO_STORE_HEADERS }
   54:     );
   55:   } catch (error) {
```

### `app\api\character-generator\projects\route.ts` line 57

```text
   50:         ok: true,
   51:         project,
   52:       },
   53:       { status: 201, headers: NO_STORE_HEADERS }
   54:     );
   55:   } catch (error) {
   56:     if (error instanceof CharacterProjectValidationError) {
>  57:       return NextResponse.json(
   58:         {
   59:           ok: false,
   60:           error: error.message,
   61:         },
   62:         { status: 400, headers: NO_STORE_HEADERS }
   63:       );
   64:     }
```

### `app\api\character-generator\projects\route.ts` line 67

```text
   60:           error: error.message,
   61:         },
   62:         { status: 400, headers: NO_STORE_HEADERS }
   63:       );
   64:     }
   65: 
   66:     if (error instanceof SyntaxError) {
>  67:       return NextResponse.json(
   68:         {
   69:           ok: false,
   70:           error: "Request body must contain valid JSON.",
   71:         },
   72:         { status: 400, headers: NO_STORE_HEADERS }
   73:       );
   74:     }
```

### `app\api\character-generator\projects\route.ts` line 78

```text
   71:         },
   72:         { status: 400, headers: NO_STORE_HEADERS }
   73:       );
   74:     }
   75: 
   76:     console.error("Character Forge project creation error:", error);
   77: 
>  78:     return NextResponse.json(
   79:       {
   80:         ok: false,
   81:         error: "Failed to create Character Forge project.",
   82:       },
   83:       { status: 500, headers: NO_STORE_HEADERS }
   84:     );
   85:   }
```

### `app\api\chat\route.ts` line 13

```text
    6: export async function POST(req: Request) {
    7:   try {
    8:     const body = await req.json();
    9:     const userMessage = String(body?.message ?? "").trim();
   10:     const sessionId = String(body?.sessionId ?? "").trim();
   11: 
   12:     if (!userMessage) {
>  13:       return NextResponse.json(
   14:         { error: "Message is required." },
   15:         { status: 400 }
   16:       );
   17:     }
   18: 
   19:     const result = await runCommandPipeline(userMessage, sessionId);
   20: 
```

### `app\api\chat\route.ts` line 21

```text
   14:         { error: "Message is required." },
   15:         { status: 400 }
   16:       );
   17:     }
   18: 
   19:     const result = await runCommandPipeline(userMessage, sessionId);
   20: 
>  21:     return NextResponse.json(result.payload);
   22:   } catch (error) {
   23:     console.error("Chat route error:", error);
   24: 
   25:     return NextResponse.json(
   26:       {
   27:         error: "Failed to process directive.",
   28:         details: error instanceof Error ? error.message : String(error),
```

### `app\api\chat\route.ts` line 25

```text
   18: 
   19:     const result = await runCommandPipeline(userMessage, sessionId);
   20: 
   21:     return NextResponse.json(result.payload);
   22:   } catch (error) {
   23:     console.error("Chat route error:", error);
   24: 
>  25:     return NextResponse.json(
   26:       {
   27:         error: "Failed to process directive.",
   28:         details: error instanceof Error ? error.message : String(error),
   29:       },
   30:       { status: 500 }
   31:     );
   32:   }
```

### `app\api\chernobog-inc\execution\checkpoint\route.ts` line 45

```text
   38:     const checkpointId = getRequiredString(body, "checkpointId");
   39:     const action = getOptionalString(body, "action") ?? "approve";
   40:     const notes = getOptionalString(body, "notes");
   41:     const plan = action === "reject"
   42:       ? await rejectControlledExecutionCheckpoint(planId, checkpointId, notes)
   43:       : await approveControlledExecutionCheckpoint(planId, checkpointId, notes);
   44: 
>  45:     return NextResponse.json({ ok: true, plan });
   46:   } catch (error) {
   47:     const message = error instanceof Error ? error.message : "Unknown controlled execution checkpoint error.";
   48:     return NextResponse.json({ ok: false, error: message }, { status: 400 });
   49:   }
   50: }
```

### `app\api\chernobog-inc\execution\checkpoint\route.ts` line 48

```text
   41:     const plan = action === "reject"
   42:       ? await rejectControlledExecutionCheckpoint(planId, checkpointId, notes)
   43:       : await approveControlledExecutionCheckpoint(planId, checkpointId, notes);
   44: 
   45:     return NextResponse.json({ ok: true, plan });
   46:   } catch (error) {
   47:     const message = error instanceof Error ? error.message : "Unknown controlled execution checkpoint error.";
>  48:     return NextResponse.json({ ok: false, error: message }, { status: 400 });
   49:   }
   50: }
```

### `app\api\chernobog-inc\execution\dry-run\route.ts` line 32

```text
   25:     if (!isObject(body)) {
   26:       throw new Error("Request body must be a JSON object.");
   27:     }
   28: 
   29:     const planId = getRequiredString(body, "planId");
   30:     const dryRun = await createControlledExecutionDryRun(planId);
   31: 
>  32:     return NextResponse.json({ ok: true, dryRun });
   33:   } catch (error) {
   34:     const message = error instanceof Error ? error.message : "Unknown controlled execution dry-run error.";
   35:     return NextResponse.json({ ok: false, error: message }, { status: 400 });
   36:   }
   37: }
```

### `app\api\chernobog-inc\execution\dry-run\route.ts` line 35

```text
   28: 
   29:     const planId = getRequiredString(body, "planId");
   30:     const dryRun = await createControlledExecutionDryRun(planId);
   31: 
   32:     return NextResponse.json({ ok: true, dryRun });
   33:   } catch (error) {
   34:     const message = error instanceof Error ? error.message : "Unknown controlled execution dry-run error.";
>  35:     return NextResponse.json({ ok: false, error: message }, { status: 400 });
   36:   }
   37: }
```

### `app\api\chernobog-inc\execution\plans\route.ts` line 61

```text
   54:     departments: getStringArray(body, "departments"),
   55:     createdBy: "ceo",
   56:   };
   57: }
   58: 
   59: export async function GET() {
   60:   const plans = await readControlledExecutionPlans();
>  61:   return NextResponse.json({ ok: true, plans });
   62: }
   63: 
   64: export async function POST(req: Request) {
   65:   try {
   66:     const body = (await req.json()) as unknown;
   67:     const input = parseCreatePlanRequest(body);
   68:     const plan = await createControlledExecutionPlan(input);
```

### `app\api\chernobog-inc\execution\plans\route.ts` line 70

```text
   63: 
   64: export async function POST(req: Request) {
   65:   try {
   66:     const body = (await req.json()) as unknown;
   67:     const input = parseCreatePlanRequest(body);
   68:     const plan = await createControlledExecutionPlan(input);
   69: 
>  70:     return NextResponse.json({ ok: true, plan });
   71:   } catch (error) {
   72:     const message = error instanceof Error ? error.message : "Unknown controlled execution plan error.";
   73:     return NextResponse.json({ ok: false, error: message }, { status: 400 });
   74:   }
   75: }
```

### `app\api\chernobog-inc\execution\plans\route.ts` line 73

```text
   66:     const body = (await req.json()) as unknown;
   67:     const input = parseCreatePlanRequest(body);
   68:     const plan = await createControlledExecutionPlan(input);
   69: 
   70:     return NextResponse.json({ ok: true, plan });
   71:   } catch (error) {
   72:     const message = error instanceof Error ? error.message : "Unknown controlled execution plan error.";
>  73:     return NextResponse.json({ ok: false, error: message }, { status: 400 });
   74:   }
   75: }
```

### `app\api\chernobog-inc\missions\checkpoint\route.ts` line 17

```text
   10:       missionId?: string;
   11:       checkpointId?: string;
   12:       decision?: "approved" | "rejected";
   13:       notes?: string;
   14:     };
   15: 
   16:     if (!body.missionId || !body.checkpointId) {
>  17:       return NextResponse.json(
   18:         { ok: false, error: "missionId and checkpointId are required." },
   19:         { status: 400 }
   20:       );
   21:     }
   22: 
   23:     const mission = body.decision === "rejected"
   24:       ? await rejectChernobogMissionCheckpoint(body.missionId, body.checkpointId, body.notes)
```

### `app\api\chernobog-inc\missions\checkpoint\route.ts` line 27

```text
   20:       );
   21:     }
   22: 
   23:     const mission = body.decision === "rejected"
   24:       ? await rejectChernobogMissionCheckpoint(body.missionId, body.checkpointId, body.notes)
   25:       : await approveChernobogMissionCheckpoint(body.missionId, body.checkpointId, body.notes);
   26: 
>  27:     return NextResponse.json({ ok: true, mission });
   28:   } catch (error) {
   29:     return NextResponse.json(
   30:       { ok: false, error: error instanceof Error ? error.message : "Unknown checkpoint error." },
   31:       { status: 400 }
   32:     );
   33:   }
   34: }
```

### `app\api\chernobog-inc\missions\checkpoint\route.ts` line 29

```text
   22: 
   23:     const mission = body.decision === "rejected"
   24:       ? await rejectChernobogMissionCheckpoint(body.missionId, body.checkpointId, body.notes)
   25:       : await approveChernobogMissionCheckpoint(body.missionId, body.checkpointId, body.notes);
   26: 
   27:     return NextResponse.json({ ok: true, mission });
   28:   } catch (error) {
>  29:     return NextResponse.json(
   30:       { ok: false, error: error instanceof Error ? error.message : "Unknown checkpoint error." },
   31:       { status: 400 }
   32:     );
   33:   }
   34: }
```

### `app\api\chernobog-inc\missions\route.ts` line 11

```text
    4:   getChernobogMissionStoreSnapshot,
    5:   readChernobogMissions,
    6: } from "@/lib/modules/vault-brain/chernobogMissionStore";
    7: import { CreateChernobogMissionInput } from "@/lib/modules/vault-brain/chernobogMissionTypes";
    8: 
    9: export async function GET() {
   10:   const missions = await readChernobogMissions();
>  11:   return NextResponse.json({ ok: true, missions });
   12: }
   13: 
   14: export async function POST(request: NextRequest) {
   15:   try {
   16:     const body = (await request.json()) as Partial<CreateChernobogMissionInput>;
   17:     const mission = await createChernobogMission({
   18:       title: body.title ?? "",
```

### `app\api\chernobog-inc\missions\route.ts` line 29

```text
   22:       departments: body.departments,
   23:       priority: body.priority,
   24:       tags: body.tags,
   25:       createdBy: body.createdBy,
   26:       notes: body.notes,
   27:       sourceRef: body.sourceRef,
   28:     });
>  29:     return NextResponse.json({ ok: true, mission });
   30:   } catch (error) {
   31:     const snapshot = await getChernobogMissionStoreSnapshot();
   32:     return NextResponse.json(
   33:       {
   34:         ok: false,
   35:         error: error instanceof Error ? error.message : "Unknown mission creation error.",
   36:         snapshot,
```

### `app\api\chernobog-inc\missions\route.ts` line 32

```text
   25:       createdBy: body.createdBy,
   26:       notes: body.notes,
   27:       sourceRef: body.sourceRef,
   28:     });
   29:     return NextResponse.json({ ok: true, mission });
   30:   } catch (error) {
   31:     const snapshot = await getChernobogMissionStoreSnapshot();
>  32:     return NextResponse.json(
   33:       {
   34:         ok: false,
   35:         error: error instanceof Error ? error.message : "Unknown mission creation error.",
   36:         snapshot,
   37:       },
   38:       { status: 400 }
   39:     );
```

### `app\api\chernobog-inc\missions\status\route.ts` line 13

```text
    6:     const body = (await request.json()) as {
    7:       missionId?: string;
    8:       status?: string;
    9:       notes?: string;
   10:     };
   11: 
   12:     if (!body.missionId || !body.status) {
>  13:       return NextResponse.json(
   14:         { ok: false, error: "missionId and status are required." },
   15:         { status: 400 }
   16:       );
   17:     }
   18: 
   19:     const mission = await updateChernobogMissionStatus(body.missionId, body.status, body.notes);
   20:     return NextResponse.json({ ok: true, mission });
```

### `app\api\chernobog-inc\missions\status\route.ts` line 20

```text
   13:       return NextResponse.json(
   14:         { ok: false, error: "missionId and status are required." },
   15:         { status: 400 }
   16:       );
   17:     }
   18: 
   19:     const mission = await updateChernobogMissionStatus(body.missionId, body.status, body.notes);
>  20:     return NextResponse.json({ ok: true, mission });
   21:   } catch (error) {
   22:     return NextResponse.json(
   23:       { ok: false, error: error instanceof Error ? error.message : "Unknown mission status error." },
   24:       { status: 400 }
   25:     );
   26:   }
   27: }
```

### `app\api\chernobog-inc\missions\status\route.ts` line 22

```text
   15:         { status: 400 }
   16:       );
   17:     }
   18: 
   19:     const mission = await updateChernobogMissionStatus(body.missionId, body.status, body.notes);
   20:     return NextResponse.json({ ok: true, mission });
   21:   } catch (error) {
>  22:     return NextResponse.json(
   23:       { ok: false, error: error instanceof Error ? error.message : "Unknown mission status error." },
   24:       { status: 400 }
   25:     );
   26:   }
   27: }
```

### `app\api\chernobog-inc\personal-intelligence\route.ts` line 24

```text
   17:   const value = body[key];
   18:   return typeof value === "string" && value.trim().length > 0
   19:     ? value.trim()
   20:     : undefined;
   21: }
   22: 
   23: export async function GET() {
>  24:   return NextResponse.json({
   25:     ok: true,
   26:     system: getV6PersonalIntelligenceSystemStatus(),
   27:   });
   28: }
   29: 
   30: export async function POST(req: Request) {
   31:   try {
```

### `app\api\chernobog-inc\personal-intelligence\route.ts` line 49

```text
   42:     const packet = createV6OperatingPacket({
   43:       request,
   44:       projectId: getOptionalString(body, "projectId"),
   45:       version: getOptionalString(body, "version"),
   46:       createdBy: "ceo",
   47:     });
   48: 
>  49:     return NextResponse.json({
   50:       ok: packet.governanceDecision.status !== "blocked",
   51:       packet,
   52:     });
   53:   } catch (error) {
   54:     const message =
   55:       error instanceof Error ? error.message : "Unknown V6 personal intelligence error.";
   56: 
```

### `app\api\chernobog-inc\personal-intelligence\route.ts` line 57

```text
   50:       ok: packet.governanceDecision.status !== "blocked",
   51:       packet,
   52:     });
   53:   } catch (error) {
   54:     const message =
   55:       error instanceof Error ? error.message : "Unknown V6 personal intelligence error.";
   56: 
>  57:     return NextResponse.json(
   58:       {
   59:         ok: false,
   60:         error: message,
   61:       },
   62:       { status: 400 }
   63:     );
   64:   }
```

### `app\api\chernobog-inc\proposals\route.ts` line 24

```text
   17:   return Array.isArray(value)
   18:     ? value.filter((item): item is string => typeof item === "string")
   19:     : undefined;
   20: }
   21: 
   22: export async function GET() {
   23:   const proposals = await listChernobogIncWorkProposals();
>  24:   return NextResponse.json({ ok: true, proposals });
   25: }
   26: 
   27: export async function POST(request: Request) {
   28:   const body: unknown = await request.json();
   29:   if (!isRecord(body)) {
   30:     return NextResponse.json(
   31:       { ok: false, error: "Expected a JSON object body." },
```

### `app\api\chernobog-inc\proposals\route.ts` line 30

```text
   23:   const proposals = await listChernobogIncWorkProposals();
   24:   return NextResponse.json({ ok: true, proposals });
   25: }
   26: 
   27: export async function POST(request: Request) {
   28:   const body: unknown = await request.json();
   29:   if (!isRecord(body)) {
>  30:     return NextResponse.json(
   31:       { ok: false, error: "Expected a JSON object body." },
   32:       { status: 400 }
   33:     );
   34:   }
   35: 
   36:   const title = readString(body.title);
   37:   const description = readString(body.description);
```

### `app\api\chernobog-inc\proposals\route.ts` line 39

```text
   32:       { status: 400 }
   33:     );
   34:   }
   35: 
   36:   const title = readString(body.title);
   37:   const description = readString(body.description);
   38:   if (!title || !description) {
>  39:     return NextResponse.json(
   40:       { ok: false, error: "title and description are required." },
   41:       { status: 400 }
   42:     );
   43:   }
   44: 
   45:   const proposal = await createChernobogIncWorkProposal({
   46:     title,
```

### `app\api\chernobog-inc\proposals\route.ts` line 55

```text
   48:     requestedBy: readString(body.requestedBy),
   49:     departmentIds: readStringArray(body.departmentIds) as ChernobogIncDepartmentId[] | undefined,
   50:     projectId: readString(body.projectId),
   51:     version: readString(body.version),
   52:     tags: readStringArray(body.tags),
   53:   });
   54: 
>  55:   return NextResponse.json({ ok: true, proposal });
   56: }
```

### `app\api\chernobog-inc\readiness\route.ts` line 23

```text
   16: 
   17: function shouldPersist(body: unknown): boolean {
   18:   return isObject(body) && body.persist === true;
   19: }
   20: 
   21: export async function GET() {
   22:   const report = generateV6ReadinessReport();
>  23:   return NextResponse.json({
   24:     ok: report.ok,
   25:     report,
   26:   });
   27: }
   28: 
   29: export async function POST(req: Request) {
   30:   const body = (await req.json().catch(() => undefined)) as unknown;
```

### `app\api\chernobog-inc\readiness\route.ts` line 36

```text
   29: export async function POST(req: Request) {
   30:   const body = (await req.json().catch(() => undefined)) as unknown;
   31:   const report = generateV6ReadinessReport();
   32:   const writtenPath = shouldPersist(body)
   33:     ? writeV6ReadinessReportFile(report)
   34:     : undefined;
   35: 
>  36:   return NextResponse.json({
   37:     ok: report.ok,
   38:     report,
   39:     markdown: formatV6ReadinessReport(report),
   40:     writtenPath,
   41:   });
   42: }
```

### `app\api\chernobog-inc\structure\route.ts` line 5

```text
    1: import { NextResponse } from "next/server";
    2: import { getChernobogIncFoundation } from "@/lib/modules/vault-brain/chernobogIncFoundation";
    3: 
    4: export async function GET() {
>   5:   return NextResponse.json({
    6:     ok: true,
    7:     foundation: getChernobogIncFoundation(),
    8:   });
    9: }
```

### `app\api\cognition\route.ts` line 19

```text
   12:   try {
   13:     const cognition =
   14:       await getChernobogCognitiveRuntime();
   15: 
   16:     const cycle =
   17:       await cognition.evaluate();
   18: 
>  19:     return NextResponse.json({
   20:       ok: true,
   21:       cycle,
   22:       snapshot:
   23:         cognition.snapshot(),
   24:       executionBoundary: {
   25:         executesTools: false,
   26:         defaultGovernance:
```

### `app\api\cognition\route.ts` line 31

```text
   24:       executionBoundary: {
   25:         executesTools: false,
   26:         defaultGovernance:
   27:           "advisory-only",
   28:       },
   29:     });
   30:   } catch (error) {
>  31:     return NextResponse.json(
   32:       {
   33:         ok: false,
   34:         error:
   35:           "cognitive_runtime_failed",
   36:         message:
   37:           error instanceof Error
   38:             ? error.message
```

### `app\api\content-ingest\action\route.ts` line 16

```text
    9:     const body = (await request.json()) as {
   10:       command?: unknown;
   11:     };
   12: 
   13:     const command = typeof body.command === "string" ? body.command : "";
   14:     const result = await runContentIngestUiAction(command);
   15: 
>  16:     return NextResponse.json(result, {
   17:       status: result.ok ? 200 : 400,
   18:     });
   19:   } catch (error) {
   20:     return NextResponse.json(
   21:       {
   22:         ok: false,
   23:         title: "Dashboard command failed",
```

### `app\api\content-ingest\action\route.ts` line 20

```text
   13:     const command = typeof body.command === "string" ? body.command : "";
   14:     const result = await runContentIngestUiAction(command);
   15: 
   16:     return NextResponse.json(result, {
   17:       status: result.ok ? 200 : 400,
   18:     });
   19:   } catch (error) {
>  20:     return NextResponse.json(
   21:       {
   22:         ok: false,
   23:         title: "Dashboard command failed",
   24:         message: error instanceof Error ? error.message : String(error),
   25:       },
   26:       {
   27:         status: 500,
```

### `app\api\content-ingest\dashboard\route.ts` line 11

```text
    4:   getSavedContentDashboardData,
    5: } from "@/lib/modules/content-ingest-ui";
    6: 
    7: export async function GET() {
    8:   try {
    9:     const data = await getSavedContentDashboardData();
   10: 
>  11:     return NextResponse.json(data);
   12:   } catch (error) {
   13:     return NextResponse.json(
   14:       {
   15:         ok: false,
   16:         error: "Failed to load saved-content dashboard data.",
   17:         details: error instanceof Error ? error.message : String(error),
   18:       },
```

### `app\api\content-ingest\dashboard\route.ts` line 13

```text
    6: 
    7: export async function GET() {
    8:   try {
    9:     const data = await getSavedContentDashboardData();
   10: 
   11:     return NextResponse.json(data);
   12:   } catch (error) {
>  13:     return NextResponse.json(
   14:       {
   15:         ok: false,
   16:         error: "Failed to load saved-content dashboard data.",
   17:         details: error instanceof Error ? error.message : String(error),
   18:       },
   19:       {
   20:         status: 500,
```

### `app\api\content-ingest\dashboard-action\route.ts` line 12

```text
    5: } from "@/lib/modules/content-ingest-ui";
    6: 
    7: export async function POST(request: NextRequest) {
    8:   try {
    9:     const body = await request.json();
   10:     const result = await runDashboardAction(body);
   11: 
>  12:     return NextResponse.json(result, {
   13:       status: result.ok ? 200 : 400,
   14:     });
   15:   } catch (error) {
   16:     return NextResponse.json(
   17:       {
   18:         ok: false,
   19:         title: "Dashboard action failed",
```

### `app\api\content-ingest\dashboard-action\route.ts` line 16

```text
    9:     const body = await request.json();
   10:     const result = await runDashboardAction(body);
   11: 
   12:     return NextResponse.json(result, {
   13:       status: result.ok ? 200 : 400,
   14:     });
   15:   } catch (error) {
>  16:     return NextResponse.json(
   17:       {
   18:         ok: false,
   19:         title: "Dashboard action failed",
   20:         message: error instanceof Error ? error.message : String(error),
   21:       },
   22:       {
   23:         status: 500,
```

### `app\api\content-watch\action\route.ts` line 12

```text
    5: } from "@/lib/modules/content-watch";
    6: 
    7: export async function POST(request: NextRequest) {
    8:   try {
    9:     const body = await request.json();
   10:     const result = await runWatchAction(body);
   11: 
>  12:     return NextResponse.json(result, {
   13:       status: result.ok ? 200 : 400,
   14:     });
   15:   } catch (error) {
   16:     return NextResponse.json(
   17:       {
   18:         ok: false,
   19:         title: "Watch action failed",
```

### `app\api\content-watch\action\route.ts` line 16

```text
    9:     const body = await request.json();
   10:     const result = await runWatchAction(body);
   11: 
   12:     return NextResponse.json(result, {
   13:       status: result.ok ? 200 : 400,
   14:     });
   15:   } catch (error) {
>  16:     return NextResponse.json(
   17:       {
   18:         ok: false,
   19:         title: "Watch action failed",
   20:         message: error instanceof Error ? error.message : String(error),
   21:       },
   22:       {
   23:         status: 500,
```

### `app\api\content-watch\session\route.ts` line 13

```text
    6: } from "@/lib/modules/content-watch";
    7: 
    8: export async function GET(request: NextRequest) {
    9:   try {
   10:     const sessionId = request.nextUrl.searchParams.get("sessionId") ?? undefined;
   11:     const view = await getWatchSessionView(sessionId);
   12: 
>  13:     return NextResponse.json(view);
   14:   } catch (error) {
   15:     return NextResponse.json(
   16:       {
   17:         ok: false,
   18:         title: "Failed to load watch session",
   19:         message: error instanceof Error ? error.message : String(error),
   20:       },
```

### `app\api\content-watch\session\route.ts` line 15

```text
    8: export async function GET(request: NextRequest) {
    9:   try {
   10:     const sessionId = request.nextUrl.searchParams.get("sessionId") ?? undefined;
   11:     const view = await getWatchSessionView(sessionId);
   12: 
   13:     return NextResponse.json(view);
   14:   } catch (error) {
>  15:     return NextResponse.json(
   16:       {
   17:         ok: false,
   18:         title: "Failed to load watch session",
   19:         message: error instanceof Error ? error.message : String(error),
   20:       },
   21:       {
   22:         status: 500,
```

### `app\api\content-watch\session\route.ts` line 33

```text
   26: }
   27: 
   28: export async function POST(request: NextRequest) {
   29:   try {
   30:     const body = await request.json();
   31:     const view = await createWatchSession(body);
   32: 
>  33:     return NextResponse.json(view);
   34:   } catch (error) {
   35:     return NextResponse.json(
   36:       {
   37:         ok: false,
   38:         title: "Failed to create watch session",
   39:         message: error instanceof Error ? error.message : String(error),
   40:       },
```

### `app\api\content-watch\session\route.ts` line 35

```text
   28: export async function POST(request: NextRequest) {
   29:   try {
   30:     const body = await request.json();
   31:     const view = await createWatchSession(body);
   32: 
   33:     return NextResponse.json(view);
   34:   } catch (error) {
>  35:     return NextResponse.json(
   36:       {
   37:         ok: false,
   38:         title: "Failed to create watch session",
   39:         message: error instanceof Error ? error.message : String(error),
   40:       },
   41:       {
   42:         status: 500,
```

### `app\api\debug\command-language\route.ts` line 11

```text
    4: export const runtime = "nodejs";
    5: 
    6: export async function GET(req: Request) {
    7:   const url = new URL(req.url);
    8:   const message = url.searchParams.get("message") ?? "";
    9: 
   10:   if (!message.trim()) {
>  11:     return NextResponse.json(
   12:       {
   13:         error: "message query parameter is required.",
   14:       },
   15:       { status: 400 }
   16:     );
   17:   }
   18: 
```

### `app\api\debug\command-language\route.ts` line 21

```text
   14:       },
   15:       { status: 400 }
   16:     );
   17:   }
   18: 
   19:   const command = parseUnifiedCommand(message);
   20: 
>  21:   return NextResponse.json({
   22:     command,
   23:   });
   24: }
```

### `app\api\debug\memory\route.ts` line 28

```text
   21:     const memoryContext = buildMemoryContext({
   22:     session,
   23:     persistedMemories,
   24:     recentMessages,
   25:     userMessage: query,
   26:     });
   27: 
>  28:   return NextResponse.json({
   29:     sessionId,
   30:     memoryContext,
   31:   });
   32: }
```

### `app\api\debug\state\route.ts` line 58

```text
   51:       success: Boolean(toolCall.success),
   52:       created_at: toolCall.created_at,
   53:       input: safeJsonParse(input),
   54:       output: safeJsonParse(output),
   55:     };
   56:   });
   57: 
>  58:   return NextResponse.json({
   59:     messages,
   60:     memories,
   61:     toolCalls,
   62:   });
   63: }
```

### `app\api\debug\traces\route.ts` line 18

```text
   11:   const url = new URL(req.url);
   12:   const id = url.searchParams.get("id");
   13: 
   14:   if (id) {
   15:     const trace = getTrustTraceById(id);
   16: 
   17:     if (!trace) {
>  18:       return NextResponse.json(
   19:         {
   20:           error: "Trace not found.",
   21:         },
   22:         { status: 404 }
   23:       );
   24:     }
   25: 
```

### `app\api\debug\traces\route.ts` line 26

```text
   19:         {
   20:           error: "Trace not found.",
   21:         },
   22:         { status: 404 }
   23:       );
   24:     }
   25: 
>  26:     return NextResponse.json({
   27:       trace,
   28:     });
   29:   }
   30: 
   31:   const traces = getTrustTraces(25);
   32: 
   33:   return NextResponse.json({
```

### `app\api\debug\traces\route.ts` line 33

```text
   26:     return NextResponse.json({
   27:       trace,
   28:     });
   29:   }
   30: 
   31:   const traces = getTrustTraces(25);
   32: 
>  33:   return NextResponse.json({
   34:     traces,
   35:   });
   36: }
   37: 
   38: export async function DELETE() {
   39:   const deletedCount = clearTrustTraces();
   40: 
```

### `app\api\debug\traces\route.ts` line 41

```text
   34:     traces,
   35:   });
   36: }
   37: 
   38: export async function DELETE() {
   39:   const deletedCount = clearTrustTraces();
   40: 
>  41:   return NextResponse.json({
   42:     deletedCount,
   43:   });
   44: }
```

### `app\api\discord\vault-pr\[prId]\apply\route.ts` line 20

```text
   13: };
   14: 
   15: export async function POST(request: Request, context: RouteContext) {
   16:   const { prId } = await context.params;
   17:   const body = (await request.json()) as ApplyRequestBody;
   18: 
   19:   if (body.confirm !== "apply-approved") {
>  20:     return NextResponse.json(
   21:       {
   22:         ok: false,
   23:         error:
   24:           "Apply confirmation missing. Send { confirm: \"apply-approved\" }.",
   25:       },
   26:       {
   27:         status: 400,
```

### `app\api\discord\vault-pr\[prId]\apply\route.ts` line 38

```text
   31:       }
   32:     );
   33:   }
   34: 
   35:   try {
   36:     const report = await applyApprovedVaultPullRequest(decodeURIComponent(prId));
   37: 
>  38:     return NextResponse.json(
   39:       {
   40:         ok: true,
   41:         report,
   42:       },
   43:       {
   44:         headers: {
   45:           "Cache-Control": "no-store",
```

### `app\api\discord\vault-pr\[prId]\apply\route.ts` line 55

```text
   48:     );
   49:   } catch (error) {
   50:     const message =
   51:       error instanceof Error
   52:         ? error.message
   53:         : "Unknown vault pull request apply error.";
   54: 
>  55:     return NextResponse.json(
   56:       {
   57:         ok: false,
   58:         error: message,
   59:       },
   60:       {
   61:         status: 400,
   62:         headers: {
```

### `app\api\discord\vault-pr\[prId]\bulk\route.ts` line 46

```text
   39: }
   40: 
   41: export async function PATCH(request: Request, context: RouteContext) {
   42:   const { prId } = await context.params;
   43:   const body = (await request.json()) as BulkStatusRequestBody;
   44: 
   45:   if (!isValidStatus(body.status)) {
>  46:     return NextResponse.json(
   47:       {
   48:         ok: false,
   49:         error: "Invalid change status.",
   50:       },
   51:       { status: 400 }
   52:     );
   53:   }
```

### `app\api\discord\vault-pr\[prId]\bulk\route.ts` line 64

```text
   57:   if (body.all === true) {
   58:     const pullRequest = setAllVaultPullRequestChangeStatuses({
   59:       pullRequestId,
   60:       status: body.status,
   61:     });
   62: 
   63:     if (!pullRequest) {
>  64:       return NextResponse.json(
   65:         {
   66:           ok: false,
   67:           error: "Vault pull request was not found or is locked.",
   68:         },
   69:         { status: 404 }
   70:       );
   71:     }
```

### `app\api\discord\vault-pr\[prId]\bulk\route.ts` line 73

```text
   66:           ok: false,
   67:           error: "Vault pull request was not found or is locked.",
   68:         },
   69:         { status: 404 }
   70:       );
   71:     }
   72: 
>  73:     return NextResponse.json({
   74:       ok: true,
   75:       pullRequest,
   76:     });
   77:   }
   78: 
   79:   const changeIds = parseChangeIds(body.changeIds);
   80: 
```

### `app\api\discord\vault-pr\[prId]\bulk\route.ts` line 82

```text
   75:       pullRequest,
   76:     });
   77:   }
   78: 
   79:   const changeIds = parseChangeIds(body.changeIds);
   80: 
   81:   if (!changeIds || changeIds.length === 0) {
>  82:     return NextResponse.json(
   83:       {
   84:         ok: false,
   85:         error: "Provide changeIds or set all to true.",
   86:       },
   87:       { status: 400 }
   88:     );
   89:   }
```

### `app\api\discord\vault-pr\[prId]\bulk\route.ts` line 98

```text
   91:   const pullRequest = setVaultPullRequestManyChangeStatuses({
   92:     pullRequestId,
   93:     changeIds,
   94:     status: body.status,
   95:   });
   96: 
   97:   if (!pullRequest) {
>  98:     return NextResponse.json(
   99:       {
  100:         ok: false,
  101:         error: "Vault pull request was not found or is locked.",
  102:       },
  103:       { status: 404 }
  104:     );
  105:   }
```

### `app\api\discord\vault-pr\[prId]\bulk\route.ts` line 107

```text
  100:         ok: false,
  101:         error: "Vault pull request was not found or is locked.",
  102:       },
  103:       { status: 404 }
  104:     );
  105:   }
  106: 
> 107:   return NextResponse.json({
  108:     ok: true,
  109:     pullRequest,
  110:   });
  111: }
```

### `app\api\discord\vault-pr\[prId]\changes\[changeId]\route.ts` line 32

```text
   25: }
   26: 
   27: export async function PATCH(request: Request, context: RouteContext) {
   28:   const { prId, changeId } = await context.params;
   29:   const body = (await request.json()) as ChangeStatusRequestBody;
   30: 
   31:   if (!isValidStatus(body.status)) {
>  32:     return NextResponse.json(
   33:       {
   34:         ok: false,
   35:         error: "Invalid change status.",
   36:       },
   37:       { status: 400 }
   38:     );
   39:   }
```

### `app\api\discord\vault-pr\[prId]\changes\[changeId]\route.ts` line 48

```text
   41:   const pullRequest = setVaultPullRequestChangeStatus({
   42:     pullRequestId: decodeURIComponent(prId),
   43:     changeId: decodeURIComponent(changeId),
   44:     status: body.status,
   45:   });
   46: 
   47:   if (!pullRequest) {
>  48:     return NextResponse.json(
   49:       {
   50:         ok: false,
   51:         error: "Vault pull request or change was not found, or the pull request is locked.",
   52:       },
   53:       { status: 404 }
   54:     );
   55:   }
```

### `app\api\discord\vault-pr\[prId]\changes\[changeId]\route.ts` line 57

```text
   50:         ok: false,
   51:         error: "Vault pull request or change was not found, or the pull request is locked.",
   52:       },
   53:       { status: 404 }
   54:     );
   55:   }
   56: 
>  57:   return NextResponse.json({
   58:     ok: true,
   59:     pullRequest,
   60:   });
   61: }
```

### `app\api\discord\vault-pr\[prId]\route.ts` line 16

```text
    9: };
   10: 
   11: export async function GET(_request: Request, context: RouteContext) {
   12:   const { prId } = await context.params;
   13:   const pullRequest = getVaultPullRequestById(decodeURIComponent(prId));
   14: 
   15:   if (!pullRequest) {
>  16:     return NextResponse.json(
   17:       {
   18:         ok: false,
   19:         error: "Vault pull request not found.",
   20:       },
   21:       {
   22:         status: 404,
   23:         headers: {
```

### `app\api\discord\vault-pr\[prId]\route.ts` line 30

```text
   23:         headers: {
   24:           "Cache-Control": "no-store",
   25:         },
   26:       }
   27:     );
   28:   }
   29: 
>  30:   return NextResponse.json(
   31:     {
   32:       ok: true,
   33:       pullRequest,
   34:     },
   35:     {
   36:       headers: {
   37:         "Cache-Control": "no-store",
```

### `app\api\discovery\itch\adult-preferences\route.ts` line 14

```text
    7: export const runtime = "nodejs";
    8: 
    9: export async function GET() {
   10:   const database = getItchDiscoveryDatabase();
   11:   bootstrapItchDiscovery(database);
   12:   const profiles = new ItchAdultPreferenceProfileRepository(database).listProfiles();
   13: 
>  14:   return NextResponse.json({
   15:     profiles,
   16:     defaultProfileId: profiles.find((profile) => profile.isDefault)?.id ?? null,
   17:   });
   18: }
```

### `app\api\discovery\itch\adult-settings\route.ts` line 14

```text
    7: 
    8: export const runtime = "nodejs";
    9: export const dynamic = "force-dynamic";
   10: 
   11: export async function GET() {
   12:   try {
   13:     const db = getItchDiscoveryDatabase(); bootstrapItchDiscovery(db);
>  14:     return NextResponse.json({ settings: new ItchAdultSettingsRepository(db).ensureDefault() });
   15:   } catch (error) { const failure = toItchApiFailure(error); return NextResponse.json(failure.body, apiFailureResponseInit(failure)); }
   16: }
   17: 
   18: export async function PATCH(request: Request) {
   19:   try {
   20:     guardItchMutationRequest(request, "adult-settings:patch", { limit: 60, windowMs: 60000 });
   21:     const body = await readJsonObject(request);
```

### `app\api\discovery\itch\adult-settings\route.ts` line 15

```text
    8: export const runtime = "nodejs";
    9: export const dynamic = "force-dynamic";
   10: 
   11: export async function GET() {
   12:   try {
   13:     const db = getItchDiscoveryDatabase(); bootstrapItchDiscovery(db);
   14:     return NextResponse.json({ settings: new ItchAdultSettingsRepository(db).ensureDefault() });
>  15:   } catch (error) { const failure = toItchApiFailure(error); return NextResponse.json(failure.body, apiFailureResponseInit(failure)); }
   16: }
   17: 
   18: export async function PATCH(request: Request) {
   19:   try {
   20:     guardItchMutationRequest(request, "adult-settings:patch", { limit: 60, windowMs: 60000 });
   21:     const body = await readJsonObject(request);
   22:     const repository = new ItchAdultSettingsRepository(getItchDiscoveryDatabase());
```

### `app\api\discovery\itch\adult-settings\route.ts` line 32

```text
   25:       adultOnly: optionalBoolean(body.adultOnly, "adultOnly"),
   26:       ageGateRequired: optionalBoolean(body.ageGateRequired, "ageGateRequired"),
   27:       blurCoversByDefault: optionalBoolean(body.blurCoversByDefault, "blurCoversByDefault"),
   28:       discreetNotifications: optionalBoolean(body.discreetNotifications, "discreetNotifications"),
   29:       hideExplicitTitles: optionalBoolean(body.hideExplicitTitles, "hideExplicitTitles"),
   30:       blockUnknownAgeContent: optionalBoolean(body.blockUnknownAgeContent, "blockUnknownAgeContent"),
   31:     });
>  32:     return NextResponse.json({ settings });
   33:   } catch (error) { const failure = toItchApiFailure(error); return NextResponse.json(failure.body, apiFailureResponseInit(failure)); }
   34: }
```

### `app\api\discovery\itch\adult-settings\route.ts` line 33

```text
   26:       ageGateRequired: optionalBoolean(body.ageGateRequired, "ageGateRequired"),
   27:       blurCoversByDefault: optionalBoolean(body.blurCoversByDefault, "blurCoversByDefault"),
   28:       discreetNotifications: optionalBoolean(body.discreetNotifications, "discreetNotifications"),
   29:       hideExplicitTitles: optionalBoolean(body.hideExplicitTitles, "hideExplicitTitles"),
   30:       blockUnknownAgeContent: optionalBoolean(body.blockUnknownAgeContent, "blockUnknownAgeContent"),
   31:     });
   32:     return NextResponse.json({ settings });
>  33:   } catch (error) { const failure = toItchApiFailure(error); return NextResponse.json(failure.body, apiFailureResponseInit(failure)); }
   34: }
```

### `app\api\discovery\itch\catalogue\route.ts` line 30

```text
   23: 
   24: export async function GET(request: Request) {
   25:   try {
   26:     const url = new URL(request.url);
   27:     const database = getItchDiscoveryDatabase();
   28:     bootstrapItchDiscovery(database);
   29: 
>  30:     return NextResponse.json(
   31:       executeItchFilterPreset(database, {
   32:         presetId: url.searchParams.get("presetId") ?? undefined,
   33:         presetName: url.searchParams.get("presetName") ?? undefined,
   34:         profileId: url.searchParams.get("profileId") ?? undefined,
   35:         limit: parseQueryInteger(url.searchParams.get("limit"), "limit", 1, 200),
   36:         offset: parseQueryInteger(url.searchParams.get("offset"), "offset", 0, 100_000),
   37:       }),
```

### `app\api\discovery\itch\catalogue\route.ts` line 41

```text
   34:         profileId: url.searchParams.get("profileId") ?? undefined,
   35:         limit: parseQueryInteger(url.searchParams.get("limit"), "limit", 1, 200),
   36:         offset: parseQueryInteger(url.searchParams.get("offset"), "offset", 0, 100_000),
   37:       }),
   38:     );
   39:   } catch (error) {
   40:     const failure = toItchApiFailure(error);
>  41:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   42:   }
   43: }
   44: 
   45: export async function POST(request: Request) {
   46:   try {
   47:     guardItchMutationRequest(request, "catalogue:post", { limit: 90, windowMs: 60000 });
   48:     const body = await readJsonObject(request);
```

### `app\api\discovery\itch\catalogue\route.ts` line 52

```text
   45: export async function POST(request: Request) {
   46:   try {
   47:     guardItchMutationRequest(request, "catalogue:post", { limit: 90, windowMs: 60000 });
   48:     const body = await readJsonObject(request);
   49:     const database = getItchDiscoveryDatabase();
   50:     bootstrapItchDiscovery(database);
   51: 
>  52:     return NextResponse.json(
   53:       executeItchFilter(database, {
   54:         rules: requireObjectArray(body.rules, "rules") as unknown as ItchFilterRule[],
   55:         sort: requireObjectArray(body.sort ?? [], "sort") as unknown as ItchFilterSort[],
   56:         profileId: optionalString(body.profileId, "profileId", { maximumLength: 200 }),
   57:         limit: optionalInteger(body.limit, "limit", { minimum: 1, maximum: 200 }),
   58:         offset: optionalInteger(body.offset, "offset", { minimum: 0, maximum: 100_000 }),
   59:         now: optionalString(body.now, "now", { maximumLength: 40 }),
```

### `app\api\discovery\itch\catalogue\route.ts` line 64

```text
   57:         limit: optionalInteger(body.limit, "limit", { minimum: 1, maximum: 200 }),
   58:         offset: optionalInteger(body.offset, "offset", { minimum: 0, maximum: 100_000 }),
   59:         now: optionalString(body.now, "now", { maximumLength: 40 }),
   60:       }),
   61:     );
   62:   } catch (error) {
   63:     const failure = toItchApiFailure(error);
>  64:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   65:   }
   66: }
   67: 
   68: function parseQueryInteger(
   69:   value: string | null,
   70:   field: string,
   71:   minimum: number,
```

### `app\api\discovery\itch\command\route.ts` line 18

```text
   11: export async function POST(request: Request) {
   12:   try {
   13:     guardItchMutationRequest(request, "command:post", { limit: 60, windowMs: 60000 });
   14:     const body = await readJsonObject(request);
   15:     const result = await tryHandleItchDiscoveryCommand(
   16:       requiredString(body.message, "message"),
   17:     );
>  18:     return NextResponse.json(result, {
   19:       status: result.handled && !result.ok ? 400 : 200,
   20:     });
   21:   } catch (error) {
   22:     const failure = toItchApiFailure(error);
   23:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   24:   }
   25: }
```

### `app\api\discovery\itch\command\route.ts` line 23

```text
   16:       requiredString(body.message, "message"),
   17:     );
   18:     return NextResponse.json(result, {
   19:       status: result.handled && !result.ok ? 400 : 200,
   20:     });
   21:   } catch (error) {
   22:     const failure = toItchApiFailure(error);
>  23:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   24:   }
   25: }
```

### `app\api\discovery\itch\feed\route.ts` line 18

```text
   11:   try {
   12:     const url = new URL(request.url);
   13:     const state = url.searchParams.get("state") ?? "unseen";
   14:     if (!ITCH_RECOMMENDATION_STATES.includes(state as ItchRecommendationState)) {
   15:       throw new TypeError(`Unsupported recommendation state: ${state}`);
   16:     }
   17: 
>  18:     return NextResponse.json(
   19:       getItchRecommendationFeed({
   20:         profileId: url.searchParams.get("profileId") ?? undefined,
   21:         state: state as ItchRecommendationState,
   22:         limit: parseQueryInteger(url.searchParams.get("limit"), "limit", 1, 100),
   23:         offset: parseQueryInteger(url.searchParams.get("offset"), "offset", 0, 100000),
   24:       }),
   25:     );
```

### `app\api\discovery\itch\feed\route.ts` line 28

```text
   21:         state: state as ItchRecommendationState,
   22:         limit: parseQueryInteger(url.searchParams.get("limit"), "limit", 1, 100),
   23:         offset: parseQueryInteger(url.searchParams.get("offset"), "offset", 0, 100000),
   24:       }),
   25:     );
   26:   } catch (error) {
   27:     const failure = toItchApiFailure(error);
>  28:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   29:   }
   30: }
   31: 
   32: function parseQueryInteger(value: string | null, field: string, minimum: number, maximum: number): number | undefined {
   33:   if (value === null || value === "") return undefined;
   34:   const parsed = Number(value);
   35:   if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
```

### `app\api\discovery\itch\feedback\route.ts` line 40

```text
   33:     bootstrapItchDiscovery(database);
   34:     const url = new URL(request.url);
   35:     const preferences = new ItchPreferenceRepository(database);
   36:     const profile = url.searchParams.get("profileId")
   37:       ? preferences.findProfileById(url.searchParams.get("profileId")!)
   38:       : preferences.findProfileByName("Default") ?? preferences.ensureDefaultProfile();
   39:     if (!profile) {
>  40:       return NextResponse.json(
   41:         { error: "Preference profile not found.", code: "GAME_RADAR_NOT_FOUND" },
   42:         { status: 404 },
   43:       );
   44:     }
   45:     const rawStatus = url.searchParams.get("status") as
   46:       | ItchFeedbackCandidateStatus
   47:       | null;
```

### `app\api\discovery\itch\feedback\route.ts` line 52

```text
   45:     const rawStatus = url.searchParams.get("status") as
   46:       | ItchFeedbackCandidateStatus
   47:       | null;
   48:     if (rawStatus && !ITCH_FEEDBACK_CANDIDATE_STATUSES.includes(rawStatus)) {
   49:       throw new TypeError(`Unsupported feedback candidate status: ${rawStatus}`);
   50:     }
   51:     const feedback = new ItchFeedbackRepository(database);
>  52:     return NextResponse.json({
   53:       profile,
   54:       candidates: feedback.listCandidates(profile.id, rawStatus ?? undefined),
   55:       appliedSignals: feedback.countAppliedSignals(profile.id),
   56:     });
   57:   } catch (error) {
   58:     const failure = toItchApiFailure(error);
   59:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
```

### `app\api\discovery\itch\feedback\route.ts` line 59

```text
   52:     return NextResponse.json({
   53:       profile,
   54:       candidates: feedback.listCandidates(profile.id, rawStatus ?? undefined),
   55:       appliedSignals: feedback.countAppliedSignals(profile.id),
   56:     });
   57:   } catch (error) {
   58:     const failure = toItchApiFailure(error);
>  59:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   60:   }
   61: }
   62: 
   63: export async function POST(request: Request) {
   64:   try {
   65:     guardItchMutationRequest(request, "feedback:post", { limit: 90, windowMs: 60000 });
   66:     const body = await readJsonObject(request);
```

### `app\api\discovery\itch\feedback\route.ts` line 72

```text
   65:     guardItchMutationRequest(request, "feedback:post", { limit: 90, windowMs: 60000 });
   66:     const body = await readJsonObject(request);
   67:     const action = optionalString(body.action, "action") ?? "signal";
   68:     if (action === "learn") {
   69:       const result = applyItchFeedbackLearning({
   70:         profileId: optionalString(body.profileId, "profileId"),
   71:       });
>  72:       return NextResponse.json(result);
   73:     }
   74:     if (action !== "signal") {
   75:       throw new TypeError(`Unsupported feedback action: ${action}`);
   76:     }
   77:     const signalType = requiredString(body.signalType, "signalType");
   78:     if (signalType !== "more_like_this" && signalType !== "less_like_this") {
   79:       throw new TypeError(
```

### `app\api\discovery\itch\feedback\route.ts` line 94

```text
   87:         "recommendationId",
   88:       ),
   89:       profileId: optionalString(body.profileId, "profileId"),
   90:       signalType,
   91:       signalValue: optionalFiniteNumber(body.signalValue, "signalValue"),
   92:       metadata: isRecord(body.metadata) ? body.metadata : undefined,
   93:     });
>  94:     return NextResponse.json(result, { status: result.signalCreated ? 201 : 200 });
   95:   } catch (error) {
   96:     const failure = toItchApiFailure(error);
   97:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   98:   }
   99: }
  100: 
  101: export async function PATCH(request: Request) {
```

### `app\api\discovery\itch\feedback\route.ts` line 97

```text
   90:       signalType,
   91:       signalValue: optionalFiniteNumber(body.signalValue, "signalValue"),
   92:       metadata: isRecord(body.metadata) ? body.metadata : undefined,
   93:     });
   94:     return NextResponse.json(result, { status: result.signalCreated ? 201 : 200 });
   95:   } catch (error) {
   96:     const failure = toItchApiFailure(error);
>  97:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   98:   }
   99: }
  100: 
  101: export async function PATCH(request: Request) {
  102:   try {
  103:     guardItchMutationRequest(request, "feedback:patch", { limit: 90, windowMs: 60000 });
  104:     const body = await readJsonObject(request);
```

### `app\api\discovery\itch\feedback\route.ts` line 116

```text
  109:     const database = getItchDiscoveryDatabase();
  110:     bootstrapItchDiscovery(database);
  111:     const candidate = new ItchFeedbackRepository(database).updateCandidateStatus(
  112:       requiredString(body.id, "id"),
  113:       status,
  114:     );
  115:     if (!candidate) {
> 116:       return NextResponse.json(
  117:         { error: "Feedback candidate not found.", code: "GAME_RADAR_NOT_FOUND" },
  118:         { status: 404 },
  119:       );
  120:     }
  121:     return NextResponse.json({ candidate });
  122:   } catch (error) {
  123:     const failure = toItchApiFailure(error);
```

### `app\api\discovery\itch\feedback\route.ts` line 121

```text
  114:     );
  115:     if (!candidate) {
  116:       return NextResponse.json(
  117:         { error: "Feedback candidate not found.", code: "GAME_RADAR_NOT_FOUND" },
  118:         { status: 404 },
  119:       );
  120:     }
> 121:     return NextResponse.json({ candidate });
  122:   } catch (error) {
  123:     const failure = toItchApiFailure(error);
  124:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
  125:   }
  126: }
```

### `app\api\discovery\itch\feedback\route.ts` line 124

```text
  117:         { error: "Feedback candidate not found.", code: "GAME_RADAR_NOT_FOUND" },
  118:         { status: 404 },
  119:       );
  120:     }
  121:     return NextResponse.json({ candidate });
  122:   } catch (error) {
  123:     const failure = toItchApiFailure(error);
> 124:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
  125:   }
  126: }
```

### `app\api\discovery\itch\filters\route.ts` line 26

```text
   19: export const runtime = "nodejs";
   20: export const dynamic = "force-dynamic";
   21: 
   22: export async function GET() {
   23:   try {
   24:     const database = getItchDiscoveryDatabase();
   25:     bootstrapItchDiscovery(database);
>  26:     return NextResponse.json({ presets: new ItchFilterPresetRepository(database).listAll() });
   27:   } catch (error) {
   28:     const failure = toItchApiFailure(error);
   29:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   30:   }
   31: }
   32: 
   33: export async function POST(request: Request) {
```

### `app\api\discovery\itch\filters\route.ts` line 29

```text
   22: export async function GET() {
   23:   try {
   24:     const database = getItchDiscoveryDatabase();
   25:     bootstrapItchDiscovery(database);
   26:     return NextResponse.json({ presets: new ItchFilterPresetRepository(database).listAll() });
   27:   } catch (error) {
   28:     const failure = toItchApiFailure(error);
>  29:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   30:   }
   31: }
   32: 
   33: export async function POST(request: Request) {
   34:   try {
   35:     guardItchMutationRequest(request, "filters:post", { limit: 90, windowMs: 60000 });
   36:     const body = await readJsonObject(request);
```

### `app\api\discovery\itch\filters\route.ts` line 57

```text
   50:         name: requiredString(presetBody.name, "preset.name", { maximumLength: 100 }),
   51:         description: optionalString(presetBody.description, "preset.description", { maximumLength: 500 }),
   52:         isDefault: optionalBoolean(presetBody.isDefault, "preset.isDefault") ?? existing?.isDefault ?? false,
   53:         isSystem: existing?.isSystem ?? false,
   54:         rules,
   55:         sort,
   56:       });
>  57:       return NextResponse.json({ preset }, { status: existing ? 200 : 201 });
   58:     }
   59: 
   60:     if (action === "duplicate") {
   61:       const preset = presets.duplicate(
   62:         requiredString(body.id, "id"),
   63:         requiredString(body.newName, "newName", { maximumLength: 100 }),
   64:       );
```

### `app\api\discovery\itch\filters\route.ts` line 65

```text
   58:     }
   59: 
   60:     if (action === "duplicate") {
   61:       const preset = presets.duplicate(
   62:         requiredString(body.id, "id"),
   63:         requiredString(body.newName, "newName", { maximumLength: 100 }),
   64:       );
>  65:       return NextResponse.json({ preset }, { status: 201 });
   66:     }
   67: 
   68:     if (action === "set-default") {
   69:       return NextResponse.json({ preset: presets.setDefault(requiredString(body.id, "id")) });
   70:     }
   71: 
   72:     if (action === "delete") {
```

### `app\api\discovery\itch\filters\route.ts` line 69

```text
   62:         requiredString(body.id, "id"),
   63:         requiredString(body.newName, "newName", { maximumLength: 100 }),
   64:       );
   65:       return NextResponse.json({ preset }, { status: 201 });
   66:     }
   67: 
   68:     if (action === "set-default") {
>  69:       return NextResponse.json({ preset: presets.setDefault(requiredString(body.id, "id")) });
   70:     }
   71: 
   72:     if (action === "delete") {
   73:       const deleted = presets.deleteById(requiredString(body.id, "id"));
   74:       if (!deleted) return NextResponse.json({ error: "Filter preset not found.", code: "GAME_RADAR_NOT_FOUND" }, { status: 404 });
   75:       return NextResponse.json({ deleted: true });
   76:     }
```

### `app\api\discovery\itch\filters\route.ts` line 74

```text
   67: 
   68:     if (action === "set-default") {
   69:       return NextResponse.json({ preset: presets.setDefault(requiredString(body.id, "id")) });
   70:     }
   71: 
   72:     if (action === "delete") {
   73:       const deleted = presets.deleteById(requiredString(body.id, "id"));
>  74:       if (!deleted) return NextResponse.json({ error: "Filter preset not found.", code: "GAME_RADAR_NOT_FOUND" }, { status: 404 });
   75:       return NextResponse.json({ deleted: true });
   76:     }
   77: 
   78:     throw new TypeError(`Unsupported filter action: ${action}`);
   79:   } catch (error) {
   80:     const failure = toItchApiFailure(error);
   81:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
```

### `app\api\discovery\itch\filters\route.ts` line 75

```text
   68:     if (action === "set-default") {
   69:       return NextResponse.json({ preset: presets.setDefault(requiredString(body.id, "id")) });
   70:     }
   71: 
   72:     if (action === "delete") {
   73:       const deleted = presets.deleteById(requiredString(body.id, "id"));
   74:       if (!deleted) return NextResponse.json({ error: "Filter preset not found.", code: "GAME_RADAR_NOT_FOUND" }, { status: 404 });
>  75:       return NextResponse.json({ deleted: true });
   76:     }
   77: 
   78:     throw new TypeError(`Unsupported filter action: ${action}`);
   79:   } catch (error) {
   80:     const failure = toItchApiFailure(error);
   81:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   82:   }
```

### `app\api\discovery\itch\filters\route.ts` line 81

```text
   74:       if (!deleted) return NextResponse.json({ error: "Filter preset not found.", code: "GAME_RADAR_NOT_FOUND" }, { status: 404 });
   75:       return NextResponse.json({ deleted: true });
   76:     }
   77: 
   78:     throw new TypeError(`Unsupported filter action: ${action}`);
   79:   } catch (error) {
   80:     const failure = toItchApiFailure(error);
>  81:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   82:   }
   83: }
   84: 
   85: function requireObjectArray(value: unknown, field: string): Record<string, unknown>[] {
   86:   if (!Array.isArray(value) || value.some((item) => !isRecord(item))) {
   87:     throw new TypeError(`${field} must be an array of objects.`);
   88:   }
```

### `app\api\discovery\itch\maintenance\route.ts` line 23

```text
   16: } from "@/lib/modules/itch-discovery/maintenance";
   17: 
   18: export const runtime = "nodejs";
   19: export const dynamic = "force-dynamic";
   20: 
   21: export async function GET() {
   22:   try {
>  23:     return NextResponse.json({
   24:       diagnostics: runItchDiagnostics(),
   25:       backups: listItchDatabaseBackups(),
   26:     });
   27:   } catch (error) {
   28:     const failure = toItchApiFailure(error);
   29:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   30:   }
```

### `app\api\discovery\itch\maintenance\route.ts` line 29

```text
   22:   try {
   23:     return NextResponse.json({
   24:       diagnostics: runItchDiagnostics(),
   25:       backups: listItchDatabaseBackups(),
   26:     });
   27:   } catch (error) {
   28:     const failure = toItchApiFailure(error);
>  29:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   30:   }
   31: }
   32: 
   33: export async function POST(request: Request) {
   34:   try {
   35:     guardItchMutationRequest(request, "maintenance:post", {
   36:       limit: 12,
```

### `app\api\discovery\itch\maintenance\route.ts` line 43

```text
   36:       limit: 12,
   37:       windowMs: 10 * 60_000,
   38:     });
   39:     const body = await readJsonObject(request);
   40:     const action = optionalString(body.action, "action") ?? "diagnose";
   41: 
   42:     if (action === "diagnose") {
>  43:       return NextResponse.json({ diagnostics: runItchDiagnostics() });
   44:     }
   45:     if (action === "backup") {
   46:       const result = await createItchDatabaseBackup({
   47:         retentionCount: optionalInteger(body.retentionCount, "retentionCount", {
   48:           minimum: 1,
   49:           maximum: 365,
   50:         }),
```

### `app\api\discovery\itch\maintenance\route.ts` line 52

```text
   45:     if (action === "backup") {
   46:       const result = await createItchDatabaseBackup({
   47:         retentionCount: optionalInteger(body.retentionCount, "retentionCount", {
   48:           minimum: 1,
   49:           maximum: 365,
   50:         }),
   51:       });
>  52:       return NextResponse.json(result, { status: 201 });
   53:     }
   54:     if (action === "recover") {
   55:       return NextResponse.json({ recovery: recoverItchRuntimeState() });
   56:     }
   57: 
   58:     throw new TypeError(`Unsupported maintenance action: ${action}`);
   59:   } catch (error) {
```

### `app\api\discovery\itch\maintenance\route.ts` line 55

```text
   48:           minimum: 1,
   49:           maximum: 365,
   50:         }),
   51:       });
   52:       return NextResponse.json(result, { status: 201 });
   53:     }
   54:     if (action === "recover") {
>  55:       return NextResponse.json({ recovery: recoverItchRuntimeState() });
   56:     }
   57: 
   58:     throw new TypeError(`Unsupported maintenance action: ${action}`);
   59:   } catch (error) {
   60:     const failure = toItchApiFailure(error);
   61:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   62:   }
```

### `app\api\discovery\itch\maintenance\route.ts` line 61

```text
   54:     if (action === "recover") {
   55:       return NextResponse.json({ recovery: recoverItchRuntimeState() });
   56:     }
   57: 
   58:     throw new TypeError(`Unsupported maintenance action: ${action}`);
   59:   } catch (error) {
   60:     const failure = toItchApiFailure(error);
>  61:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   62:   }
   63: }
```

### `app\api\discovery\itch\notifications\route.ts` line 49

```text
   42:     bootstrapItchDiscovery(database);
   43:     const notifications = new ItchNotificationRepository(database);
   44:     const adult = new ItchAdultSettingsRepository(database).ensureDefault();
   45:     const listed = notifications.list(rawState as ItchNotificationState | undefined, limit);
   46:     const safeNotifications = adult.discreetNotifications
   47:       ? listed.map((item) => ({ ...item, title: "Game update available", body: "A watched adult game has new activity." }))
   48:       : listed;
>  49:     return NextResponse.json({
   50:       notifications: safeNotifications,
   51:       unreadCount: notifications.countUnread(),
   52:       digests: new ItchNotificationDigestRepository(database).list(30),
   53:     });
   54:   } catch (error) {
   55:     const failure = toItchApiFailure(error);
   56:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
```

### `app\api\discovery\itch\notifications\route.ts` line 56

```text
   49:     return NextResponse.json({
   50:       notifications: safeNotifications,
   51:       unreadCount: notifications.countUnread(),
   52:       digests: new ItchNotificationDigestRepository(database).list(30),
   53:     });
   54:   } catch (error) {
   55:     const failure = toItchApiFailure(error);
>  56:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   57:   }
   58: }
   59: 
   60: export async function PATCH(request: Request) {
   61:   try {
   62:     guardItchMutationRequest(request, "notifications:patch", { limit: 90, windowMs: 60000 });
   63:     const body = await readJsonObject(request);
```

### `app\api\discovery\itch\notifications\route.ts` line 77

```text
   70:       ? notifications.markRead(id)
   71:       : action === "opened"
   72:         ? notifications.markOpened(id)
   73:         : action === "dismiss"
   74:           ? notifications.dismiss(id)
   75:           : (() => { throw new TypeError(`Unsupported notification action: ${action}`); })();
   76:     if (!notification) {
>  77:       return NextResponse.json({ error: "Notification not found.", code: "GAME_RADAR_NOT_FOUND" }, { status: 404 });
   78:     }
   79:     return NextResponse.json({ notification });
   80:   } catch (error) {
   81:     const failure = toItchApiFailure(error);
   82:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   83:   }
   84: }
```

### `app\api\discovery\itch\notifications\route.ts` line 79

```text
   72:         ? notifications.markOpened(id)
   73:         : action === "dismiss"
   74:           ? notifications.dismiss(id)
   75:           : (() => { throw new TypeError(`Unsupported notification action: ${action}`); })();
   76:     if (!notification) {
   77:       return NextResponse.json({ error: "Notification not found.", code: "GAME_RADAR_NOT_FOUND" }, { status: 404 });
   78:     }
>  79:     return NextResponse.json({ notification });
   80:   } catch (error) {
   81:     const failure = toItchApiFailure(error);
   82:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   83:   }
   84: }
   85: 
   86: export async function POST(request: Request) {
```

### `app\api\discovery\itch\notifications\route.ts` line 82

```text
   75:           : (() => { throw new TypeError(`Unsupported notification action: ${action}`); })();
   76:     if (!notification) {
   77:       return NextResponse.json({ error: "Notification not found.", code: "GAME_RADAR_NOT_FOUND" }, { status: 404 });
   78:     }
   79:     return NextResponse.json({ notification });
   80:   } catch (error) {
   81:     const failure = toItchApiFailure(error);
>  82:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   83:   }
   84: }
   85: 
   86: export async function POST(request: Request) {
   87:   try {
   88:     guardItchMutationRequest(request, "notifications:post", { limit: 90, windowMs: 60000 });
   89:     const body = await readJsonObject(request);
```

### `app\api\discovery\itch\notifications\route.ts` line 94

```text
   87:   try {
   88:     guardItchMutationRequest(request, "notifications:post", { limit: 90, windowMs: 60000 });
   89:     const body = await readJsonObject(request);
   90:     const result = buildItchNotificationDigest({
   91:       digestDate: optionalString(body.digestDate, "digestDate", { maximumLength: 10 }),
   92:       timezone: optionalString(body.timezone, "timezone", { maximumLength: 100 }),
   93:     });
>  94:     return NextResponse.json(result);
   95:   } catch (error) {
   96:     const failure = toItchApiFailure(error);
   97:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   98:   }
   99: }
```

### `app\api\discovery\itch\notifications\route.ts` line 97

```text
   90:     const result = buildItchNotificationDigest({
   91:       digestDate: optionalString(body.digestDate, "digestDate", { maximumLength: 10 }),
   92:       timezone: optionalString(body.timezone, "timezone", { maximumLength: 100 }),
   93:     });
   94:     return NextResponse.json(result);
   95:   } catch (error) {
   96:     const failure = toItchApiFailure(error);
>  97:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   98:   }
   99: }
```

### `app\api\discovery\itch\recommendations\route.ts` line 39

```text
   32:     const result = recordItchRecommendationAction({
   33:       recommendationId: requiredString(body.recommendationId, "recommendationId"),
   34:       state,
   35:       signalType,
   36:       signalValue: optionalFiniteNumber(body.signalValue, "signalValue"),
   37:       metadata: isRecord(body.metadata) ? body.metadata : undefined,
   38:     });
>  39:     return NextResponse.json(result);
   40:   } catch (error) {
   41:     const failure = toItchApiFailure(error);
   42:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   43:   }
   44: }
   45: 
   46: export async function POST(request: Request) {
```

### `app\api\discovery\itch\recommendations\route.ts` line 42

```text
   35:       signalType,
   36:       signalValue: optionalFiniteNumber(body.signalValue, "signalValue"),
   37:       metadata: isRecord(body.metadata) ? body.metadata : undefined,
   38:     });
   39:     return NextResponse.json(result);
   40:   } catch (error) {
   41:     const failure = toItchApiFailure(error);
>  42:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   43:   }
   44: }
   45: 
   46: export async function POST(request: Request) {
   47:   try {
   48:     guardItchMutationRequest(request, "recommendations:post", { limit: 90, windowMs: 60000 });
   49:     const body = await readJsonObject(request);
```

### `app\api\discovery\itch\recommendations\route.ts` line 60

```text
   53:       gameId: requiredString(body.gameId, "gameId"),
   54:       profileId: optionalString(body.profileId, "profileId"),
   55:       state,
   56:       signalType,
   57:       signalValue: optionalFiniteNumber(body.signalValue, "signalValue"),
   58:       metadata: isRecord(body.metadata) ? body.metadata : undefined,
   59:     });
>  60:     return NextResponse.json(result, { status: 201 });
   61:   } catch (error) {
   62:     const failure = toItchApiFailure(error);
   63:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   64:   }
   65: }
   66: 
   67: function readAction(body: Record<string, unknown>): {
```


## Node processes

```text
PID: 13944
Parent PID: 14276
Created: 08/26/2026 14:57:01
Command: "C:\Program Files\Adobe\Adobe Creative Cloud Experience\libs\node.exe" "C:\Program Files\Adobe\Adobe Creative Cloud Experience\js\main.js"

PID: 25404
Parent PID: 20392
Created: 08/30/2026 13:39:12
Command: "C:\Program Files\nodejs\node.exe" "C:\Program Files\nodejs/node_modules/npm/bin/npm-cli.js" run dev

PID: 17316
Parent PID: 11196
Created: 08/30/2026 13:39:12
Command: "node"   "C:\Users\adamt\Documents\chernobog-ai\node_modules\.bin\\..\next\dist\bin\next" dev

PID: 21216
Parent PID: 17316
Created: 08/30/2026 13:39:13
Command: "C:\Program Files\nodejs\node.exe" C:\Users\adamt\Documents\chernobog-ai\node_modules\next\dist\server\lib\start-server.js

PID: 20440
Parent PID: 21216
Created: 08/30/2026 13:39:14
Command: "node" C:\Users\adamt\Documents\chernobog-ai\.next\dev\build\postcss.js 59761

```

## Listening TCP endpoints owned by node

```text
:::3000 PID=21216
127.0.0.1:59761 PID=21216
```

## Package scripts

```json
{
    "dev":  "next dev",
    "build":  "next build",
    "start":  "next start",
    "lint":  "eslint",
    "typecheck":  "tsc --noEmit"
}
```

## Source/build timestamps

- `lib\chernobog\project\activeProjectContext.ts` -> 2026-08-30T13:38:11.2767827+01:00
- `lib\chernobog\pipeline\runCommand.ts` -> 2026-08-30T13:38:11.2807873+01:00
- `lib\chernobog\router.ts` -> 2026-08-30T11:31:06.2706432+01:00
- `.next\BUILD_ID` -> 2026-08-30T00:02:39.4444179+01:00
- `.next\build-manifest.json` -> 2026-08-30T00:02:20.1548230+01:00
- `.next\server\middleware-manifest.json` -> 2026-08-30T00:02:20.1517681+01:00
- `.next\server\app-paths-manifest.json` -> 2026-08-30T00:02:20.1467642+01:00

## Next build identity

```text
tPQbdnzkE6QLZ1S09Rcn-
```

## Interpretation

- If the UI fetch endpoint does not call `runCommandPipeline`: patch that alternate entry path.
- If it does call `runCommandPipeline` and the serving Node process predates the source patch while running `next start`: rebuild/restart the runtime.
- If it is `next dev` and the correct endpoint calls `runCommandPipeline`: inspect the exact API request/session identifier and server logs next.
- Do not change memory, routing, or project grounding unless this trace disproves the successful runtime probe.
